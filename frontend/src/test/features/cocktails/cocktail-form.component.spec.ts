import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { CocktailFormComponent } from '../../../app/features/cocktails/cocktail-form/cocktail-form.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockCocktail: Cocktail = {
  id: 42,
  nom: 'Mojito',
  description: 'Cocktail cubain',
  prix: 9.5,
  categorie: 'SANS_ALCOOL',
  disponible: true,
  saisonnier: false,
  ingredients: [],
  variantes: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

describe('CocktailFormComponent', () => {
  let component: CocktailFormComponent;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const toastMock = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  const buildModule = async (routeId: string | null = null) => {
    cocktailServiceSpy = jasmine.createSpyObj('CocktailService', [
      'getAll', 'getById', 'create', 'update', 'delete',
      'toggleDisponibilite', 'search', 'getDisponibles', 'updateSaisonnalite', 'uploadImage'
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastMock as any));

    cocktailServiceSpy.create.and.returnValue(of(mockCocktail as any));
    cocktailServiceSpy.update.and.returnValue(of(mockCocktail as any));
    cocktailServiceSpy.uploadImage.and.returnValue(of(mockCocktail as any));
    if (routeId) {
      cocktailServiceSpy.getById.and.returnValue(of(mockCocktail));
    }

    await TestBed.configureTestingModule({
      imports: [
        CocktailFormComponent,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? routeId : null)
              }
            }
          }
        },
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: CocktailService, useValue: cocktailServiceSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(CocktailFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('mode création (sans id dans la route)', () => {
    beforeEach(async () => buildModule(null));

    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('isEditMode est false et cocktailId est null en mode création', () => {
      expect(component.isEditMode).toBeFalse();
      expect(component.cocktailId).toBeNull();
    });

    it('le formulaire est initialisé avec des valeurs par défaut', () => {
      const form = component.cocktailForm;
      expect(form.get('name')?.value).toBe('');
      expect(form.get('description')?.value).toBe('');
      expect(form.get('price')?.value).toBe(0);
      expect(form.get('category')?.value).toBe('');
    });

    it('le formulaire est invalide si les champs requis sont vides', () => {
      expect(component.cocktailForm.valid).toBeFalse();
    });

    it('le formulaire est valide quand tous les champs requis sont remplis', () => {
      component.cocktailForm.setValue({
        name: 'Mojito',
        description: 'Cocktail cubain',
        price: 9.5,
        category: 'SANS_ALCOOL'
      });
      expect(component.cocktailForm.valid).toBeTrue();
    });

    it('onSubmit() avec formulaire valide affiche un toast et navigue vers /cocktails', async () => {
      component.cocktailForm.setValue({
        name: 'Mojito',
        description: 'Cocktail cubain',
        price: 9.5,
        category: 'SANS_ALCOOL'
      });
      component.onSubmit();
      await Promise.resolve();
      expect(toastCtrlSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ message: 'Opération réussie', color: 'success' })
      );
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/cocktails']);
    });

    it('onSubmit() avec formulaire invalide ne navigue pas et ne crée pas de toast', () => {
      component.onSubmit();
      expect(toastCtrlSpy.create).not.toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('getById() ne doit pas être appelé en mode création', () => {
      expect(cocktailServiceSpy.getById).not.toHaveBeenCalled();
    });
  });

  describe('mode édition (avec id dans la route)', () => {
    beforeEach(async () => buildModule('42'));

    it('should create the component en mode édition', () => {
      expect(component).toBeTruthy();
    });

    it('isEditMode est true et cocktailId vaut 42', () => {
      expect(component.isEditMode).toBeTrue();
      expect(component.cocktailId).toBe(42);
    });

    it('getById() est appelé avec l\'id de la route au ngOnInit', () => {
      expect(cocktailServiceSpy.getById).toHaveBeenCalledWith(42);
    });

    it('le formulaire est pré-rempli avec les données du cocktail chargé', () => {
      expect(component.cocktailForm.get('name')?.value).toBe('Mojito');
      expect(component.cocktailForm.get('description')?.value).toBe('Cocktail cubain');
      expect(component.cocktailForm.get('price')?.value).toBe(9.5);
      expect(component.cocktailForm.get('category')?.value).toBe('SANS_ALCOOL');
    });

    it('cocktailData est alimenté avec la réponse du service', () => {
      expect(component.cocktailData).toEqual(mockCocktail);
    });
  });

  describe('onSaisonnaliteUpdated()', () => {
    beforeEach(async () => buildModule(null));

    it('met à jour cocktailData avec le cocktail reçu', async () => {
      const updated: Cocktail = { ...mockCocktail, moisDebut: 6, moisFin: 8, saisonnier: true, dateDebutSaison: '2024-06-01', dateFinSaison: '2024-08-31' };
      component.onSaisonnaliteUpdated(updated);
      await Promise.resolve();
      expect(component.cocktailData).toEqual(updated);
      expect(toastCtrlSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ message: 'Opération réussie' })
      );
    });
  });

  describe('validation du champ price', () => {
    beforeEach(async () => buildModule(null));

    it('le champ price est invalide si la valeur est négative', () => {
      component.cocktailForm.get('price')?.setValue(-1);
      expect(component.cocktailForm.get('price')?.valid).toBeFalse();
    });

    it('le champ price est valide si la valeur est 0', () => {
      component.cocktailForm.get('price')?.setValue(0);
      expect(component.cocktailForm.get('price')?.valid).toBeTrue();
    });

    it('le champ price est valide pour une valeur positive', () => {
      component.cocktailForm.get('price')?.setValue(12.5);
      expect(component.cocktailForm.get('price')?.valid).toBeTrue();
    });
  });

  describe('gestion d\'erreur lors du chargement en mode édition', () => {
    it('cocktailData reste null si getById retourne une erreur', async () => {
      cocktailServiceSpy = jasmine.createSpyObj('CocktailService', [
        'getAll', 'getById', 'create', 'update', 'delete',
        'toggleDisponibilite', 'search', 'getDisponibles', 'updateSaisonnalite'
      ]);
      cocktailServiceSpy.getById.and.returnValue(throwError(() => new Error('Not found')));
      routerSpy = jasmine.createSpyObj('Router', ['navigate']);
      toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
      toastCtrlSpy.create.and.returnValue(Promise.resolve(toastMock as any));

      await TestBed.configureTestingModule({
        imports: [CocktailFormComponent, RouterTestingModule, getTranslocoTestingModule()],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { paramMap: { get: (key: string) => (key === 'id' ? '99' : null) } }
            }
          },
          { provide: Router, useValue: routerSpy },
          { provide: ToastController, useValue: toastCtrlSpy },
          { provide: CocktailService, useValue: cocktailServiceSpy }
        ]
      }).compileComponents();

      const fixture = TestBed.createComponent(CocktailFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.cocktailData).toBeNull();
    });
  });
});
