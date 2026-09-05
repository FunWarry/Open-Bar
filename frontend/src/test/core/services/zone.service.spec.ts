import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ZoneService, ZoneBar } from '../../../app/core/services/zone.service';
import { environment } from '../../../environments/environment';

describe('ZoneService', () => {
  let service: ZoneService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/zones`;

  const mockZone: ZoneBar = {
    id: 1,
    nom: 'Terrasse',
    etage: 'RDC',
    planX: 100,
    planY: 200,
    planWidth: 300,
    planHeight: 400,
    shapeType: 'rect',
    couleur: '#ff0000',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ZoneService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ZoneService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all zones', () => {
    service.getAll().subscribe((zones) => {
      expect(zones).toEqual([mockZone]);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockZone]);
  });

  it('should get zone by id', () => {
    service.getById(1).subscribe((zone) => {
      expect(zone).toEqual(mockZone);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockZone);
  });

  it('should create a zone', () => {
    service.create(mockZone).subscribe((zone) => {
      expect(zone).toEqual(mockZone);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockZone);
    req.flush(mockZone);
  });

  it('should update a zone', () => {
    service.update(1, mockZone).subscribe((zone) => {
      expect(zone).toEqual(mockZone);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockZone);
    req.flush(mockZone);
  });

  it('should delete a zone', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
