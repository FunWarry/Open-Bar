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

  it('getStatus() appelle GET /api/setup/status', () => {
    const mockStatus: SetupStatus = { initialized: false, userCount: 0 };
    service.getStatus().subscribe(res => expect(res).toEqual(mockStatus));

    const req = httpMock.expectOne(`${baseUrl}/status`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStatus);
  });

  it('createAdmin() appelle POST /api/setup/admin avec le body', () => {
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
});
