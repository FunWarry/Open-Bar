import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { CocktailListComponent } from '../../../app/features/cocktails/cocktail-list/cocktail-list.component';
import { Cocktail } from '../../../app/core/models/cocktail.model';

const mockCocktail: Cocktail = {
  id: 1,
  nom: 'Mojito',
  prix: 8.5,
  categorie: 'ALCOOLISE',
  disponible: true,
  saisonnier: false,
  ingredients: [],
  variantes: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockCocktailSaisonnier: Cocktail = {
  id: 2,
  nom: 'Sangria',
  prix: 7.0,
  categorie: 'ALCOOLISE',
  disponible: true,
  saisonnier: true,
  dateDebutSaison: '2024-06-01',
  dateFinSaison: '2024-08-31',
  moisDebut: 6,
  moisFin: 8,
  disponibleAujourdhui: false,
  ingredients: [],
  variantes: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

describe('CocktailListComponent', () => {
  let component: CocktailListComponent;
  let fixture: ComponentFixture<CocktailListComponent>;
  let storeSpy: jasmine.SpyObj<Store>;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [
        CocktailListComponent,
        IonicModule.forRoot()
      ],
      providers: [
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CocktailListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty items list', () => {
    expect(component.items).toEqual([]);
  });

  it('isAdmin$ should be populated from the store', (done) => {
    storeSpy.select.and.returnValue(of(true));

    fixture = TestBed.createComponent(CocktailListComponent);
    component = fixture.componentInstance;

    component.isAdmin$.subscribe(isAdmin => {
      expect(isAdmin).toBe(true);
      done();
    });
  });

  describe('isHorsSaison()', () => {
    it('should return false when cocktail has no moisDebut', () => {
      const cocktail = { ...mockCocktail, moisDebut: undefined, moisFin: 8, disponibleAujourdhui: false };
      expect(component.isHorsSaison(cocktail as Cocktail)).toBe(false);
    });

    it('should return false when cocktail has no moisFin', () => {
      const cocktail = { ...mockCocktail, moisDebut: 6, moisFin: undefined, disponibleAujourdhui: false };
      expect(component.isHorsSaison(cocktail as Cocktail)).toBe(false);
    });

    it('should return false when disponibleAujourdhui is true', () => {
      const cocktail = { ...mockCocktailSaisonnier, disponibleAujourdhui: true };
      expect(component.isHorsSaison(cocktail as Cocktail)).toBe(false);
    });

    it('should return true when moisDebut and moisFin are set and disponibleAujourdhui is false', () => {
      expect(component.isHorsSaison(mockCocktailSaisonnier)).toBe(true);
    });

    it('should return false when cocktail has no saisonnalite constraints', () => {
      expect(component.isHorsSaison(mockCocktail)).toBe(false);
    });
  });

  describe('trackById()', () => {
    it('should return item.id when id is defined', () => {
      const item = { id: 42, nom: 'Test' };
      expect(component.trackById(0, item)).toBe(42);
    });

    it('should return index when item has no id', () => {
      const item = { nom: 'No ID' };
      expect(component.trackById(3, item)).toBe(3);
    });
  });

  describe('onAdd()', () => {
    it('should execute without error (stub method)', () => {
      expect(() => component.onAdd()).not.toThrow();
    });
  });

  describe('onEdit()', () => {
    it('should execute without error (stub method)', () => {
      expect(() => component.onEdit(mockCocktail)).not.toThrow();
    });
  });

  describe('onDelete()', () => {
    it('should execute without error (stub method)', () => {
      expect(() => component.onDelete(mockCocktail)).not.toThrow();
    });
  });

  describe('ngOnInit()', () => {
    it('should not throw on init', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('items should remain empty after ngOnInit (load not yet implemented)', () => {
      component.ngOnInit();
      expect(component.items).toEqual([]);
    });
  });
});
