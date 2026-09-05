import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TableSessionService } from '../../../app/core/services/table-session.service';
import { TableSessionResponse } from '../../../app/core/models/table-session.model';
import { environment } from '../../../environments/environment';

describe('TableSessionService', () => {
  let service: TableSessionService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/public/tables`;

  const mockActiveSessionResponse: TableSessionResponse = {
    id: 10,
    tableId: 4,
    sessionToken: 'test-session-token-12345',
    status: 'ACTIVE',
    openedAt: '2026-09-05T18:00:00',
    lastActivityAt: '2026-09-05T18:10:00',
    expiresAt: '2026-09-05T20:00:00',
    valid: true,
    message: 'Table session is active and valid'
  };

  const mockExpiredSessionResponse: TableSessionResponse = {
    id: 11,
    tableId: 4,
    sessionToken: 'expired-session-token',
    status: 'EXPIRED',
    openedAt: '2026-09-05T15:00:00',
    lastActivityAt: '2026-09-05T15:30:00',
    expiresAt: '2026-09-05T17:00:00',
    valid: false,
    message: 'Table session has expired'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TableSessionService]
    });

    service = TestBed.inject(TableSessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('validateSession should send GET request with token query param when token is provided', () => {
    service.validateSession(4, 'test-session-token-12345').subscribe((response) => {
      expect(response).toEqual(mockActiveSessionResponse);
      expect(response.valid).toBeTrue();
      expect(response.status).toBe('ACTIVE');
    });

    const req = httpMock.expectOne(`${baseUrl}/4/session?token=test-session-token-12345`);
    expect(req.request.method).toBe('GET');
    req.flush(mockActiveSessionResponse);
  });

  it('validateSession should send GET request without token query param when token is null', () => {
    service.validateSession(4, null).subscribe((response) => {
      expect(response).toEqual(mockActiveSessionResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/4/session`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('token')).toBeFalse();
    req.flush(mockActiveSessionResponse);
  });

  it('validateSessionPayload should send POST request with sessionToken payload', () => {
    service.validateSessionPayload(4, 'test-session-token-12345').subscribe((response) => {
      expect(response).toEqual(mockActiveSessionResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/4/session/validate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ sessionToken: 'test-session-token-12345' });
    req.flush(mockActiveSessionResponse);
  });

  it('refreshSession should send POST request to refresh endpoint', () => {
    service.refreshSession(4).subscribe((response) => {
      expect(response).toEqual(mockActiveSessionResponse);
      expect(response.sessionToken).toBe('test-session-token-12345');
    });

    const req = httpMock.expectOne(`${baseUrl}/4/session/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockActiveSessionResponse);
  });

  it('validateSession should handle expired session response', () => {
    service.validateSession(4, 'expired-session-token').subscribe((response) => {
      expect(response.valid).toBeFalse();
      expect(response.status).toBe('EXPIRED');
    });

    const req = httpMock.expectOne(`${baseUrl}/4/session?token=expired-session-token`);
    req.flush(mockExpiredSessionResponse);
  });
});
