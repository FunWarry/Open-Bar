import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { By } from '@angular/platform-browser';
import { IngredientListComponent } from '../../../app/features/ingredients/ingredient-list/ingredient-list.component';
import { selectIsAdmin } from '../../../app/core/store/auth.selectors';

describe('IngredientListComponent', () => {
  let component: IngredientListComponent;
  let fixture: ComponentFixture<IngredientListComponent>;
  let store: MockStore;

  const initialState = {
    auth: {
      user: null,
      token: null,
      loading: false,
      error: null
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IngredientListComponent,
        IonicModule.forRoot()
      ],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectIsAdmin, false);

    fixture = TestBed.createComponent(IngredientListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });

  it('devrait initialiser items avec un tableau vide', () => {
    expect(component.items).toEqual([]);
  });

  it('isAdmin$ devrait émettre false par défaut', (done) => {
    component.isAdmin$.subscribe(isAdmin => {
      expect(isAdmin).toBeFalse();
      done();
    });
  });

  it('isAdmin$ devrait émettre true quand le store renvoie true', (done) => {
    store.overrideSelector(selectIsAdmin, true);
    store.refreshState();

    const fixture2 = TestBed.createComponent(IngredientListComponent);
    const component2 = fixture2.componentInstance;

    component2.isAdmin$.subscribe(isAdmin => {
      expect(isAdmin).toBeTrue();
      done();
    });
  });

  describe('getStockColor()', () => {
    it('devrait retourner "danger" pour un stock de 0', () => {
      expect(component.getStockColor(0)).toBe('danger');
    });

    it('devrait retourner "danger" pour un stock négatif', () => {
      expect(component.getStockColor(-5)).toBe('danger');
    });

    it('devrait retourner "warning" pour un stock inférieur à 10', () => {
      expect(component.getStockColor(5)).toBe('warning');
    });

    it('devrait retourner "warning" pour un stock de 1', () => {
      expect(component.getStockColor(1)).toBe('warning');
    });

    it('devrait retourner "success" pour un stock de 10', () => {
      expect(component.getStockColor(10)).toBe('success');
    });

    it('devrait retourner "success" pour un stock abondant', () => {
      expect(component.getStockColor(100)).toBe('success');
    });
  });

  describe('trackById()', () => {
    it('devrait retourner item.id si présent', () => {
      const item = { id: 42, nom: 'Sucre' };
      expect(component.trackById(0, item)).toBe(42);
    });

    it('devrait retourner l\'index si item.id est absent', () => {
      const item = { nom: 'Sucre' };
      expect(component.trackById(3, item)).toBe(3);
    });

    it('devrait retourner l\'index si item.id est null', () => {
      const item = { id: null, nom: 'Citron' };
      expect(component.trackById(2, item)).toBe(2);
    });
  });

  describe('méthodes d\'action (stubs)', () => {
    it('onAdd() ne devrait pas lever d\'exception', () => {
      expect(() => component.onAdd()).not.toThrow();
    });

    it('onView() ne devrait pas lever d\'exception', () => {
      const ingredient = { id: 1, nom: 'Menthe' };
      expect(() => component.onView(ingredient)).not.toThrow();
    });

    it('onEdit() ne devrait pas lever d\'exception', () => {
      const ingredient = { id: 1, nom: 'Citron' };
      expect(() => component.onEdit(ingredient)).not.toThrow();
    });

    it('onDelete() ne devrait pas lever d\'exception', () => {
      const ingredient = { id: 1, nom: 'Glace' };
      expect(() => component.onDelete(ingredient)).not.toThrow();
    });
  });

  describe('ngOnInit()', () => {
    it('ne devrait pas modifier items (chargement non implémenté)', () => {
      component.items = [];
      component.ngOnInit();
      expect(component.items).toEqual([]);
    });
  });
});
