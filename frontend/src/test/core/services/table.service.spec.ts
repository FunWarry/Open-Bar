import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TableService } from '../../../app/core/services/table.service';
import { TableBar } from '../../../app/core/models/table.model';
import { environment } from '../../../environments/environment';

describe('TableService', () => {
  let service: TableService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/tables`;

  const mockTable: TableBar = {
    id: 1,
    numero: 1,
    capacite: 4,
    zone: 'INTERIEUR',
    occupee: false,
    createdAt: '2024-01-01T00:00:00',
    updatedAt: '2024-01-01T00:00:00'
  };

  const mockTableOccupee: TableBar = {
    id: 2,
    numero: 2,
    capacite: 2,
    zone: 'TERRASSE',
    occupee: true,
    serveurId: 10,
    dateOccupation: '2024-01-01T12:00:00',
    createdAt: '2024-01-01T00:00:00',
    updatedAt: '2024-01-01T12:00:00'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [TableService]
    });
    service = TestBed.inject(TableService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // --- getAll ---

  it('getAll() calls GET /api/tables', () => {
    service.getAll().subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getAll() retourne la liste des tables', () => {
    let result: TableBar[] = [];
    service.getAll().subscribe(tables => (result = tables));
    const req = httpMock.expectOne(baseUrl);
    req.flush([mockTable, mockTableOccupee]);
    expect(result).toHaveSize(2);
    expect(result[0].numero).toBe(1);
  });

  // --- getById ---

  it('getById() calls GET /api/tables/:id', () => {
    service.getById(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTable);
  });

  it('getById() retourne la table correspondante', () => {
    let result: TableBar | undefined;
    service.getById(1).subscribe(t => (result = t));
    const req = httpMock.expectOne(`${baseUrl}/1`);
    req.flush(mockTable);
    expect(result).toEqual(mockTable);
  });

  it('getById() propage une erreur 404', () => {
    let errorStatus = 0;
    service.getById(999).subscribe({
      error: err => (errorStatus = err.status)
    });
    const req = httpMock.expectOne(`${baseUrl}/999`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(errorStatus).toBe(404);
  });

  // --- create ---

  it('create() calls POST /api/tables', () => {
    const payload: Partial<TableBar> = { numero: 3, capacite: 6, zone: 'ETAGE', occupee: false };
    service.create(payload).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...mockTable, ...payload, id: 3 });
  });

  it('create() propage une erreur 500', () => {
    let errorStatus = 0;
    service.create({}).subscribe({ error: err => (errorStatus = err.status) });
    const req = httpMock.expectOne(baseUrl);
    req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    expect(errorStatus).toBe(500);
  });

  // --- update ---

  it('update() calls PUT /api/tables/:id', () => {
    const payload: Partial<TableBar> = { capacite: 8 };
    service.update(1, payload).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...mockTable, ...payload });
  });

  it('update() returns updated table', () => {
    const payload: Partial<TableBar> = { capacite: 8 };
    let result: TableBar | undefined;
    service.update(1, payload).subscribe(t => (result = t));
    const req = httpMock.expectOne(`${baseUrl}/1`);
    req.flush({ ...mockTable, capacite: 8 });
    expect(result?.capacite).toBe(8);
  });

  // --- delete ---

  it('delete() calls DELETE /api/tables/:id', () => {
    service.delete(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('delete() propage une erreur 404 si table inexistante', () => {
    let errorStatus = 0;
    service.delete(999).subscribe({ error: err => (errorStatus = err.status) });
    const req = httpMock.expectOne(`${baseUrl}/999`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(errorStatus).toBe(404);
  });

  // --- occuper ---

  it('occuper() appelle PATCH /api/tables/:id/occuper sans serveurId', () => {
    service.occuper(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/1/occuper`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ serveurId: undefined });
    req.flush({ ...mockTable, occupee: true });
  });

  it('occuper() envoie le serveurId dans le body', () => {
    service.occuper(1, 10).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/1/occuper`);
    expect(req.request.body).toEqual({ serveurId: 10 });
    req.flush({ ...mockTable, occupee: true, serveurId: 10 });
  });

  it('occuper() returns occupied table', () => {
    let result: TableBar | undefined;
    service.occuper(2, 10).subscribe(t => (result = t));
    const req = httpMock.expectOne(`${baseUrl}/2/occuper`);
    req.flush(mockTableOccupee);
    expect(result?.occupee).toBeTrue();
    expect(result?.serveurId).toBe(10);
  });

  // --- liberer ---

  it('liberer() appelle PATCH /api/tables/:id/liberer', () => {
    service.liberer(2).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/2/liberer`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush({ ...mockTableOccupee, occupee: false });
  });

  it('liberer() returns liberated table', () => {
    let result: TableBar | undefined;
    service.liberer(2).subscribe(t => (result = t));
    const req = httpMock.expectOne(`${baseUrl}/2/liberer`);
    req.flush({ ...mockTable, id: 2, occupee: false });
    expect(result?.occupee).toBeFalse();
  });

  // --- getLibres ---

  it('getLibres() calls GET /api/tables/libres', () => {
    service.getLibres().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/libres`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getLibres() retourne uniquement les tables libres', () => {
    let result: TableBar[] = [];
    service.getLibres().subscribe(tables => (result = tables));
    const req = httpMock.expectOne(`${baseUrl}/libres`);
    req.flush([mockTable]);
    expect(result.every(t => !t.occupee)).toBeTrue();
  });

  // --- getOccupees ---

  it('getOccupees() calls GET /api/tables/occupees', () => {
    service.getOccupees().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/occupees`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getOccupees() returns only occupied tables', () => {
    let result: TableBar[] = [];
    service.getOccupees().subscribe(tables => (result = tables));
    const req = httpMock.expectOne(`${baseUrl}/occupees`);
    req.flush([mockTableOccupee]);
    expect(result.every(t => t.occupee)).toBeTrue();
  });

  // --- QR Code and PDF exports ---

  it('getTableQrCodeUrl() builds correct url with format and size', () => {
    const url = service.getTableQrCodeUrl(1, 'SVG', 400);
    expect(url).toBe(`${baseUrl}/1/qrcode?format=SVG&size=400`);
  });

  it('downloadTableQrCode() calls GET /api/tables/:id/qrcode with blob response', () => {
    const mockBlob = new Blob(['mock-qr-bytes'], { type: 'image/png' });
    let resultBlob: Blob | undefined;

    service.downloadTableQrCode(1, 'PNG', 300).subscribe(blob => (resultBlob = blob));

    const req = httpMock.expectOne(request =>
      request.url === `${baseUrl}/1/qrcode` &&
      request.params.get('format') === 'PNG' &&
      request.params.get('size') === '300'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);

    expect(resultBlob).toBeDefined();
  });

  it('downloadQrCodesPdf() calls GET /api/tables/qrcodes/pdf with layout and params', () => {
    const mockPdfBlob = new Blob(['mock-pdf-bytes'], { type: 'application/pdf' });
    let resultBlob: Blob | undefined;

    service.downloadQrCodesPdf('CARD', [1, 2], true).subscribe(blob => (resultBlob = blob));

    const req = httpMock.expectOne(request =>
      request.url === `${baseUrl}/qrcodes/pdf` &&
      request.params.get('layout') === 'CARD' &&
      request.params.getAll('tableIds')?.length === 2 &&
      request.params.get('includeWifi') === 'true'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockPdfBlob);

    expect(resultBlob).toBeDefined();
  });
});
