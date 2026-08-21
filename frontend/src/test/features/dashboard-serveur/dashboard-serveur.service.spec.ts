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

  it('getAllCommandes() retrieves all orders or empty array on error', () => {
    const mockCommandes = [{ id: 10, total: 18.5 } as any];

    service.getAllCommandes().subscribe(res => {
      expect(res).toEqual(mockCommandes);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/commandes`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCommandes);

    service.getAllCommandes().subscribe(res => {
      expect(res).toEqual([]);
    });

    const reqErr = httpTesting.expectOne(`${environment.apiUrl}/commandes`);
    reqErr.flush('Server error', { status: 500, statusText: 'Error' });
  });

  it('getAllTables() retrieves tables and maps to TableView', () => {
    const mockTables = [
      { id: 1, numero: 5, zone: 'Terrasse', etage: 'RDC', capacite: 4, occupee: true, dateOccupation: '2026-06-22T10:00:00' }
    ];

    service.getAllTables().subscribe(tables => {
      expect(tables).toHaveSize(1);
      expect(tables[0].nom).toBe('Table 5');
      expect(tables[0].zone).toBe('Terrasse');
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/tables`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTables);
  });

  it('getPlanSallePositions() returns positions or empty array on error', () => {
    const mockPositions = [{ tableId: 1, x: 100, y: 150, rotation: 0, shape: 'rect' as const, width: 80, height: 80 }];

    service.getPlanSallePositions().subscribe(pos => {
      expect(pos).toEqual(mockPositions);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/tables/positions`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPositions);

    service.getPlanSallePositions().subscribe(pos => {
      expect(pos).toEqual([]);
    });

    const reqErr = httpTesting.expectOne(`${environment.apiUrl}/tables/positions`);
    reqErr.flush('Error', { status: 500, statusText: 'Server Error' });
  });

  it('getTableById() and getMesTables() map tables to TableView', () => {
    const mockTable = { id: 2, numero: 10, zone: 'Bar', etage: 'RDC', capacite: 2, occupee: false, createdAt: '', updatedAt: '' };

    service.getTableById(2).subscribe(tv => {
      expect(tv.nom).toBe('Table 10');
      expect(tv.occupee).toBeFalse();
    });

    const req1 = httpTesting.expectOne(`${environment.apiUrl}/tables/2`);
    expect(req1.request.method).toBe('GET');
    req1.flush(mockTable);

    service.getMesTables(3).subscribe(tvs => {
      expect(tvs).toHaveSize(1);
      expect(tvs[0].nom).toBe('Table 10');
    });

    const req2 = httpTesting.expectOne(`${environment.apiUrl}/tables/serveur/3`);
    expect(req2.request.method).toBe('GET');
    req2.flush([mockTable]);
  });

  it('getCommandesByTable() and getCommandesParStatut() perform GET requests', () => {
    const mockCommandes = [{ id: 10, tableId: 2, statut: 'EN_ATTENTE' as any } as any];

    service.getCommandesByTable(2).subscribe(res => {
      expect(res).toEqual(mockCommandes);
    });

    const req1 = httpTesting.expectOne(`${environment.apiUrl}/commandes/table/2`);
    expect(req1.request.method).toBe('GET');
    req1.flush(mockCommandes);

    service.getCommandesParStatut('EN_PREPARATION' as any).subscribe(res => {
      expect(res).toEqual(mockCommandes);
    });

    const req2 = httpTesting.expectOne(`${environment.apiUrl}/commandes/statut/EN_PREPARATION`);
    expect(req2.request.method).toBe('GET');
    req2.flush(mockCommandes);
  });

  it('occuperTable() and libererTable() patch table occupancy', () => {
    const mockTable = { id: 2, numero: 10, zone: 'Bar', capacite: 2, occupee: true, createdAt: '', updatedAt: '' };

    service.occuperTable(2, 5).subscribe(res => {
      expect(res).toEqual(mockTable);
    });

    const req1 = httpTesting.expectOne(`${environment.apiUrl}/tables/2/occuper`);
    expect(req1.request.method).toBe('PATCH');
    expect(req1.request.body).toEqual({ serveurId: 5 });
    req1.flush(mockTable);

    service.libererTable(2).subscribe(res => {
      expect(res).toEqual(mockTable);
    });

    const req2 = httpTesting.expectOne(`${environment.apiUrl}/tables/2/liberer`);
    expect(req2.request.method).toBe('PATCH');
    req2.flush(mockTable);
  });

  it('order mutation methods send appropriate HTTP calls', () => {
    const createReq = { tableId: 2, items: [] };
    const addItemReq = { cocktailId: 1, quantite: 1, prixUnitaire: 8.5 };
    const mockOrder = { id: 10 } as any;

    service.createCommande(createReq).subscribe(res => expect(res).toEqual(mockOrder));
    const r1 = httpTesting.expectOne(`${environment.apiUrl}/commandes`);
    expect(r1.request.method).toBe('POST');
    r1.flush(mockOrder);

    service.ajouterItem(10, addItemReq).subscribe(res => expect(res).toEqual(mockOrder));
    const r2 = httpTesting.expectOne(`${environment.apiUrl}/commandes/10/items`);
    expect(r2.request.method).toBe('POST');
    r2.flush(mockOrder);

    service.annulerCommande(10).subscribe(res => expect(res).toEqual(mockOrder));
    const r3 = httpTesting.expectOne(`${environment.apiUrl}/commandes/10/annuler`);
    expect(r3.request.method).toBe('PATCH');
    r3.flush(mockOrder);

    service.changerStatutCommande(10, 'PRETE' as any).subscribe(res => expect(res).toEqual(mockOrder));
    const r4 = httpTesting.expectOne(`${environment.apiUrl}/commandes/10/statut`);
    expect(r4.request.method).toBe('PATCH');
    expect(r4.request.body).toEqual({ statut: 'PRETE' });
    r4.flush(mockOrder);

    service.transfererCommande(10, 5).subscribe(res => expect(res).toEqual(mockOrder));
    const r5 = httpTesting.expectOne(`${environment.apiUrl}/commandes/10/table/5`);
    expect(r5.request.method).toBe('PUT');
    r5.flush(mockOrder);
  });
});
