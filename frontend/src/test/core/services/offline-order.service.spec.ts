import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { OfflineOrderService } from '../../../app/core/services/offline-order.service';
import { OfflineQueuedOrder } from '../../../app/core/models/commande.model';

describe('OfflineOrderService', () => {
  let service: OfflineOrderService;
  let httpMock: HttpTestingController;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let translocoSpy: jasmine.SpyObj<TranslocoService>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  beforeEach(async () => {
    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastSpy.present.and.returnValue(Promise.resolve());

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    translocoSpy = jasmine.createSpyObj('TranslocoService', ['translate']);
    translocoSpy.translate.and.callFake(((key: any, params?: any) => {
      if (params && params['count'] !== undefined) {
        return `${key} (${params['count']})`;
      }
      return key;
    }) as any);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        OfflineOrderService,
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: TranslocoService, useValue: translocoSpy },
      ],
    });

    service = TestBed.inject(OfflineOrderService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear test database
    await service.clearAll();
  });

  afterEach(async () => {
    httpMock.verify();
    await service.clearAll();
  });

  it('should be created and have initial online state and empty queue', () => {
    expect(service).toBeTruthy();
    expect(service.isOnline()).toBeTrue();
    expect(service.pendingOrders()).toEqual([]);
    expect(service.pendingCount()).toBe(0);
    expect(service.isSyncing()).toBeFalse();
  });

  it('should queue an order into IndexedDB and update pendingCount signal', async () => {
    const queued = await service.queueOrder({
      clientRequestId: 'test-client-req-1',
      tableId: 5,
      tableNumero: 12,
      notes: 'Terrasse table 12',
      items: [
        {
          cocktailId: 101,
          cocktailNom: 'Mojito',
          quantite: 2,
          prixUnitaire: 8.5,
          prioritaire: false,
        },
      ],
    });

    expect(queued.clientRequestId).toBe('test-client-req-1');
    expect(queued.status).toBe('PENDING');
    expect(queued.retryCount).toBe(0);
    expect(queued.createdAt).toBeDefined();

    expect(service.pendingCount()).toBe(1);
    expect(service.pendingOrders()).toHaveSize(1);
    expect(service.pendingOrders()[0].tableId).toBe(5);
  });

  it('should remove a single order by clientRequestId', async () => {
    await service.queueOrder({
      clientRequestId: 'order-to-remove',
      tableId: 3,
      items: [],
    });
    expect(service.pendingCount()).toBe(1);

    await service.removeOrder('order-to-remove');
    expect(service.pendingCount()).toBe(0);
  });

  it('should clear all orders from IndexedDB', async () => {
    await service.queueOrder({ clientRequestId: 'order-1', tableId: 1, items: [] });
    await service.queueOrder({ clientRequestId: 'order-2', tableId: 2, items: [] });
    expect(service.pendingCount()).toBe(2);

    await service.clearAll();
    expect(service.pendingCount()).toBe(0);
  });

  it('should synchronize pending orders when online and trigger success toast', async () => {
    await service.queueOrder({
      clientRequestId: 'sync-req-1',
      tableId: 7,
      notes: 'No ice',
      items: [
        {
          cocktailId: 202,
          quantite: 1,
          prixUnitaire: 10,
        },
      ],
    });

    const syncPromise = service.syncPendingOrders();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const req = httpMock.expectOne('/api/commandes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.clientRequestId).toBe('sync-req-1');
    expect(req.request.body.tableId).toBe(7);

    req.flush({
      id: 55,
      tableId: 7,
      clientRequestId: 'sync-req-1',
      statut: 'EN_ATTENTE',
      items: [],
    });

    const result = await syncPromise;
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);

    expect(service.pendingCount()).toBe(0);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should mark order as FAILED when server returns HTTP 400 business conflict', async () => {
    await service.queueOrder({
      clientRequestId: 'conflict-req',
      tableId: 99,
      items: [],
    });

    const syncPromise = service.syncPendingOrders();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const req = httpMock.expectOne('/api/commandes');
    req.flush({ message: 'Table not found' }, { status: 404, statusText: 'Not Found' });

    const result = await syncPromise;
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);

    expect(service.pendingCount()).toBe(1);
    expect(service.pendingOrders()[0].status).toBe('FAILED');
    expect(service.pendingOrders()[0].lastError).toBe('HTTP 404');
  });

  it('should not sync if service is currently offline', async () => {
    service.isOnline.set(false);
    await service.queueOrder({ clientRequestId: 'offline-order', tableId: 2, items: [] });

    const result = await service.syncPendingOrders();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);

    httpMock.expectNone('/api/commandes');
  });
});
