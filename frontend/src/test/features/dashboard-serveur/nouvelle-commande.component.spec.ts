import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { NouvelleCommandeComponent } from '../../../app/features/dashboard-serveur/nouvelle-commande/nouvelle-commande.component';
import { DashboardServeurService } from '../../../app/features/dashboard-serveur/services/dashboard-serveur.service';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { TableView } from '../../../app/features/dashboard-serveur/models/table-view.model';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { Commande } from '../../../app/core/models/commande.model';

const mockTable: TableView = {
  id: 5,
  nom: 'Table 5',
  zone: 'TERRASSE',
  capacite: 4,
  occupee: false,
  commandesActives: [],
};

const mockCocktails: Cocktail[] = [
  {
    id: 1, nom: 'Mojito', prix: 9.5, categorie: 'SANS_ALCOOL', disponible: true,
    saisonnier: false, ingredients: [], variantes: [], createdAt: '', updatedAt: '',
  },
  {
    id: 2, nom: 'Martini', prix: 11, categorie: 'ALCOOLISE', disponible: true,
    saisonnier: false, ingredients: [], variantes: [], createdAt: '', updatedAt: '',
  },
];

const mockCommande: Commande = {
  id: 42, tableId: 5, tableNumero: 5, serveurId: 1, serveurUsername: 'alice',
  items: [], statut: 'EN_ATTENTE', total: 0,
  dateCommande: '', createdAt: '', updatedAt: '',
};

describe('NouvelleCommandeComponent', () => {
  let component: NouvelleCommandeComponent;
  let fixture: ComponentFixture<NouvelleCommandeComponent>;
  let serviceSpy: jasmine.SpyObj<DashboardServeurService>;
  let cocktailSpy: jasmine.SpyObj<CocktailService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('DashboardServeurService', [
      'getTableById', 'createCommande', 'ajouterItem',
    ]);
    serviceSpy.getTableById.and.returnValue(of(mockTable));
    serviceSpy.createCommande.and.returnValue(of(mockCommande));
    serviceSpy.ajouterItem.and.returnValue(of({ ...mockCommande, items: [] } as any));

    cocktailSpy = jasmine.createSpyObj('CocktailService', ['getDisponibles']);
    cocktailSpy.getDisponibles.and.returnValue(of(mockCocktails));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        NouvelleCommandeComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
      ],
      providers: [
        { provide: DashboardServeurService, useValue: serviceSpy },
        { provide: CocktailService, useValue: cocktailSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '5' } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NouvelleCommandeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('charger() peuple table et cocktails depuis les services', fakeAsync(() => {
    component.charger();
    tick();
    expect(component.table).toEqual(mockTable);
    expect(component.cocktails.length).toBe(2);
  }));

  it('charger() affiche un toast danger en cas d\'erreur', fakeAsync(async () => {
    serviceSpy.getTableById.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    await Promise.resolve();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- ajouter / retirer ---

  it('ajouter() ajoute un item au panier', () => {
    component.ajouter(mockCocktails[0]);
    expect(component.cart.length).toBe(1);
    expect(component.cart[0].quantite).toBe(1);
  });

  it('ajouter() incrémente la quantité si le cocktail est déjà dans le panier', () => {
    component.ajouter(mockCocktails[0]);
    component.ajouter(mockCocktails[0]);
    expect(component.cart.length).toBe(1);
    expect(component.cart[0].quantite).toBe(2);
  });

  it('retirer() décrémente la quantité', () => {
    component.ajouter(mockCocktails[0]);
    component.ajouter(mockCocktails[0]);
    component.retirer(mockCocktails[0].id);
    expect(component.cart[0].quantite).toBe(1);
  });

  it('retirer() supprime l\'item du panier quand quantité tombe à 0', () => {
    component.ajouter(mockCocktails[0]);
    component.retirer(mockCocktails[0].id);
    expect(component.cart.length).toBe(0);
  });

  it('supprimer() retire l\'item du panier', () => {
    component.ajouter(mockCocktails[0]);
    component.ajouter(mockCocktails[1]);
    component.supprimer(mockCocktails[0].id);
    expect(component.cart.length).toBe(1);
    expect(component.cart[0].cocktailId).toBe(2);
  });

  it('quantiteDans() retourne 0 si le cocktail n\'est pas dans le panier', () => {
    expect(component.quantiteDans(99)).toBe(0);
  });

  it('quantiteDans() retourne la quantité correcte', () => {
    component.ajouter(mockCocktails[0]);
    component.ajouter(mockCocktails[0]);
    expect(component.quantiteDans(mockCocktails[0].id)).toBe(2);
  });

  it('totalPanier calcule la somme correcte', () => {
    component.ajouter(mockCocktails[0]); // 9.5
    component.ajouter(mockCocktails[1]); // 11
    expect(component.totalPanier).toBeCloseTo(20.5, 2);
  });

  it('nbArticles retourne le nombre total d\'articles', () => {
    component.ajouter(mockCocktails[0]);
    component.ajouter(mockCocktails[0]);
    component.ajouter(mockCocktails[1]);
    expect(component.nbArticles).toBe(3);
  });

  // --- valider() ---

  it('valider() ne fait rien si le panier est vide', () => {
    component.valider();
    expect(serviceSpy.createCommande).not.toHaveBeenCalled();
  });

  it('valider() crée la commande et ajoute les items', fakeAsync(async () => {
    component.ajouter(mockCocktails[0]);
    component.ajouter(mockCocktails[1]);
    component.valider();
    tick();
    await Promise.resolve();
    expect(serviceSpy.createCommande).toHaveBeenCalledWith({ tableId: 5 });
    expect(serviceSpy.ajouterItem).toHaveBeenCalledTimes(2);
  }));

  it('valider() navigue vers /serveur après succès', fakeAsync(async () => {
    component.ajouter(mockCocktails[0]);
    component.valider();
    tick();
    await Promise.resolve();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/serveur']);
  }));

  it('valider() affiche un toast success après création', fakeAsync(async () => {
    component.ajouter(mockCocktails[0]);
    component.valider();
    tick();
    await Promise.resolve();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('valider() affiche un toast danger si createCommande échoue', fakeAsync(async () => {
    serviceSpy.createCommande.and.returnValue(throwError(() => new Error('API error')));
    component.ajouter(mockCocktails[0]);
    component.valider();
    tick();
    await Promise.resolve();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('trackById retourne l\'id du cocktail', () => {
    expect(component.trackById(0, mockCocktails[0])).toBe(1);
  });
});
