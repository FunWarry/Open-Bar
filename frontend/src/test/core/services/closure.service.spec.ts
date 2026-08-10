import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClosureService, EstablishmentClosure, EstablishmentClosureRequest } from '../../../app/core/services/closure.service';
import { environment } from '../../../environments/environment';

describe('ClosureService', () => {
  let service: ClosureService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/closures`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClosureService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ClosureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getClosures() should fetch all establishment closures via GET', () => {
    const mockClosures: EstablishmentClosure[] = [
      { id: 1, type: 'WEEKLY_RECURRING', dayOfWeek: 'MONDAY', reason: 'Fermé le lundi' }
    ];

    service.getClosures().subscribe(res => {
      expect(res).toEqual(mockClosures);
      expect(res).toHaveSize(1);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockClosures);
  });

  it('createClosure() should send POST request with payload', () => {
    const request: EstablishmentClosureRequest = {
      type: 'EXCEPTIONAL',
      closureDate: '2026-12-25',
      endDate: '2026-12-26',
      isAnnualRecurring: true,
      reason: 'Noël'
    };
    const mockResponse: EstablishmentClosure = { id: 2, ...request };

    service.createClosure(request).subscribe(res => {
      expect(res).toEqual(mockResponse);
      expect(res.id).toBe(2);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('deleteClosure() should send DELETE request for specific ID', () => {
    service.deleteClosure(42).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/42`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
