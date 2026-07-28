import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { EMPTY } from 'rxjs';
import { of, throwError } from 'rxjs';
import { NouvelleCommandeComponent, CartItem } from '../../../app/features/dashboard-serveur/nouvelle-commande/nouvelle-commande.component';
import { DashboardServeurService } from '../../../app/features/dashboard-serveur/services/dashboard-serveur.service';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { TableView } from '../../../app/features/dashboard-serveur/models/table-view.model';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { Commande } from '../../../app/core/models/commande.model';
import { VarianteSelectionResult } from '../../../app/features/dashboard-serveur/variante-modal/variante-modal.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockTable: TableView = {
  id: 5,
  nom: 'Table 5',
  zone: 'TERRASSE',
  capacite: 4,
  occupee: false,
  commandesActives: [],
};

const mockCocktailWithoutVariante: Cocktail = {
  id: 1, nom: 'Mojito', prix: 9.5, categorie: 'SANS_ALCOOL', disponible: true,
  saisonnier: false, ingredients: [], variantes: [], createdAt: '', updatedAt: '',
};

const mockCocktailWithVariante: Cocktail = {
  id: 2, nom: 'Martini', prix: 11, categorie: 'ALCOOLISE', disponible: true,
  saisonnier: false, ingredients: [],
  variantes: [
    { id: 10, nom: 'Martini Dry', prixSupplement: 2, disponible: true },
    { id: 11, nom: 'Martini Extra Dry', prixSupplement: 3.5, disponible: true },
    { id: 12, nom: 'Martini Indisponible', prixSupplement: 1, disponible: false },
  ],
  createdAt: '', updatedAt: '',
};

const mockCocktails: Cocktail[] = [mockCocktailWithoutVariante, mockCocktailWithVariante];

const mockCommande: Commande = {
  id: 42, tableId: 5, tableNumero: 5, serveurId: 1, serveurUsername: 'alice',
  items: [], statut: 'EN_ATTENTE', total: 0,
  dateCommande: '', createdAt: '', updatedAt: '',
};

/** Helper: builds a VarianteSelectionResult for tests. */
function makeResult(overrides: Partial<VarianteSelectionResult> = {}): VarianteSelectionResult {
  return {
    variante: null,
    notes: undefined,
    prixEffectif: 9.5,
    ...overrides,
  };
}

