import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuditLogService } from '../../../app/core/services/audit-log.service';
import { AuditLog } from '../../../app/core/models/audit-log.model';
import { environment } from '../../../environments/environment';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/audit-logs`;

  const mockAuditLogs: AuditLog[] = [
    {
      id: 1,
      userId: 1,
      userUsername: 'admin',
      action: 'CREATE',
      entityType: 'User',
      entityId: 2,
      details: 'Created user test',
      timestamp: '2026-07-30T10:00:00Z'
    },
    {
      id: 2,
      userId: null,
      userUsername: 'SYSTEM',
      action: 'SETUP',
      entityType: 'System',
      entityId: null,
      details: 'System initialized',
      timestamp: '2026-07-30T09:00:00Z'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [AuditLogService]
    });
    service = TestBed.inject(AuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAuditLogs() should fetch all audit logs via GET', () => {
    service.getAuditLogs().subscribe((logs) => {
      expect(logs).toHaveSize(2);
      expect(logs).toEqual(mockAuditLogs);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockAuditLogs);
  });

  it('getAuditLogsByUser() should fetch user specific logs', () => {
    service.getAuditLogsByUser(1).subscribe((logs) => {
      expect(logs).toHaveSize(1);
      expect(logs[0].userUsername).toBe('admin');
    });

    const req = httpMock.expectOne(`${apiUrl}/user/1`);
    expect(req.request.method).toBe('GET');
    req.flush([mockAuditLogs[0]]);
  });

  it('getAuditLogsByAction() should fetch action filtered logs', () => {
    service.getAuditLogsByAction('CREATE').subscribe((logs) => {
      expect(logs).toHaveSize(1);
      expect(logs[0].action).toBe('CREATE');
    });

    const req = httpMock.expectOne(`${apiUrl}/action/CREATE`);
    expect(req.request.method).toBe('GET');
    req.flush([mockAuditLogs[0]]);
  });

  it('getAuditLogsByEntityType() should fetch entity type filtered logs', () => {
    service.getAuditLogsByEntityType('User').subscribe((logs) => {
      expect(logs).toHaveSize(1);
      expect(logs[0].entityType).toBe('User');
    });

    const req = httpMock.expectOne(`${apiUrl}/entity-type/User`);
    expect(req.request.method).toBe('GET');
    req.flush([mockAuditLogs[0]]);
  });

  it('getAuditLogsByEntityId() should fetch entity ID filtered logs', () => {
    service.getAuditLogsByEntityId(2).subscribe((logs) => {
      expect(logs).toHaveSize(1);
      expect(logs[0].entityId).toBe(2);
    });

    const req = httpMock.expectOne(`${apiUrl}/entity-id/2`);
    expect(req.request.method).toBe('GET');
    req.flush([mockAuditLogs[0]]);
  });

  it('getAuditLogsByDate() should fetch date range filtered logs', () => {
    const debut = '2026-07-01T00:00:00';
    const fin = '2026-07-30T23:59:59';

    service.getAuditLogsByDate(debut, fin).subscribe((logs) => {
      expect(logs).toHaveSize(2);
    });

    const req = httpMock.expectOne((r) => r.url === `${apiUrl}/date` && r.params.has('debut') && r.params.has('fin'));
    expect(req.request.method).toBe('GET');
    req.flush(mockAuditLogs);
  });
});
