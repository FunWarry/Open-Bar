import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PublicationService, WeekSchedulePublicationDTO } from '../../../app/core/services/publication.service';
import { environment } from '../../../environments/environment';

describe('PublicationService', () => {
  let service: PublicationService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/schedule`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PublicationService]
    });

    service = TestBed.inject(PublicationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('publishWeek() sends POST request with weekStart param and returns DTO', () => {
    const mockDto: WeekSchedulePublicationDTO = {
      id: 1,
      weekStart: '2026-08-17',
      publishedAt: '2026-08-17T10:00:00',
      publishedBy: 'manager1'
    };

    service.publishWeek('2026-08-17').subscribe(res => {
      expect(res).toEqual(mockDto);
    });

    const req = httpMock.expectOne(`${apiUrl}/publish?weekStart=2026-08-17`);
    expect(req.request.method).toBe('POST');
    req.flush(mockDto);
  });

  it('getPublication() sends GET request and returns publication DTO if present', () => {
    const mockDto: WeekSchedulePublicationDTO = {
      id: 1,
      weekStart: '2026-08-17',
      publishedAt: '2026-08-17T10:00:00',
      publishedBy: 'manager1'
    };

    service.getPublication('2026-08-17').subscribe(res => {
      expect(res).toEqual(mockDto);
    });

    const req = httpMock.expectOne(`${apiUrl}/publication?weekStart=2026-08-17`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDto);
  });

  it('getPublication() returns null if week has not been published', () => {
    service.getPublication('2026-08-17').subscribe(res => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}/publication?weekStart=2026-08-17`);
    expect(req.request.method).toBe('GET');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
