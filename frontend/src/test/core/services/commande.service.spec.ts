import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CommandeService } from '../../../app/core/services/commande.service';
import {
  AjouterItemRequest,
  Commande,
  CreateCommandeRequest,
} from '../../../app/core/models/commande.model';
import { environment } from '../../../environments/environment';

describe('CommandeService', () => {
  let service: CommandeService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/commandes`;

  const mockCommande: Commande = {
    id: 1,
    statut: 'EN_ATTENTE',
  } as Commande;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [CommandeService],
    });
    service = TestBed.inject(CommandeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // --- getAll ---

  it('getAll() appelle GET /api/commandes', () => {
    service.getAll().subscribe((result) => {
      expect(result).toEqual([mockCommande]);
    });
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockCommande]);
  });

  it('getAll() retourne un tableau vide si aucune commande', () => {
    service.getAll().subscribe((result) => {
      expect(result).toEqual([]);
    });
    const req = httpMock.expectOne(baseUrl);
    req.flush([]);
  });

  // --- getById ---

  it('getById() appelle GET /api/commandes/:id', () => {
    service.getById(1).subscribe((result) => {
      expect(result).toEqual(mockCommande);
    });
    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCommande);
  });

  it('getById() propage une erreur 404 si commande introuvable', () => {
    let errorOccurred = false;
    service.getById(999).subscribe({
      next: () => fail('should fail'),
      error: (err) => {
        errorOccurred = true;
        expect(err.status).toBe(404);
      },
    });
    const req = httpMock.expectOne(`${baseUrl}/999`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(errorOccurred).toBeTrue();
  });

  // --- getByStatut ---

  it('getByStatut() appelle GET /api/commandes/statut/:statut', () => {
    service.getByStatut('EN_ATTENTE').subscribe((result) => {
      expect(result).toEqual([mockCommande]);
    });
    const req = httpMock.expectOne(`${baseUrl}/statut/EN_ATTENTE`);
    expect(req.request.method).toBe('GET');
    req.flush([mockCommande]);
  });

  it('getByStatut() retourne un tableau vide si aucune commande avec ce statut', () => {
    service.getByStatut('LIVREE').subscribe((result) => {
      expect(result).toEqual([]);
    });
    const req = httpMock.expectOne(`${baseUrl}/statut/LIVREE`);
    req.flush([]);
  });

  // --- getByTable ---

  it('getByTable() appelle GET /api/commandes/table/:tableId', () => {
    service.getByTable(5).subscribe((result) => {
      expect(result).toEqual([mockCommande]);
    });
    const req = httpMock.expectOne(`${baseUrl}/table/5`);
    expect(req.request.method).toBe('GET');
    req.flush([mockCommande]);
  });

  // --- create ---

  it('create() appelle POST /api/commandes avec le payload', () => {
    const payload: CreateCommandeRequest = { tableId: 3, items: [] } as CreateCommandeRequest;
    service.create(payload).subscribe((result) => {
      expect(result).toEqual(mockCommande);
    });
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockCommande);
  });

  it('create() propage une erreur 500 du serveur', () => {
    let errorOccurred = false;
    const payload: CreateCommandeRequest = { tableId: 3, items: [] } as CreateCommandeRequest;
    service.create(payload).subscribe({
      next: () => fail('should fail'),
      error: (err) => {
        errorOccurred = true;
        expect(err.status).toBe(500);
      },
    });
    const req = httpMock.expectOne(baseUrl);
    req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    expect(errorOccurred).toBeTrue();
  });

  // --- ajouterItem ---

  it('ajouterItem() appelle POST /api/commandes/:id/items avec le payload', () => {
    const item: AjouterItemRequest = { cocktailId: 7, quantite: 2 } as AjouterItemRequest;
    service.ajouterItem(1, item).subscribe((result) => {
      expect(result).toEqual(mockCommande);
    });
    const req = httpMock.expectOne(`${baseUrl}/1/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(item);
    req.flush(mockCommande);
  });

  // --- retirerItem ---

  it('retirerItem() appelle DELETE /api/commandes/:id/items/:itemId', () => {
    service.retirerItem(1, 10).subscribe((result) => {
      expect(result).toEqual(mockCommande);
    });
    const req = httpMock.expectOne(`${baseUrl}/1/items/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockCommande);
  });

  it('retirerItem() propage une erreur 404 si item introuvable', () => {
    let errorOccurred = false;
    service.retirerItem(1, 999).subscribe({
      next: () => fail('should fail'),
      error: (err) => {
        errorOccurred = true;
        expect(err.status).toBe(404);
      },
    });
    const req = httpMock.expectOne(`${baseUrl}/1/items/999`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(errorOccurred).toBeTrue();
  });

  // --- changerStatut ---

  it('changerStatut() appelle PATCH /api/commandes/:id/statut avec le statut', () => {
    service.changerStatut(1, 'EN_PREPARATION').subscribe((result) => {
      expect(result).toEqual(mockCommande);
    });
    const req = httpMock.expectOne(`${baseUrl}/1/statut`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ statut: 'EN_PREPARATION' });
    req.flush(mockCommande);
  });

  it('changerStatut() propage une erreur 400 si transition de statut invalide', () => {
    let errorOccurred = false;
    service.changerStatut(1, 'EN_ATTENTE').subscribe({
      next: () => fail('should fail'),
      error: (err) => {
        errorOccurred = true;
        expect(err.status).toBe(400);
      },
    });
    const req = httpMock.expectOne(`${baseUrl}/1/statut`);
    req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    expect(errorOccurred).toBeTrue();
  });

  // --- annuler ---

  it('annuler() appelle PATCH /api/commandes/:id/annuler avec un body vide', () => {
    service.annuler(1).subscribe((result) => {
      expect(result).toEqual(mockCommande);
    });
    const req = httpMock.expectOne(`${baseUrl}/1/annuler`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush(mockCommande);
  });

  // --- setPriorite ---

  it('setPriorite() appelle PATCH /api/commandes/:id/priorite avec priorite=true', () => {
    service.setPriorite(1, true).subscribe((result) => {
      expect(result).toEqual(mockCommande);
    });
    const req = httpMock.expectOne(`${baseUrl}/1/priorite`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ priorite: true });
    req.flush(mockCommande);
  });

  it('setPriorite() appelle PATCH /api/commandes/:id/priorite avec priorite=false', () => {
    service.setPriorite(1, false).subscribe((result) => {
      expect(result).toEqual(mockCommande);
    });
    const req = httpMock.expectOne(`${baseUrl}/1/priorite`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ priorite: false });
    req.flush(mockCommande);
  });
});