describe('NouvelleCommandeComponent', () => {
  let component: NouvelleCommandeComponent;
  let fixture: ComponentFixture<NouvelleCommandeComponent>;
  let serviceSpy: jasmine.SpyObj<DashboardServeurService>;
  let cocktailSpy: jasmine.SpyObj<CocktailService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockToast = { present: jasmine.createSpy('present') };
  // Simulate modal that returns a confirmed result with no variant and no notes
  const mockModalDismiss = Promise.resolve({ data: makeResult(), role: 'confirm' });
  const mockModal = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(mockModalDismiss),
  };

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

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    (routerSpy as any).events = EMPTY;

    await TestBed.configureTestingModule({
      imports: [
        NouvelleCommandeComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: DashboardServeurService, useValue: serviceSpy },
        { provide: CocktailService, useValue: cocktailSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
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

  // --- charger() ---

  it('charger() populates table and cocktails from services', fakeAsync(() => {
    component.charger();
    tick();
    expect(component.table).toEqual(mockTable);
    expect(component.cocktails).toHaveSize(2);
  }));

  it('charger() shows a danger toast on error', fakeAsync(() => {
    serviceSpy.getTableById.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- buildCartKey() ---

  it('buildCartKey() returns distinct keys for different variants', () => {
    const k1 = component.buildCartKey(1, 10, undefined);
    const k2 = component.buildCartKey(1, 11, undefined);
    const k3 = component.buildCartKey(1, undefined, 'sans menthe');
    expect(k1).not.toEqual(k2);
    expect(k1).not.toEqual(k3);
  });

  it('buildCartKey() returns the same key for identical inputs', () => {
    const k1 = component.buildCartKey(1, 10, 'note');
    const k2 = component.buildCartKey(1, 10, 'note');
    expect(k1).toEqual(k2);
  });

  // --- ajouterDepuisModal() ---

  it('ajouterDepuisModal() adds a new cart item when cart is empty', () => {
    const result = makeResult({ prixEffectif: 9.5 });
    component.ajouterDepuisModal(mockCocktailWithoutVariante, result);
    expect(component.cart).toHaveSize(1);
    expect(component.cart[0].quantite).toBe(1);
    expect(component.cart[0].prixUnitaire).toBe(9.5);
  });

  it('ajouterDepuisModal() increments quantity for the same key', () => {
    const result = makeResult({ prixEffectif: 9.5 });
    component.ajouterDepuisModal(mockCocktailWithoutVariante, result);
    component.ajouterDepuisModal(mockCocktailWithoutVariante, result);
    expect(component.cart).toHaveSize(1);
    expect(component.cart[0].quantite).toBe(2);
  });

  it('ajouterDepuisModal() creates a separate cart line for different variants', () => {
    const resultClassic = makeResult({ variante: null, prixEffectif: 11 });
    const resultVariante = makeResult({
      variante: { id: 10, nom: 'Martini Dry', prixSupplement: 2, disponible: true },
      prixEffectif: 13,
    });
    component.ajouterDepuisModal(mockCocktailWithVariante, resultClassic);
    component.ajouterDepuisModal(mockCocktailWithVariante, resultVariante);
    expect(component.cart).toHaveSize(2);
  });

  it('ajouterDepuisModal() stores varianteId, varianteNom, and notes', () => {
    const result = makeResult({
      variante: { id: 10, nom: 'Martini Dry', prixSupplement: 2, disponible: true },
      notes: 'allergie fraise',
      prixEffectif: 13,
    });
    component.ajouterDepuisModal(mockCocktailWithVariante, result);
    const item = component.cart[0];
    expect(item.varianteId).toBe(10);
    expect(item.varianteNom).toBe('Martini Dry');
    expect(item.notes).toBe('allergie fraise');
  });

  // --- retirer() ---

  it('retirer() decrements quantity', () => {
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    const key = component.cart[0].cartItemKey;
    component.retirer(key);
    expect(component.cart[0].quantite).toBe(1);
  });

  it('retirer() removes item when quantity reaches zero', () => {
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    const key = component.cart[0].cartItemKey;
    component.retirer(key);
    expect(component.cart).toHaveSize(0);
  });

  it('retirer() does nothing for an unknown key', () => {
    component.retirer('unknown-key');
    expect(component.cart).toHaveSize(0);
  });

  // --- incrementer() ---

  it('incrementer() increments the quantity of an existing item', () => {
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    const key = component.cart[0].cartItemKey;
    component.incrementer(key);
    expect(component.cart[0].quantite).toBe(2);
  });

  it('incrementer() does nothing for an unknown key', () => {
    component.incrementer('unknown-key');
    expect(component.cart).toHaveSize(0);
  });


  // --- supprimer() ---

  it('supprimer() removes the item from cart', () => {
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    component.ajouterDepuisModal(mockCocktailWithVariante, makeResult({ variante: { id: 10, nom: 'Dry', prixSupplement: 2, disponible: true }, prixEffectif: 13 }));
    const key = component.cart[0].cartItemKey;
    component.supprimer(key);
    expect(component.cart).toHaveSize(1);
    expect(component.cart[0].cocktailId).toBe(2);
  });

  // --- quantiteDans() ---

  it('quantiteDans() returns 0 when cocktail is not in cart', () => {
    expect(component.quantiteDans(99)).toBe(0);
  });

  it('quantiteDans() sums quantities across all variants', () => {
    component.ajouterDepuisModal(mockCocktailWithVariante, makeResult({ variante: null, prixEffectif: 11 }));
    component.ajouterDepuisModal(mockCocktailWithVariante, makeResult({
      variante: { id: 10, nom: 'Dry', prixSupplement: 2, disponible: true }, prixEffectif: 13,
    }));
    expect(component.quantiteDans(2)).toBe(2);
  });

  // --- totalPanier / nbArticles ---

  it('totalPanier computes the correct sum including variant supplements', () => {
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    component.ajouterDepuisModal(mockCocktailWithVariante, makeResult({
      variante: { id: 10, nom: 'Dry', prixSupplement: 2, disponible: true }, prixEffectif: 13,
    }));
    expect(component.totalPanier).toBeCloseTo(22.5, 2);
  });

  it('nbArticles returns the total unit count', () => {
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    component.ajouterDepuisModal(mockCocktailWithVariante, makeResult({ variante: { id: 10, nom: 'Dry', prixSupplement: 2, disponible: true }, prixEffectif: 13 }));
    expect(component.nbArticles).toBe(3);
  });

  // --- valider() ---

  it('valider() does nothing when cart is empty', () => {
    component.valider();
    expect(serviceSpy.createCommande).not.toHaveBeenCalled();
  });

  it('valider() creates the commande and adds all items', fakeAsync(() => {
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    component.ajouterDepuisModal(mockCocktailWithVariante, makeResult({
      variante: { id: 10, nom: 'Dry', prixSupplement: 2, disponible: true }, prixEffectif: 13,
    }));
    component.valider();
    tick();
    flushMicrotasks();
    expect(serviceSpy.createCommande).toHaveBeenCalledWith({ tableId: 5 });
    expect(serviceSpy.ajouterItem).toHaveBeenCalledTimes(2);
  }));

  it('valider() passes varianteId and notes to ajouterItem', fakeAsync(() => {
    component.ajouterDepuisModal(mockCocktailWithVariante, makeResult({
      variante: { id: 10, nom: 'Dry', prixSupplement: 2, disponible: true },
      notes: 'allergie fraise',
      prixEffectif: 13,
    }));
    component.valider();
    tick();
    flushMicrotasks();
    expect(serviceSpy.ajouterItem).toHaveBeenCalledWith(42, jasmine.objectContaining({
      varianteId: 10,
      notes: 'allergie fraise',
    }));
  }));

  it('valider() navigates to /serveur on success', fakeAsync(() => {
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    component.valider();
    tick();
    flushMicrotasks();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/serveur']);
  }));

  it('valider() shows success toast on success', fakeAsync(() => {
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    component.valider();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('valider() shows danger toast when createCommande fails', fakeAsync(() => {
    serviceSpy.createCommande.and.returnValue(throwError(() => new Error('API error')));
    component.ajouterDepuisModal(mockCocktailWithoutVariante, makeResult({ prixEffectif: 9.5 }));
    component.valider();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- trackById / trackByKey ---

  it('trackById returns the cocktail id', () => {
    expect(component.trackById(0, mockCocktailWithoutVariante)).toBe(1);
  });

  it('trackByKey returns the cart item key', () => {
    const item: CartItem = {
      cartItemKey: 'test-key',
      cocktailId: 1,
      cocktailNom: 'Mojito',
      prixUnitaire: 9.5,
      quantite: 1,
    };
    expect(component.trackByKey(0, item)).toBe('test-key');
  });
});
