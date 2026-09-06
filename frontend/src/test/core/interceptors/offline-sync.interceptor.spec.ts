import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { offlineSyncInterceptor } from '../../../app/core/interceptors/offline-sync.interceptor';
import { OfflineOrderService } from '../../../app/core/services/offline-order.service';
import { Commande, CreateCommandeRequest, OfflineQueuedOrder } from '../../../app/core/models/commande.model';

describe('offlineSyncInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let translocoSpy: jasmine.SpyObj<TranslocoService>;
  let offlineServiceSpy: jasmine.SpyObj<OfflineOrderService>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present', 'dismiss']);
    toastSpy.present.and.returnValue(Promise.resolve());

    toastCtrlSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create', 'getTop']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    translocoSpy = jasmine.createSpyObj<TranslocoService>('TranslocoService', ['translate']);
    translocoSpy.translate.and.callFake(((key: any) => key) as any);

    offlineServiceSpy = jasmine.createSpyObj<OfflineOrderService>('OfflineOrderService', ['queueOrder']);
    offlineServiceSpy.queueOrder.and.callFake((order) => {
      const queued: OfflineQueuedOrder = {
        ...order,
        clientRequestId: order.clientRequestId || 'mock-client-req-id',
        createdAt: new Date().toISOString(),
        status: 'PENDING',
        retryCount: 0,
      };
      return Promise.resolve(queued);
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([offlineSyncInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: TranslocoService, useValue: translocoSpy },
        { provide: OfflineOrderService, useValue: offlineServiceSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should pass through non-order endpoints unchanged', (done) => {
    http.get<{ ok: boolean }>('/api/cocktails').subscribe((res) => {
      expect(res.ok).toBeTrue();
      expect(offlineServiceSpy.queueOrder).not.toHaveBeenCalled();
      done();
    });

    const req = httpMock.expectOne('/api/cocktails');
    expect(req.request.method).toBe('GET');
    req.flush({ ok: true });
  });

  it('should attach clientRequestId to online order creations', (done) => {
    const payload: CreateCommandeRequest = {
      tableId: 5,
      notes: 'Terrasse',
      items: [{ cocktailId: 1, quantite: 2 }],
    };

    http.post<Commande>('/api/commandes', payload).subscribe((res) => {
      expect(res.id).toBe(123);
      expect(offlineServiceSpy.queueOrder).not.toHaveBeenCalled();
      done();
    });

    const req = httpMock.expectOne('/api/commandes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.clientRequestId).toBeDefined();
    req.flush({ id: 123, tableId: 5, statut: 'EN_ATTENTE', items: [] });
  });

  it('should intercept status 0 network drops, queue the order, and return synthetic 202', (done) => {
    const payload: CreateCommandeRequest = {
      tableId: 8,
      notes: 'Low wifi zone',
      items: [{ cocktailId: 10, quantite: 1, prixUnitaire: 9 }],
    };

    http.post<Commande>('/api/commandes', payload).subscribe((res) => {
      expect(res).toBeDefined();
      expect(res.tableId).toBe(8);
      expect(res.statut).toBe('EN_ATTENTE');
      expect(offlineServiceSpy.queueOrder).toHaveBeenCalled();
      expect(toastCtrlSpy.create).toHaveBeenCalled();
      done();
    });

    const req = httpMock.expectOne('/api/commandes');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
  });
});
