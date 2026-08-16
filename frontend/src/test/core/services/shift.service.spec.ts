import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ShiftService } from '../../../app/core/services/shift.service';
import { EmployeeShift, EmployeeShiftRequest, ShiftAuditLog, ShiftPreset, TypeShift, TypePoste } from '../../../app/core/models/shift.model';
import { environment } from '../../../environments/environment';

describe('ShiftService', () => {
  let service: ShiftService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/shifts`;

  const mockShift: EmployeeShift = {
    id: 1,
    userId: 2,
    userName: 'John Doe',
    dateShift: '2026-08-16',
    typeShift: 'MATIN',
    typePoste: 'SERVEUR',
    heureDebut: '08:00',
    heureFin: '16:00',
  };

  const mockPreset: ShiftPreset = {
    id: 1,
    typeShift: 'MATIN',
    nom: 'Service Matin',
    heureDebut: '08:00',
    heureFin: '16:00',
    dureePauseMinutes: 30,
  };

  const mockAuditLog: ShiftAuditLog = {
    id: 10,
    shiftId: 1,
    userId: 2,
    userName: 'John Doe',
    dateShift: '2026-08-16',
    action: 'CREATED',
    changedBy: 'admin',
    changedAt: '2026-08-16T08:00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ShiftService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
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

  it('should get all shifts', () => {
    service.getAllShifts().subscribe((shifts) => {
      expect(shifts).toEqual([mockShift]);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockShift]);
  });

  it('should get shift by id', () => {
    service.getShiftById(1).subscribe((shift) => {
      expect(shift).toEqual(mockShift);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockShift);
  });

  it('should get shifts for week with and without debut/fin', () => {
    service.getShiftsForWeek().subscribe((shifts) => {
      expect(shifts).toEqual([mockShift]);
    });
    const req1 = httpMock.expectOne(`${apiUrl}/week`);
    expect(req1.request.method).toBe('GET');
    req1.flush([mockShift]);

    service.getShiftsForWeek('2026-08-10', '2026-08-16').subscribe((shifts) => {
      expect(shifts).toEqual([mockShift]);
    });
    const req2 = httpMock.expectOne(`${apiUrl}/week?debut=2026-08-10&fin=2026-08-16`);
    expect(req2.request.method).toBe('GET');
    req2.flush([mockShift]);
  });

  it('should get shifts for custom range', () => {
    service.getShiftsForRange('2026-08-10', '2026-08-16').subscribe((shifts) => {
      expect(shifts).toEqual([mockShift]);
    });

    const req = httpMock.expectOne(`${apiUrl}/range?from=2026-08-10&to=2026-08-16`);
    expect(req.request.method).toBe('GET');
    req.flush([mockShift]);
  });

  it('should get shifts by user id', () => {
    service.getShiftsByUserId(2).subscribe((shifts) => {
      expect(shifts).toEqual([mockShift]);
    });

    const req = httpMock.expectOne(`${apiUrl}/user/2`);
    expect(req.request.method).toBe('GET');
    req.flush([mockShift]);
  });

  it('should create a shift', () => {
    const shiftReq: EmployeeShiftRequest = {
      userId: 2,
      dateShift: '2026-08-16',
      typeShift: 'MATIN',
      typePoste: 'SERVEUR',
      heureDebut: '08:00',
      heureFin: '16:00',
    };

    service.createShift(shiftReq).subscribe((shift) => {
      expect(shift).toEqual(mockShift);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(shiftReq);
    req.flush(mockShift);
  });

  it('should update a shift', () => {
    const shiftReq: EmployeeShiftRequest = {
      userId: 2,
      dateShift: '2026-08-16',
      typeShift: 'MATIN',
      typePoste: 'SERVEUR',
      heureDebut: '08:00',
      heureFin: '16:00',
    };

    service.updateShift(1, shiftReq).subscribe((shift) => {
      expect(shift).toEqual(mockShift);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(shiftReq);
    req.flush(mockShift);
  });

  it('should delete a shift', () => {
    service.deleteShift(1).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should get shift presets', () => {
    service.getPresets().subscribe((presets) => {
      expect(presets).toEqual([mockPreset]);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/shift-presets`);
    expect(req.request.method).toBe('GET');
    req.flush([mockPreset]);
  });

  it('should update shift preset', () => {
    service.updatePreset('MATIN', mockPreset).subscribe((preset) => {
      expect(preset).toEqual(mockPreset);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/shift-presets/MATIN`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockPreset);
  });

  it('should get shift history', () => {
    service.getShiftHistory(1).subscribe((logs) => {
      expect(logs).toEqual([mockAuditLog]);
    });

    const req = httpMock.expectOne(`${apiUrl}/1/history`);
    expect(req.request.method).toBe('GET');
    req.flush([mockAuditLog]);
  });

  it('should get week audit log with and without userId', () => {
    service.getWeekAuditLog('2026-08-16').subscribe((logs) => {
      expect(logs).toEqual([mockAuditLog]);
    });
    const req1 = httpMock.expectOne(`${environment.apiUrl}/schedule/audit-log?week=2026-08-16`);
    expect(req1.request.method).toBe('GET');
    req1.flush([mockAuditLog]);

    service.getWeekAuditLog('2026-08-16', 2).subscribe((logs) => {
      expect(logs).toEqual([mockAuditLog]);
    });
    const req2 = httpMock.expectOne(`${environment.apiUrl}/schedule/audit-log?week=2026-08-16&userId=2`);
    expect(req2.request.method).toBe('GET');
    req2.flush([mockAuditLog]);
  });

  it('should get schedule at specific historical timestamp', () => {
    service.getScheduleAt('2026-08-16', '2026-08-16T10:00:00').subscribe((shifts) => {
      expect(shifts).toEqual([mockShift]);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/schedule/at?week=2026-08-16&at=2026-08-16T10:00:00`);
    expect(req.request.method).toBe('GET');
    req.flush([mockShift]);
  });
});
