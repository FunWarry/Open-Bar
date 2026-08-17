import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  DashboardServeurService,
  TableAdditionResponse,
  EncaissementRequest
} from '../../../app/features/dashboard-serveur/services/dashboard-serveur.service';
import { environment } from '../../../environments/environment';

describe('DashboardServeurService', () => {
  let service: DashboardServeurService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardServeurService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });

    service = TestBed.inject(DashboardServeurService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('getTableAddition() retrieves bill breakdown for table', () => {
    const mockResponse: TableAdditionResponse = {
      tableId: 5,
      tableNumero: 5,
      zone: 'Terrasse',
      items: [],
      commandeIds: [10],
      totalHT: 20.0,
      totalVAT: 4.0,
      totalTTC: 24.0,
      nombreArticles: 2,
      hasUnpaidFacture: false
    };

    service.getTableAddition(5).subscribe(res => {
      expect(res).toEqual(mockResponse);
      expect(res.totalTTC).toBe(24.0);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/factures/table/5/addition`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('encaisserTable() posts encaissement request and returns settled invoice', () => {
    const encaissementReq: EncaissementRequest = {
      modePaiement: 'CARTE',
      pourboire: 2.0,
      libererTable: true,
      commandeIds: [10]
    };

    const mockFacture = {
      id: 100,
      numero: 'FAC-2026-00100',
      totalTTC: 26.0,
      reglee: true,
      modePaiement: 'CARTE'
    };

    service.encaisserTable(5, encaissementReq).subscribe(res => {
      expect(res.id).toBe(100);
      expect(res.numero).toBe('FAC-2026-00100');
      expect(res.reglee).toBeTrue();
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/factures/table/5/encaisser`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(encaissementReq);
    req.flush(mockFacture);
  });

  it('getZones() returns zones from backend or empty array on error', () => {
    const mockZones = [{ id: 1, nom: 'Salle Principale', etage: 'RDC' }];

    service.getZones().subscribe(zones => {
      expect(zones).toEqual(mockZones);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/zones`);
    expect(req.request.method).toBe('GET');
    req.flush(mockZones);

    service.getZones().subscribe(zones => {
      expect(zones).toEqual([]);
    });

    const reqErr = httpTesting.expectOne(`${environment.apiUrl}/zones`);
    reqErr.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('getEtages() returns etages from backend or empty array on error', () => {
    const mockEtages = [{ id: 1, code: 'RDC', nom: 'Ground Floor (RDC)', ordre: 1 }];

    service.getEtages().subscribe(etages => {
      expect(etages).toEqual(mockEtages);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/etages`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEtages);

    service.getEtages().subscribe(etages => {
      expect(etages).toEqual([]);
    });

    const reqErr = httpTesting.expectOne(`${environment.apiUrl}/etages`);
    reqErr.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('modifierCommande() sends PUT request to /commandes/:id/modifier', () => {
    const modifierReq = {
      items: [
        { cocktailId: 1, quantite: 2, prixUnitaire: 8.5 }
      ],
      notes: 'Sans paille',
      pourboire: 1.5,
    };

    const mockCommande = {
      id: 10,
      total: 18.5,
      items: [],
    };

    service.modifierCommande(10, modifierReq).subscribe(res => {
      expect(res.id).toBe(10);
      expect(res.total).toBe(18.5);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/commandes/10/modifier`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(modifierReq);
    req.flush(mockCommande);
  });
});
