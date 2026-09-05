import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GlasswareService } from '../../../app/core/services/glassware.service';
import { environment } from '../../../environments/environment';
import { Glassware, GlasswareRequest } from '../../../app/core/models/glassware.model';

describe('GlasswareService', () => {
  let service: GlasswareService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/glassware`;

  const mockGlasswareList: Glassware[] = [
    {
      id: 1,
      nom: 'Verre Tumbler',
      contenanceCl: 35,
      imageUrl: 'assets/images/verres/verre_tumbler.png',
      description: 'Long drink glass',
      isPredefined: true,
      createdAt: '2026-01-01T00:00:00',
      updatedAt: '2026-01-01T00:00:00',
    },
    {
      id: 2,
      nom: 'Coupe Martini',
      contenanceCl: 18,
      imageUrl: 'assets/images/verres/verre_martini.png',
      isPredefined: true,
      createdAt: '2026-01-01T00:00:00',
      updatedAt: '2026-01-01T00:00:00',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GlasswareService],
    });
    service = TestBed.inject(GlasswareService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should call GET /api/glassware and return all glassware items', () => {
    service.getAll().subscribe((data) => {
      expect(data).toHaveSize(2);
      expect(data[0].nom).toBe('Verre Tumbler');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockGlasswareList);
  });

  it('should call GET /api/glassware/:id and return single glassware', () => {
    service.getById(1).subscribe((data) => {
      expect(data.id).toBe(1);
      expect(data.nom).toBe('Verre Tumbler');
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockGlasswareList[0]);
  });

  it('should call POST /api/glassware and return newly created glassware', () => {
    const payload: GlasswareRequest = {
      nom: 'Verre Shot',
      contenanceCl: 5,
      imageUrl: 'assets/images/verres/verre_tumbler.png',
      description: 'Shooter',
    };

    service.create(payload).subscribe((created) => {
      expect(created.id).toBe(3);
      expect(created.nom).toBe('Verre Shot');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 3, ...payload, isPredefined: false, createdAt: '', updatedAt: '' });
  });

  it('should call PUT /api/glassware/:id and return updated glassware', () => {
    const payload: GlasswareRequest = {
      nom: 'Verre Tumbler XL',
      contenanceCl: 40,
    };

    service.update(1, payload).subscribe((updated) => {
      expect(updated.nom).toBe('Verre Tumbler XL');
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockGlasswareList[0], nom: 'Verre Tumbler XL', contenanceCl: 40 });
  });

  it('should call POST /api/glassware/:id/image and return updated glassware with new image', () => {
    const file = new File(['dummy content'], 'custom_glass.png', { type: 'image/png' });

    service.uploadImage(1, file).subscribe((updated) => {
      expect(updated.imageUrl).toBe('/uploads/glassware/glassware_1_abc.png');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/image`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ ...mockGlasswareList[0], imageUrl: '/uploads/glassware/glassware_1_abc.png' });
  });

  it('should call DELETE /api/glassware/:id', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
