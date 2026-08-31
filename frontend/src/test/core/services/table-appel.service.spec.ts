import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TableAppelService } from '../../../app/core/services/table-appel.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { TableAppel } from '../../../app/core/models/table-appel.model';
import { environment } from '../../../environments/environment';
import { Subject } from 'rxjs';

describe('TableAppelService', () => {
  let service: TableAppelService;
  let httpMock: HttpTestingController;
  let wsMock: jasmine.SpyObj<WebSocketService>;
  let wsSubject: Subject<any>;

  const mockAppel: TableAppel = {
    id: 10,
    tableId: 5,
    tableNumero: 12,
    tableZone: 'TERRASSE',
    type: 'ASSISTANCE',
    statut: 'EN_ATTENTE',
    commentaire: 'Besoin de serviettes',
    createdAt: '2026-08-31T19:00:00',
    updatedAt: '2026-08-31T19:00:00'
  };

  const mockAppelAddition: TableAppel = {
    id: 11,
    tableId: 5,
    tableNumero: 12,
    tableZone: 'TERRASSE',
    type: 'ADDITION',
    statut: 'EN_ATTENTE',
    createdAt: '2026-08-31T19:05:00',
    updatedAt: '2026-08-31T19:05:00'
  };

  beforeEach(() => {
    wsSubject = new Subject<any>();
    wsMock = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsMock.watch.and.returnValue(wsSubject.asObservable());

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TableAppelService,
        { provide: WebSocketService, useValue: wsMock }
      ]
    });

    service = TestBed.inject(TableAppelService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created and subscribe to WebSocket topic', () => {
    expect(service).toBeTruthy();
    expect(wsMock.watch).toHaveBeenCalledWith('/topic/serveur/appels');
  });

  it('appelerServeur() calls POST /api/public/tables/:tableId/appel with ASSISTANCE type', () => {
    service.appelerServeur(5, 'ASSISTANCE', 'Besoin de verres').subscribe(res => {
      expect(res).toEqual(mockAppel);
    });

    const req = httpMock.expectOne('/api/public/tables/5/appel');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'ASSISTANCE', commentaire: 'Besoin de verres' });
    req.flush(mockAppel);
  });

  it('appelerServeur() calls POST /api/public/tables/:tableId/appel with ADDITION type', () => {
    service.appelerServeur(5, 'ADDITION', 'Addition par carte').subscribe(res => {
      expect(res.type).toBe('ADDITION');
    });

    const req = httpMock.expectOne('/api/public/tables/5/appel');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'ADDITION', commentaire: 'Addition par carte' });
    req.flush(mockAppelAddition);
  });

  it('getAppelsActifsPourTable() calls GET /api/public/tables/:tableId/appels/actifs', () => {
    service.getAppelsActifsPourTable(5).subscribe(res => {
      expect(res).toHaveSize(2);
    });

    const req = httpMock.expectOne('/api/public/tables/5/appels/actifs');
    expect(req.request.method).toBe('GET');
    req.flush([mockAppel, mockAppelAddition]);
  });

  it('getAppelsActifs() calls GET /api/tables/appels/actifs and updates activeAppels signal', () => {
    service.getAppelsActifs().subscribe(res => {
      expect(res).toHaveSize(1);
      expect(service.activeAppels()).toHaveSize(1);
    });

    const req = httpMock.expectOne('/api/tables/appels/actifs');
    expect(req.request.method).toBe('GET');
    req.flush([mockAppel]);
  });

  it('acquitterAppel() calls POST /api/tables/:tableId/appels/:id/acquitter and updates signals', () => {
    service.activeAppels.set([mockAppel]);

    const ackAppel: TableAppel = { ...mockAppel, statut: 'ACQUITTE', acquittePar: 'Jean' };
    service.acquitterAppel(5, 10).subscribe(res => {
      expect(res.statut).toBe('ACQUITTE');
      expect(service.activeAppels()).toHaveSize(0);
    });

    const req = httpMock.expectOne('/api/tables/5/appels/10/acquitter');
    expect(req.request.method).toBe('POST');
    req.flush(ackAppel);
  });

  it('acquitterTousAppels() calls POST /api/tables/:tableId/appels/acquitter-tous and clears table alerts', () => {
    service.activeAppels.set([mockAppel, mockAppelAddition]);

    service.acquitterTousAppels(5).subscribe(res => {
      expect(res).toHaveSize(2);
      expect(service.activeAppels()).toHaveSize(0);
    });

    const req = httpMock.expectOne('/api/tables/5/appels/acquitter-tous');
    expect(req.request.method).toBe('POST');
    req.flush([
      { ...mockAppel, statut: 'ACQUITTE' },
      { ...mockAppelAddition, statut: 'ACQUITTE' }
    ]);
  });

  it('should handle incoming WebSocket new alert and add to activeAppels signal', () => {
    expect(service.activeAppels()).toHaveSize(0);

    wsSubject.next({ body: JSON.stringify(mockAppel) });

    expect(service.activeAppels()).toHaveSize(1);
    expect(service.activeAppels()[0].id).toBe(10);
  });

  it('should handle incoming WebSocket acknowledged alert and remove from activeAppels signal', () => {
    service.activeAppels.set([mockAppel]);
    expect(service.activeAppels()).toHaveSize(1);

    const ackAppel = { ...mockAppel, statut: 'ACQUITTE' };
    wsSubject.next({ body: JSON.stringify(ackAppel) });

    expect(service.activeAppels()).toHaveSize(0);
  });

  it('hasActiveAppel() and getActiveAppelType() return correct state', () => {
    service.activeAppels.set([mockAppel]);

    expect(service.hasActiveAppel(5)).toBeTrue();
    expect(service.getActiveAppelType(5)).toBe('ASSISTANCE');
    expect(service.hasActiveAppel(99)).toBeFalse();
    expect(service.getActiveAppelType(99)).toBeNull();
  });
});
