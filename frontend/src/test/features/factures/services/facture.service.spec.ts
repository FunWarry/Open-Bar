import { getTranslocoTestingModule } from '../../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FactureService, SplitPartRequest, SplitResultDTO } from '../../../../app/features/factures/services/facture.service';
import { environment } from '../../../../environments/environment';
import { Facture } from '../../../../app/features/factures/models/facture.model';

describe('FactureService', () => {
  let service: FactureService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/factures`;

  const mockFacture: Facture = {
    id: 1,
    tableId: 10,
    montantTotal: 50.0,
    statut: 'EN_ATTENTE'
  } as any;

  const mockSplitResult: SplitResultDTO = {
    factureId: 1,
    nomConvive: 'Alice',
    items: [],
    sousTotal: 25.0,
    totalAvecPourboire: 27.5
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [FactureService]
    });
    service = TestBed.inject(FactureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // getAllFactures
  it('getAllFactures() calls GET /api/factures', () => {
    service.getAllFactures().subscribe(factures => {
      expect(factures).toEqual([mockFacture]);
    });
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockFacture]);
  });

  // getFactureById
  it('getFactureById() calls GET /api/factures/:id', () => {
    service.getFactureById(1).subscribe(facture => {
      expect(facture).toEqual(mockFacture);
    });
    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockFacture);
  });

  // getFacturesByTable
  it('getFacturesByTable() calls GET /api/factures/table/:tableId', () => {
    service.getFacturesByTable(10).subscribe(factures => {
      expect(factures).toEqual([mockFacture]);
    });
    const req = httpMock.expectOne(`${baseUrl}/table/10`);
    expect(req.request.method).toBe('GET');
    req.flush([mockFacture]);
  });

  // getFacturesByDate
  it('getFacturesByDate() calls GET /api/factures/date with start and end params', () => {
    const debut = '2024-01-01';
    const fin = '2024-01-31';
    service.getFacturesByDate(debut, fin).subscribe(factures => {
      expect(factures).toEqual([mockFacture]);
    });
    const req = httpMock.expectOne(r =>
      r.url === `${baseUrl}/date` &&
      r.params.get('debut') === debut &&
      r.params.get('fin') === fin
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockFacture]);
  });

  // reglerFacture
  it('reglerFacture() calls POST /api/factures/:id/regler with paymentMethod', () => {
    service.reglerFacture(1, 'CARTE').subscribe(facture => {
      expect(facture).toEqual(mockFacture);
    });
    const req = httpMock.expectOne(r =>
      r.url === `${baseUrl}/1/regler` &&
      r.params.get('modePaiement') === 'CARTE'
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(mockFacture);
  });

  // splitEgal
  it('splitEgal() calls POST /api/factures/:id/split/egal with numberOfGuests', () => {
    service.splitEgal(1, 3).subscribe(results => {
      expect(results).toEqual([mockSplitResult]);
    });
    const req = httpMock.expectOne(`${baseUrl}/1/split/egal`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombreConvives: 3 });
    req.flush([mockSplitResult]);
  });

  // splitParSelection
  it('splitParSelection() calls POST /api/factures/:id/split/selection with shares', () => {
    const parts: SplitPartRequest[] = [
      { nomConvive: 'Alice', itemIds: [1, 2] },
      { nomConvive: 'Bob', itemIds: [3] }
    ];
    service.splitParSelection(1, parts).subscribe(results => {
      expect(results).toHaveSize(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/1/split/selection`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ parts });
    req.flush([mockSplitResult]);
  });

  // cas d'erreur : getAllFactures renvoie 500
  it('getAllFactures() propage une erreur HTTP 500', () => {
    let errorCaught = false;
    service.getAllFactures().subscribe({
      next: () => fail('devrait echouer'),
      error: err => {
        errorCaught = true;
        expect(err.status).toBe(500);
      }
    });
    const req = httpMock.expectOne(baseUrl);
    req.flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
    expect(errorCaught).toBeTrue();
  });

  // cas d'erreur : getFactureById renvoie 404
  it('getFactureById() propage une erreur HTTP 404', () => {
    let errorCaught = false;
    service.getFactureById(999).subscribe({
      next: () => fail('devrait echouer'),
      error: err => {
        errorCaught = true;
        expect(err.status).toBe(404);
      }
    });
    const req = httpMock.expectOne(`${baseUrl}/999`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(errorCaught).toBeTrue();
  });

  // cas d'erreur : reglerFacture renvoie 400
  it('reglerFacture() propage une erreur HTTP 400', () => {
    let errorCaught = false;
    service.reglerFacture(1, 'INCONNU').subscribe({
      next: () => fail('devrait echouer'),
      error: err => {
        errorCaught = true;
        expect(err.status).toBe(400);
      }
    });
    const req = httpMock.expectOne(r =>
      r.url === `${baseUrl}/1/regler` &&
      r.params.get('modePaiement') === 'INCONNU'
    );
    req.flush('Mode de paiement invalide', { status: 400, statusText: 'Bad Request' });
    expect(errorCaught).toBeTrue();
  });

  it('encaisserPart() posts split part settlement and returns saved reglement', () => {
    const encaissementReq = {
      nomConvive: 'Alice',
      partIndex: 1,
      totalParts: 2,
      montant: 20.0,
      pourboire: 2.0,
      totalRegle: 22.0,
      modePaiement: 'CARTE',
      typeSplit: 'EGAL' as const,
      items: []
    };

    const mockReglement = {
      id: 1,
      factureId: 1,
      nomConvive: 'Alice',
      partIndex: 1,
      totalParts: 2,
      montant: 20.0,
      totalRegle: 22.0,
      modePaiement: 'CARTE',
      typeSplit: 'EGAL' as const,
    };

    service.encaisserPart(1, encaissementReq).subscribe(res => {
      expect(res.id).toBe(1);
      expect(res.nomConvive).toBe('Alice');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/split/encaisser`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(encaissementReq);
    req.flush(mockReglement);
  });

  it('getReglements() retrieves all split payments for an invoice', () => {
    const mockReglements = [
      { id: 1, factureId: 1, partIndex: 1, nomConvive: 'Alice', montant: 20.0, totalRegle: 20.0, modePaiement: 'CARTE', typeSplit: 'EGAL' as const }
    ];

    service.getReglements(1).subscribe(res => {
      expect(res).toEqual(mockReglements);
    });

    const req = httpMock.expectOne(`${baseUrl}/1/reglements`);
    expect(req.request.method).toBe('GET');
    req.flush(mockReglements);
  });
});
