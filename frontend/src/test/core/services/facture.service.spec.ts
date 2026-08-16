import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FactureService } from '../../../app/core/services/facture.service';
import { environment } from '../../../environments/environment';
import { Facture, ReglementRequest } from '../../../app/core/models/facture.model';
import { DailyRecap } from '../../../app/core/models/daily-recap.model';

describe('FactureService', () => {
  let service: FactureService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/factures`;

  const mockFacture: Facture = {
    id: 1,
    tableId: 5,
    tableNumero: 5,
    items: [],
    numero: 'FACT-2026-0001',
    total: 45.5,
    totalTTC: 45.5,
    dateFacture: '2026-08-16T12:00:00',
    reglee: false,
    modePaiement: 'CARTE',
    createdAt: '2026-08-16T12:00:00',
    updatedAt: '2026-08-16T12:00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FactureService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(FactureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all factures', () => {
    service.getAll().subscribe((factures) => {
      expect(factures).toEqual([mockFacture]);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockFacture]);
  });

  it('should get facture by id', () => {
    service.getById(1).subscribe((facture) => {
      expect(facture).toEqual(mockFacture);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockFacture);
  });

  it('should get factures by table id', () => {
    service.getByTable(5).subscribe((factures) => {
      expect(factures).toEqual([mockFacture]);
    });

    const req = httpMock.expectOne(`${apiUrl}/table/5`);
    expect(req.request.method).toBe('GET');
    req.flush([mockFacture]);
  });

  it('should create a facture for a table', () => {
    service.create(5).subscribe((facture) => {
      expect(facture).toEqual(mockFacture);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tableId: 5 });
    req.flush(mockFacture);
  });

  it('should add item to facture', () => {
    const item = { cocktailId: 10, quantite: 2 };
    service.ajouterItem(1, item).subscribe((facture) => {
      expect(facture).toEqual(mockFacture);
    });

    const req = httpMock.expectOne(`${apiUrl}/1/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(item);
    req.flush(mockFacture);
  });

  it('should remove item from facture', () => {
    service.retirerItem(1, 20).subscribe((facture) => {
      expect(facture).toEqual(mockFacture);
    });

    const req = httpMock.expectOne(`${apiUrl}/1/items/20`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockFacture);
  });

  it('should settle a facture payment', () => {
    const reglement: ReglementRequest = { modePaiement: 'CARTE' };
    service.regler(1, reglement).subscribe((facture) => {
      expect(facture).toEqual(mockFacture);
    });

    const req = httpMock.expectOne(`${apiUrl}/1/regler`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(reglement);
    req.flush(mockFacture);
  });

  it('should add tip to facture', () => {
    service.ajouterPourboire(1, 5.0).subscribe((facture) => {
      expect(facture).toEqual(mockFacture);
    });

    const req = httpMock.expectOne(`${apiUrl}/1/pourboire`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ pourboire: 5.0 });
    req.flush(mockFacture);
  });

  it('should get daily recap with and without date param', () => {
    const mockRecap: DailyRecap = {
      date: '2026-08-16',
      totalCaTtc: 500,
      totalCaHt: 416.67,
      totalTva: 83.33,
      nombreFacturesReglees: 10,
      panierMoyen: 50,
      nombreClients: 20,
      ventilationModePaiement: [],
      ventilationTva: [],
    };

    service.getDailyRecap().subscribe((recap) => {
      expect(recap).toEqual(mockRecap);
    });
    const req1 = httpMock.expectOne(`${apiUrl}/daily-recap`);
    expect(req1.request.method).toBe('GET');
    req1.flush(mockRecap);

    service.getDailyRecap('2026-08-16').subscribe((recap) => {
      expect(recap).toEqual(mockRecap);
    });
    const req2 = httpMock.expectOne(`${apiUrl}/daily-recap?date=2026-08-16`);
    expect(req2.request.method).toBe('GET');
    req2.flush(mockRecap);
  });

  it('should download daily recap PDF with and without date param', () => {
    const mockBlob = new Blob(['PDF_CONTENT'], { type: 'application/pdf' });

    service.downloadDailyRecapPdf().subscribe((blob) => {
      expect(blob).toBeTruthy();
    });
    const req1 = httpMock.expectOne(`${apiUrl}/daily-recap/pdf`);
    expect(req1.request.method).toBe('GET');
    expect(req1.request.responseType).toBe('blob');
    req1.flush(mockBlob);

    service.downloadDailyRecapPdf('2026-08-16').subscribe((blob) => {
      expect(blob).toBeTruthy();
    });
    const req2 = httpMock.expectOne(`${apiUrl}/daily-recap/pdf?date=2026-08-16`);
    expect(req2.request.method).toBe('GET');
    req2.flush(mockBlob);
  });
});
