import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TableSessionService } from '../../../app/core/services/table-session.service';
import { TableSessionResponse, TableJoinRequest } from '../../../app/core/models/table-session.model';
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

  it('getSessionQrCodeUrl should build valid URL with token, size and custom origin', () => {
    const url = service.getSessionQrCodeUrl(7, 'my-token', 'PNG', 350, 'http://192.168.1.50:4200');
    expect(url).toContain(`${baseUrl}/7/session/qrcode?format=PNG&size=350`);
    expect(url).toContain('token=my-token');
    expect(url).toContain('baseUrl=http%3A%2F%2F192.168.1.50%3A4200');
  });

  it('downloadSessionQrCode should perform GET request with blob responseType', () => {
    const mockBlob = new Blob(['fake-qr'], { type: 'image/png' });

    service.downloadSessionQrCode(5, 'tok-abc', 'PNG', 300, 'http://localhost:4200').subscribe((blob) => {
      expect(blob).toEqual(mockBlob);
    });

    const req = httpMock.expectOne((r) =>
      r.url === `${baseUrl}/5/session/qrcode` &&
      r.params.get('format') === 'PNG' &&
      r.params.get('size') === '300' &&
      r.params.get('token') === 'tok-abc' &&
      r.params.get('baseUrl') === 'http://localhost:4200'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });

  it('submitJoinRequest should send POST to join-request endpoint', () => {
    const mockJoinReq: TableJoinRequest = {
      id: 77,
      tableId: 5,
      applicantSessionId: 'guest-sam',
      applicantName: 'Sam',
      status: 'PENDING',
      createdAt: '2026-09-05T19:00:00'
    };

    service.submitJoinRequest(5, 'guest-sam', 'Sam').subscribe((res: TableJoinRequest) => {
      expect(res).toEqual(mockJoinReq);
    });

    const req = httpMock.expectOne(`${baseUrl}/5/session/join-request`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tableId: 5, applicantSessionId: 'guest-sam', applicantName: 'Sam' });
    req.flush(mockJoinReq);
  });

  it('respondToJoinRequest should send POST to respond endpoint', () => {
    const mockApprovedReq: TableJoinRequest = {
      id: 77,
      tableId: 5,
      applicantSessionId: 'guest-sam',
      applicantName: 'Sam',
      status: 'APPROVED',
      sessionToken: 'tok-abc',
      createdAt: '2026-09-05T19:00:00'
    };

    service.respondToJoinRequest(5, 77, 'owner-alex', true).subscribe((res: TableJoinRequest) => {
      expect(res.status).toBe('APPROVED');
      expect(res.sessionToken).toBe('tok-abc');
    });

    const req = httpMock.expectOne(`${baseUrl}/5/session/join-requests/77/respond`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ownerSessionId: 'owner-alex', approved: true });
    req.flush(mockApprovedReq);
  });

  it('getJoinRequestStatus should send GET to status endpoint', () => {
    const mockReq: TableJoinRequest = {
      id: 77,
      tableId: 5,
      applicantSessionId: 'guest-sam',
      applicantName: 'Sam',
      status: 'APPROVED',
      sessionToken: 'tok-abc'
    };

    service.getJoinRequestStatus(5, 'guest-sam').subscribe((res: TableJoinRequest) => {
      expect(res.sessionToken).toBe('tok-abc');
    });

    const req = httpMock.expectOne(`${baseUrl}/5/session/join-requests/status?applicantSessionId=guest-sam`);
    expect(req.request.method).toBe('GET');
    req.flush(mockReq);
  });

  it('getPendingJoinRequests should send GET to pending endpoint', () => {
    const mockReqs: TableJoinRequest[] = [
      {
        id: 77,
        tableId: 5,
        applicantSessionId: 'guest-sam',
        applicantName: 'Sam',
        status: 'PENDING'
      }
    ];

    service.getPendingJoinRequests(5, 'owner-alex').subscribe((res: TableJoinRequest[]) => {
      expect(res).toHaveSize(1);
      expect(res[0].applicantName).toBe('Sam');
    });

    const req = httpMock.expectOne(`${baseUrl}/5/session/join-requests/pending?ownerSessionId=owner-alex`);
    expect(req.request.method).toBe('GET');
    req.flush(mockReqs);
  });

  it('validateSession should include guestSessionId and guestName params when provided', () => {
    service.validateSession(4, 'tok-123', 'guest-uuid-1', 'Charlie').subscribe();

    const req = httpMock.expectOne(
      `${baseUrl}/4/session?token=tok-123&guestSessionId=guest-uuid-1&guestName=Charlie`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockActiveSessionResponse);
  });

  it('getSessionQrCodeUrl and downloadSessionQrCode should support SVG format and default window origin', () => {
    const svgUrl = service.getSessionQrCodeUrl(9, null, 'SVG', 400);
    expect(svgUrl).toContain('format=SVG');
    expect(svgUrl).toContain('size=400');

    service.downloadSessionQrCode(9, null, 'SVG', 400).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/9/session/qrcode` && r.params.get('format') === 'SVG');
    req.flush(new Blob(['<svg></svg>'], { type: 'image/svg+xml' }));
  });
});
