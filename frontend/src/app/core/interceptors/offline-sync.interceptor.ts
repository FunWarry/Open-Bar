import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, from, Observable, of, switchMap, throwError } from 'rxjs';
import { Commande, CreateCommandeRequest, OfflineQueuedOrderItem } from '../models/commande.model';
import { OfflineOrderService } from '../services/offline-order.service';

/**
 * Functional HTTP interceptor managing offline order queueing for waitstaff.
 * <p>
 * Intercepts POST /api/commandes requests when offline or when network drops (HTTP 0).
 * Queues the payload into IndexedDB and returns a synthetic HTTP 202 Accepted response.
 *
 * @param req HTTP request to intercept
 * @param next Interception chain handler
 * @returns Observable emitting the HTTP event
 */
export const offlineSyncInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const isOrderCreation = req.method === 'POST' && isBaseCommandesUrl(req.url);
  if (!isOrderCreation) {
    return next(req);
  }

  const offlineService = inject(OfflineOrderService);
  const toastCtrl = inject(ToastController);
  const transloco = inject(TranslocoService);

  const rawBody = req.body as CreateCommandeRequest | null;
  const clientRequestId = rawBody?.clientRequestId || crypto.randomUUID();

  // If the browser is currently offline, queue immediately without attempting network dispatch
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return handleOfflineQueue(rawBody, clientRequestId, offlineService, toastCtrl, transloco, 'OFFLINE.ORDER_QUEUED_TOAST');
  }

  // If online, attach clientRequestId for idempotency and handle connection drops (status 0)
  const modifiedReq = req.clone({
    body: {
      ...rawBody,
      clientRequestId,
    },
  });

  return next(modifiedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 0) {
        return handleOfflineQueue(
          rawBody,
          clientRequestId,
          offlineService,
          toastCtrl,
          transloco,
          'OFFLINE.ORDER_QUEUED_ON_ERROR',
        );
      }
      return throwError(() => error);
    }),
  );
};

/**
 * Checks if a given URL targets the base /api/commandes creation endpoint.
 *
 * @param url Target URL
 * @returns True if the URL is the base orders endpoint
 */
function isBaseCommandesUrl(url: string): boolean {
  const cleanUrl = url.split('?')[0];
  return cleanUrl.endsWith('/api/commandes') || cleanUrl.endsWith('/api/commandes/');
}

/**
 * Queues the order in IndexedDB and returns a synthetic HttpResponse<Commande>.
 */
function handleOfflineQueue(
  body: CreateCommandeRequest | null,
  clientRequestId: string,
  offlineService: OfflineOrderService,
  toastCtrl: ToastController,
  transloco: TranslocoService,
  toastMessageKey: string,
): Observable<HttpEvent<unknown>> {
  const items: OfflineQueuedOrderItem[] = (body?.items || []).map(it => ({
    cocktailId: it.cocktailId,
    quantite: it.quantite,
    prixUnitaire: it.prixUnitaire ?? 0,
    varianteId: it.varianteId,
    notes: it.notes,
    prioritaire: it.prioritaire,
  }));

  const queuePromise = offlineService.queueOrder({
    clientRequestId,
    tableId: body?.tableId ?? 0,
    notes: body?.notes,
    items,
  });

  const toastPromise = toastCtrl.create({
    message: transloco.translate(toastMessageKey),
    duration: 3500,
    color: 'warning',
    position: 'bottom',
  }).then(t => t.present());

  return from(Promise.all([queuePromise, toastPromise])).pipe(
    switchMap(([queued]) => {
      const syntheticCommande: Commande = {
        id: -Date.now(),
        tableId: queued.tableId,
        tableNumero: queued.tableNumero ?? queued.tableId,
        serveurId: 0,
        serveurUsername: '',
        statut: 'EN_ATTENTE',
        notes: queued.notes,
        total: 0,
        dateCommande: queued.createdAt,
        createdAt: queued.createdAt,
        updatedAt: queued.createdAt,
        clientRequestId: queued.clientRequestId,
        items: [],
      };

      return of(new HttpResponse({
        status: 202,
        statusText: 'Accepted (Queued Offline)',
        body: syntheticCommande,
      }));
    }),
  );
}
