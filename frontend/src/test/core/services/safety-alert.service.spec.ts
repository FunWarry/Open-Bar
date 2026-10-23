import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SafetyAlertService } from '../../../app/core/services/safety-alert.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { SafetyAlert, SafetyAlertRequest } from '../../../app/core/models/safety-alert.model';
import { Subject } from 'rxjs';

describe('SafetyAlertService', () => {
  let service: SafetyAlertService;
  let httpMock: HttpTestingController;
  let wsMock: jasmine.SpyObj<WebSocketService>;
  let safetySubject: Subject<any>;
  let appelsSubject: Subject<any>;

  const mockAlert: SafetyAlert = {
    id: 1,
    tableId: 4,
    tableNumero: 7,
    type: 'ANGEL_SHOT_LIME',
    typeLabel: 'Citron',
    status: 'ACTIVE',
    comment: 'Need security',
    createdAt: '2026-10-23T12:00:00'
  };

  beforeEach(() => {
    safetySubject = new Subject<any>();
    appelsSubject = new Subject<any>();

    wsMock = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsMock.watch.and.callFake((destination: string) => {
      if (destination === '/topic/safety-alerts') {
        return safetySubject.asObservable();
      }
      return appelsSubject.asObservable();
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SafetyAlertService,
        { provide: WebSocketService, useValue: wsMock }
      ]
    });

    service = TestBed.inject(SafetyAlertService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and subscribe to safety and staff calls topics', () => {
    expect(service).toBeTruthy();
    expect(wsMock.watch).toHaveBeenCalledWith('/topic/safety-alerts');
    expect(wsMock.watch).toHaveBeenCalledWith('/topic/serveur/appels');
  });

  it('should send public silent alert via triggerSafetyAlert', () => {
    service.triggerSafetyAlert(4, 'ANGEL_SHOT_ICE', 'Taxi please').subscribe((res) => {
      expect(res).toEqual(mockAlert);
    });

    const req = httpMock.expectOne('/api/public/safety-alerts/tables/4');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'ANGEL_SHOT_ICE', comment: 'Taxi please' });
    req.flush(mockAlert);
  });

  it('should load active alerts and update signal via getActiveAlerts', () => {
    service.getActiveAlerts().subscribe((alerts) => {
      expect(alerts.length).toBe(1);
      expect(service.activeAlerts().length).toBe(1);
      expect(service.activeAlerts()[0].id).toBe(1);
    });

    const req = httpMock.expectOne('/api/safety-alerts/active');
    expect(req.request.method).toBe('GET');
    req.flush([mockAlert]);
  });

  it('should get active alerts for a specific table', () => {
    service.getActiveAlertsForTable(4).subscribe((alerts) => {
      expect(alerts).toEqual([mockAlert]);
    });

    const req = httpMock.expectOne('/api/safety-alerts/tables/4');
    expect(req.request.method).toBe('GET');
    req.flush([mockAlert]);
  });

  it('should resolve alert and remove it from active signal', () => {
    service.activeAlerts.set([mockAlert]);

    const resolvedAlert: SafetyAlert = {
      ...mockAlert,
      status: 'RESOLVED',
      resolvedBy: 'Alex'
    };

    service.resolveAlert(1, 'Alex').subscribe((res) => {
      expect(res.status).toBe('RESOLVED');
      expect(service.activeAlerts().length).toBe(0);
    });

    const req = httpMock.expectOne('/api/safety-alerts/1/resolve');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ resolvedBy: 'Alex' });
    req.flush(resolvedAlert);
  });

  it('should download restroom notice PDF as blob', () => {
    const blob = new Blob(['pdf-data'], { type: 'application/pdf' });

    service.downloadRestroomNoticePdf().subscribe((data) => {
      expect(data).toBeTruthy();
    });

    const req = httpMock.expectOne('/api/safety-alerts/poster/pdf');
    expect(req.request.method).toBe('GET');
    req.flush(blob);
  });

  it('should update active alerts signal when incoming message arrives on /topic/safety-alerts', () => {
    expect(service.activeAlerts().length).toBe(0);

    safetySubject.next({
      body: JSON.stringify(mockAlert)
    });

    expect(service.activeAlerts().length).toBe(1);
    expect(service.activeAlerts()[0].type).toBe('ANGEL_SHOT_LIME');
  });

  it('should remove resolved alert when incoming resolved event arrives on /topic/safety-alerts', () => {
    service.activeAlerts.set([mockAlert]);

    safetySubject.next({
      body: JSON.stringify({ ...mockAlert, status: 'RESOLVED' })
    });

    expect(service.activeAlerts().length).toBe(0);
  });
});
