import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ShiftService } from '../../app/core/services/shift.service';
import { EmployeeShift, EmployeeShiftRequest } from '../../app/core/models/shift.model';
import { environment } from '../../environments/environment';

describe('ShiftService', () => {
  let service: ShiftService;
  let httpMock: HttpTestingController;

  const mockShift: EmployeeShift = {
    id: 1,
    userId: 10,
    userName: 'serveur1',
    dateShift: '2026-08-10',
    typeShift: 'MATIN',
    typePoste: 'SERVEUR',
    heureDebut: '08:00',
    heureFin: '16:00',
    heuresEffectuees: 8
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ShiftService]
    });

    service = TestBed.inject(ShiftService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAllShifts() should GET /api/shifts', () => {
    service.getAllShifts().subscribe(shifts => {
      expect(shifts).toEqual([mockShift]);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/shifts`);
    expect(req.request.method).toBe('GET');
    req.flush([mockShift]);
  });

  it('getShiftsForWeek() should GET /api/shifts/week with query params', () => {
    service.getShiftsForWeek('2026-08-10', '2026-08-16').subscribe(shifts => {
      expect(shifts).toEqual([mockShift]);
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/shifts/week'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('debut')).toBe('2026-08-10');
    expect(req.request.params.get('fin')).toBe('2026-08-16');
    req.flush([mockShift]);
  });

  it('createShift() should POST /api/shifts', () => {
    const requestPayload: EmployeeShiftRequest = {
      userId: 10,
      dateShift: '2026-08-10',
      typeShift: 'MATIN',
      typePoste: 'SERVEUR',
      heureDebut: '08:00',
      heureFin: '16:00'
    };

    service.createShift(requestPayload).subscribe(shift => {
      expect(shift).toEqual(mockShift);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/shifts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(requestPayload);
    req.flush(mockShift);
  });

  it('updateShift() should PUT /api/shifts/:id', () => {
    const requestPayload: EmployeeShiftRequest = {
      userId: 10,
      dateShift: '2026-08-10',
      typeShift: 'SOIR',
      typePoste: 'SERVEUR',
      heureDebut: '17:00',
      heureFin: '01:00'
    };

    service.updateShift(1, requestPayload).subscribe(shift => {
      expect(shift).toEqual(mockShift);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/shifts/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(requestPayload);
    req.flush(mockShift);
  });

  it('deleteShift() should DELETE /api/shifts/:id', () => {
    service.deleteShift(1).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/shifts/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getShiftHistory() should GET /api/shifts/:id/history', () => {
    service.getShiftHistory(1).subscribe(logs => {
      expect(logs).toHaveSize(1);
      expect(logs[0].shiftId).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/shifts/1/history`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 100, shiftId: 1, action: 'CREATED', changedBy: 'manager1', changedAt: '2026-08-11T10:00:00' }]);
  });

  it('getWeekAuditLog() should GET /api/schedule/audit-log with week and userId', () => {
    service.getWeekAuditLog('2026-08-10', 10).subscribe(logs => {
      expect(logs).toHaveSize(1);
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/schedule/audit-log'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('week')).toBe('2026-08-10');
    expect(req.request.params.get('userId')).toBe('10');
    req.flush([{ id: 100, shiftId: 1, action: 'CREATED', changedBy: 'manager1', changedAt: '2026-08-11T10:00:00' }]);
  });

  it('getScheduleAt() should GET /api/schedule/at with week and at ISO params', () => {
    service.getScheduleAt('2026-08-10', '2026-08-11T12:00:00').subscribe(shifts => {
      expect(shifts).toEqual([mockShift]);
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/schedule/at'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('week')).toBe('2026-08-10');
    expect(req.request.params.get('at')).toBe('2026-08-11T12:00:00');
    req.flush([mockShift]);
  });
});
