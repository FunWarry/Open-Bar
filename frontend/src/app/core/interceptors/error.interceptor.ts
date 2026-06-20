import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { TranslocoService } from '@ngneat/transloco';
import { catchError, from, switchMap, throwError } from 'rxjs';

const FALLBACK_MESSAGES: Record<string, string> = {
  'ERRORS.NETWORK': 'Erreur réseau — vérifiez votre connexion.',
  'ERRORS.UNAUTHORIZED': 'Accès refusé.',
  'ERRORS.FORBIDDEN': 'Accès interdit.',
  'ERRORS.NOT_FOUND': 'Ressource introuvable.',
  'ERRORS.SERVER': 'Erreur serveur inattendue.',
};

const DEV = isDevMode();

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastCtrl = inject(ToastController);
  const transloco = inject(TranslocoService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      if (error.status === 401) return throwError(() => error);

      const key = getErrorKey(error.status);
      const translated = transloco.translate(key);
      const message = translated !== key ? translated : (FALLBACK_MESSAGES[key] ?? 'Une erreur est survenue.');

      if (DEV) console.error('[HTTP Error]', error.status, error.url, error);

      const show$ = from(
        toastCtrl.getTop()
          .then(existing => existing?.dismiss())
          .then(() => toastCtrl.create({
            message,
            duration: 3500,
            color: 'danger',
            position: 'bottom',
            buttons: [{ text: '✕', role: 'cancel' }],
          }))
          .then(toast => toast.present())
      );

      return show$.pipe(switchMap(() => throwError(() => error)));
    })
  );
};

function getErrorKey(status: number): string {
  if (status === 0)   return 'ERRORS.NETWORK';
  if (status === 403) return 'ERRORS.FORBIDDEN';
  if (status === 404) return 'ERRORS.NOT_FOUND';
  return 'ERRORS.SERVER';
}
