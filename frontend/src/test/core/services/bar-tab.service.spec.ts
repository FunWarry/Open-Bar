import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BarTabService } from '../../../app/core/services/bar-tab.service';
import {
  BarTab,
  BarTabCreateRequest,
  BarTabUpdateRequest,
  BarTabTransferRequest,
  BarTabDetail,
} from '../../../app/core/models/bar-tab.model';
import { EncaissementRequest, TableAdditionResponse } from '../../../app/features/dashboard-serveur/services/dashboard-serveur.service';
import { Facture } from '../../../app/features/factures/models/facture.model';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { environment } from '../../../environments/environment';
import { of, Subject } from 'rxjs';
import { IMessage } from '@stomp/stompjs';

describe('BarTabService', () => {
  let service: BarTabService;
  let httpMock: HttpTestingController;
  let wsMessageSubject: Subject<IMessage>;

  const baseUrl = `${environment.apiUrl}/bar-tabs`;

  const mockTab: BarTab = {
    id: 1,
    nom: 'VIP Dupont',
    clientReference: 'CB-8821',
    cautionMontant: 50,
    statut: 'ACTIVE',
    openedAt: '2026-09-18T20:00:00',
    total: 25.50,
    activeOrdersCount: 2,
    itemsCount: 3,
  };

  const mockWsService = {
    watch: jasmine.createSpy('watch').and.callFake(() => wsMessageSubject.asObservable()),
  };

  beforeEach(() => {
    wsMessageSubject = new Subject<IMessage>();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        BarTabService,
        { provide: WebSocketService, useValue: mockWsService },
      ],
    });

    service = TestBed.inject(BarTabService);
    httpMock = TestBed.inject(HttpTestingController);

    // Handle the initial loadTabs() call in constructor
    const req = httpMock.expectOne(baseUrl);
    req.flush([]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize with empty tabs and zero active total', () => {
    expect(service.tabs()).toEqual([]);
    expect(service.activeTabs()).toEqual([]);
    expect(service.activeCount()).toBe(0);
    expect(service.activeTotalAmount()).toBe(0);
  });

  it('should load tabs and update signals', () => {
    service.loadTabs().subscribe((tabs) => {
      expect(tabs).toEqual([mockTab]);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockTab]);

    expect(service.tabs()).toEqual([mockTab]);
    expect(service.activeTabs()).toEqual([mockTab]);
    expect(service.activeCount()).toBe(1);
    expect(service.activeTotalAmount()).toBe(25.50);
  });

  it('should create a new tab and prepend to signal', () => {
    const createReq: BarTabCreateRequest = {
      nom: 'VIP Dupont',
      clientReference: 'CB-8821',
      cautionMontant: 50,
    };

    service.createTab(createReq).subscribe((tab) => {
      expect(tab).toEqual(mockTab);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    req.flush(mockTab);

    expect(service.tabs()).toContain(mockTab);
  });

  it('should update tab metadata and reflect changes in signal', () => {
    // Populate service with existing tab
    service['tabs'].set([mockTab]);

    const updateReq: BarTabUpdateRequest = {
      nom: 'VIP Dupont Updated',
    };
    const updatedTab = { ...mockTab, nom: 'VIP Dupont Updated' };

    service.updateTab(1, updateReq).subscribe((tab) => {
      expect(tab.nom).toBe('VIP Dupont Updated');
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updatedTab);

    expect(service.tabs()[0].nom).toBe('VIP Dupont Updated');
  });

  it('should cancel tab and update status', () => {
    service['tabs'].set([mockTab]);
    const cancelledTab: BarTab = { ...mockTab, statut: 'CANCELLED' };

    service.cancelTab(1, 'Customer left').subscribe((tab) => {
      expect(tab.statut).toBe('CANCELLED');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/cancel?reason=Customer%20left`);
    expect(req.request.method).toBe('POST');
    req.flush(cancelledTab);

    expect(service.tabs()[0].statut).toBe('CANCELLED');
    expect(service.activeTabs()).toHaveSize(0);
  });

  it('should transfer tab to table', () => {
    service['tabs'].set([mockTab]);
    const transferredTab: BarTab = { ...mockTab, statut: 'TRANSFERRED' };
    const transferReq: BarTabTransferRequest = { targetTableId: 5 };

    service.transferTabToTable(1, transferReq).subscribe((tab) => {
      expect(tab.statut).toBe('TRANSFERRED');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/transfer-to-table`);
    expect(req.request.method).toBe('POST');
    req.flush(transferredTab);

    expect(service.tabs()[0].statut).toBe('TRANSFERRED');
  });

  it('should handle WebSocket updates dynamically', () => {
    service['tabs'].set([mockTab]);

    const updatedTab: BarTab = { ...mockTab, total: 42.00 };
    const message: IMessage = {
      body: JSON.stringify(updatedTab),
      ack: () => {},
      nack: () => {},
      headers: {},
      command: 'MESSAGE',
      isBinaryBody: false,
      binaryBody: new Uint8Array(),
    };

    wsMessageSubject.next(message);

    expect(service.tabs()[0].total).toBe(42.00);
    expect(service.activeTotalAmount()).toBe(42.00);
  });

  it('should retrieve tab detail by id', () => {
    const mockDetail: BarTabDetail = {
      tab: mockTab,
      commandes: [],
      items: [],
      totalHT: 21.25,
      totalVAT: 4.25,
      totalTTC: 25.50,
      elapsedMinutes: 30,
    };

    service.getTabDetail(1).subscribe((detail) => {
      expect(detail).toEqual(mockDetail);
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDetail);
  });

  it('should add order to tab and reload tabs', () => {
    service.addOrderToTab(1, { items: [] }).subscribe();

    const addReq = httpMock.expectOne(`${baseUrl}/1/orders`);
    expect(addReq.request.method).toBe('POST');
    addReq.flush({ id: 99 });

    // Expect the triggered reloadTabs()
    const reloadReq = httpMock.expectOne(baseUrl);
    expect(reloadReq.request.method).toBe('GET');
    reloadReq.flush([mockTab]);
  });

  it('should transfer orders from table to tab', () => {
    service['tabs'].set([mockTab]);
    const updatedTab = { ...mockTab, total: 55.0 };

    service.transferOrdersFromTable(1, { targetTableId: 3 }).subscribe((res) => {
      expect(res.total).toBe(55.0);
    });

    const req = httpMock.expectOne(`${baseUrl}/1/transfer-from-table`);
    expect(req.request.method).toBe('POST');
    req.flush(updatedTab);

    expect(service.tabs()[0].total).toBe(55.0);
  });

  it('should transfer single order and update tab in signal', () => {
    service['tabs'].set([mockTab]);
    const updatedTab = { ...mockTab, total: 10.0 };

    service.transferSingleOrder(1, { commandeIds: [100], targetTableId: 2 }).subscribe((res) => {
      expect(res.total).toBe(10.0);
    });

    const req = httpMock.expectOne(`${baseUrl}/1/transfer-order`);
    expect(req.request.method).toBe('POST');
    req.flush(updatedTab);

    expect(service.tabs()[0].total).toBe(10.0);
  });

  it('should cancel tab without reason', () => {
    service['tabs'].set([mockTab]);
    const cancelledTab: BarTab = { ...mockTab, statut: 'CANCELLED' };

    service.cancelTab(1).subscribe((tab) => {
      expect(tab.statut).toBe('CANCELLED');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/cancel`);
    expect(req.request.method).toBe('POST');
    req.flush(cancelledTab);

    expect(service.tabs()[0].statut).toBe('CANCELLED');
  });

  it('should retrieve tab addition breakdown', () => {
    const mockAddition: TableAdditionResponse = {
      tableId: 0,
      tableNumero: 0,
      zone: 'Ardoise',
      totalHT: 21.25,
      totalVAT: 4.25,
      totalTTC: 25.50,
      nombreArticles: 0,
      hasUnpaidFacture: false,
      commandeIds: [1],
      items: [],
    };

    service.getTabAddition(1).subscribe((addition) => {
      expect(addition).toEqual(mockAddition);
    });

    const req = httpMock.expectOne(`${baseUrl}/1/addition`);
    expect(req.request.method).toBe('GET');
    req.flush(mockAddition);
  });

  it('should settle and invoice tab and mark it SETTLED in signal', () => {
    service['tabs'].set([mockTab]);

    const encaissementReq: EncaissementRequest = {
      modePaiement: 'CARTE',
      montantRecu: 25.50,
      commandeIds: [1],
    };

    const mockFacture: Facture = {
      id: 50,
      tableId: 0,
      tableNumero: 0,
      numero: 'FAC-001',
      total: 25.50,
      totalHT: 21.25,
      totalVAT: 4.25,
      totalTTC: 25.50,
      dateFacture: '2026-09-18T22:00:00',
      reglee: true,
      modePaiement: 'CARTE',
      items: [],
      createdAt: '2026-09-18T22:00:00',
      updatedAt: '2026-09-18T22:00:00',
    };

    service.encaisserTab(1, encaissementReq).subscribe((facture) => {
      expect(facture).toEqual(mockFacture);
    });

    const req = httpMock.expectOne(`${baseUrl}/1/encaisser`);
    expect(req.request.method).toBe('POST');
    req.flush(mockFacture);

    expect(service.tabs()[0].statut).toBe('SETTLED');
  });

  it('should handle loadTabs error gracefully and reset loading state', () => {
    service.loadTabs().subscribe((tabs) => {
      expect(tabs).toEqual([]);
    });

    const req = httpMock.expectOne(baseUrl);
    req.error(new ProgressEvent('Network error'));

    expect(service.isLoading()).toBeFalse();
  });
});
