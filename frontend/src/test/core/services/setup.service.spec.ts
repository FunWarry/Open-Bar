import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SetupService, SetupStatus, CreateAdminRequest } from '../../../app/core/services/setup.service';
import { environment } from '../../../environments/environment';

describe('SetupService', () => {
  let service: SetupService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/setup`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [SetupService],
    });
    service = TestBed.inject(SetupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getStatus() calls GET /api/setup/status', () => {
    const mockStatus: SetupStatus = { initialized: false, userCount: 0 };
    service.getStatus().subscribe(res => expect(res).toEqual(mockStatus));

    const req = httpMock.expectOne(`${baseUrl}/status`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStatus);
  });

  it('createAdmin() calls POST /api/setup/admin avec le body', () => {
    const request: CreateAdminRequest = {
      username: 'admin',
      email: 'admin@bar.com',
      password: 'password123',
      nom: 'Admin',
      prenom: 'Initial'
    };
    const mockResponse = { id: 1, username: 'admin', email: 'admin@bar.com', roles: ['ADMIN'] };

    service.createAdmin(request).subscribe(res => expect(res).toEqual(mockResponse));

    const req = httpMock.expectOne(`${baseUrl}/admin`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('caches initialized status and returns it without issuing another HTTP request', () => {
    const initializedStatus: SetupStatus = { initialized: true, userCount: 1 };

    // First call triggers HTTP GET
    service.getStatus().subscribe(res => expect(res).toEqual(initializedStatus));
    const req = httpMock.expectOne(`${baseUrl}/status`);
    req.flush(initializedStatus);

    // Second call should return cached status without issuing another request
    service.getStatus().subscribe(res => expect(res).toEqual(initializedStatus));
    httpMock.expectNone(`${baseUrl}/status`);
  });

  it('bypasses cache when forceRefresh is set to true', () => {
    const initialStatus: SetupStatus = { initialized: true, userCount: 1 };
    const updatedStatus: SetupStatus = { initialized: true, userCount: 2 };

    service.getStatus().subscribe();
    const req1 = httpMock.expectOne(`${baseUrl}/status`);
    req1.flush(initialStatus);

    // Force refresh triggers a new HTTP call
    service.getStatus(true).subscribe(res => expect(res).toEqual(updatedStatus));
    const req2 = httpMock.expectOne(`${baseUrl}/status`);
    req2.flush(updatedStatus);
  });

  it('clears cache when clearCache() is invoked', () => {
    const status: SetupStatus = { initialized: true, userCount: 1 };

    service.getStatus().subscribe();
    const req1 = httpMock.expectOne(`${baseUrl}/status`);
    req1.flush(status);

    service.clearCache();

    service.getStatus().subscribe(res => expect(res).toEqual(status));
    const req2 = httpMock.expectOne(`${baseUrl}/status`);
    req2.flush(status);
  });
});

