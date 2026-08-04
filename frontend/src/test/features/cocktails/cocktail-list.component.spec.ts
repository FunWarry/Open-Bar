import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { CocktailListComponent } from '../../../app/features/cocktails/cocktail-list/cocktail-list.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { Cocktail, CocktailCategorie } from '../../../app/core/models/cocktail.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const makeC = (id: number, nom: string, disponible = true, categorie: CocktailCategorie = 'ALCOOLISE'): Cocktail => ({
  id, nom, prix: 8, categorie, disponible,
  description: 'Cocktail test',
  saisonnier: false,
  ingredients: [
    { id: 1, ingredientId: 10, ingredientNom: 'Rhum', quantite: 5, uniteMesure: 'cl' },
    { id: 2, ingredientId: 11, ingredientNom: 'Menthe', quantite: 3, uniteMesure: 'feuilles' }
  ],
  variantes: [],
  createdAt: '', updatedAt: '',
});

const mockCocktails: Cocktail[] = [
  makeC(1, 'Mojito', true, 'ALCOOLISE'),
  makeC(2, 'Virgin Mojito', false, 'SANS_ALCOOL'),
];

const mockSaisonnier: Cocktail = {
  id: 3, nom: 'Sangria', prix: 7, categorie: 'ALCOOLISE', disponible: true,
  saisonnier: true, dateDebutSaison: '2024-06-01', dateFinSaison: '2024-08-31',
  moisDebut: 6, moisFin: 8, disponibleAujourdhui: false,
  ingredients: [], variantes: [], createdAt: '', updatedAt: '',
};

describe('CocktailListComponent', () => {
  let component: CocktailListComponent;
  let fixture: ComponentFixture<CocktailListComponent>;
  let serviceSpy: jasmine.SpyObj<CocktailService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let storeSpy: jasmine.SpyObj<Store>;
  let router: Router;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('CocktailService', ['getAll', 'toggleDisponibilite', 'delete']);
    serviceSpy.getAll.and.returnValue(of(mockCocktails));
    serviceSpy.toggleDisponibilite.and.returnValue(of({ ...mockCocktails[0], disponible: false } as any));
    serviceSpy.delete.and.returnValue(of(undefined as any));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [CocktailListComponent, IonicModule.forRoot(), RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: CocktailService, useValue: serviceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(CocktailListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => expect(component).toBeTruthy());

  // --- charger() ---

  it('charger() peuple cocktails et filteredCocktails', fakeAsync(() => {
    component.charger();
    tick();
    expect(component.cocktails).toHaveSize(2);
    expect(component.filteredCocktails).toHaveSize(2);
  }));

  it('charger() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- filtres ---

  it('filtre "disponibles" ne garde que les cocktails disponibles', fakeAsync(() => {
    component.charger(); tick();
    component.filtre = 'disponibles';
    expect(component.filteredCocktails.every(c => c.disponible)).toBeTrue();
  }));

  it('filtre "indisponibles" ne garde que les cocktails indisponibles', fakeAsync(() => {
    component.charger(); tick();
    component.filtre = 'indisponibles';
    expect(component.filteredCocktails.every(c => !c.disponible)).toBeTrue();
  }));

  it('filtre "tous" garde tous les cocktails', fakeAsync(() => {
    component.charger(); tick();
    component.filtre = 'indisponibles';
    component.filtre = 'tous';
    expect(component.filteredCocktails).toHaveSize(2);
  }));

  it('filtre par catégorie et recherche textuelle', fakeAsync(() => {
    component.charger(); tick();
    component.selectedCategory = 'SANS_ALCOOL';
    expect(component.filteredCocktails).toHaveSize(1);
    expect(component.filteredCocktails[0].nom).toBe('Virgin Mojito');

    component.searchQuery = 'virgin';
    expect(component.filteredCocktails).toHaveSize(1);
  }));

  // --- getIngredientsText ---

  it('getIngredientsText() retourne les ingrédients séparés par des puces', () => {
    const text = component.getIngredientsText(mockCocktails[0]);
    expect(text).toBe('Rhum · Menthe');
  });

  it('getIngredientsText() retourne la description si pas d\'ingrédients', () => {
    const noIng: Cocktail = { ...mockCocktails[0], ingredients: [], description: 'Test desc' };
    expect(component.getIngredientsText(noIng)).toBe('Test desc');
  });

  // --- Category pill styling ---

  it('getCategoryDotColor() retourne la couleur appropriée selon la catégorie', () => {
    expect(component.getCategoryDotColor('ALCOOLISE')).toBe('#10b981');
    expect(component.getCategoryDotColor('SANS_ALCOOL')).toBe('#06b6d4');
    expect(component.getCategoryDotColor('SHOT')).toBe('#84cc16');
    expect(component.getCategoryDotColor('APERITIF')).toBe('#f97316');
    expect(component.getCategoryDotColor('DIGESTIF')).toBe('#ef4444');
    expect(component.getCategoryDotColor('SPECIAL')).toBe('#eab308');
    expect(component.getCategoryDotColor('AUTRE')).toBe('#6366f1');
  });

  it('getCategoryPillStyle() génère les styles actifs et inactifs', () => {
    const activeStyle = component.getCategoryPillStyle('ALCOOLISE', true);
    expect(activeStyle['background-color']).toBe('#10b981');

    const inactiveStyle = component.getCategoryPillStyle('ALCOOLISE', false);
    expect(inactiveStyle['color']).toBe('#ffffff');
  });

  // --- toggle disponibilité ---

  it('onToggleDisponibilite() appelle le service et met à jour la liste', fakeAsync(() => {
    component.charger(); tick();
    component.onToggleDisponibilite(mockCocktails[0]);
    tick();
    expect(serviceSpy.toggleDisponibilite).toHaveBeenCalledWith(1);
  }));

  it('onToggleDisponibilite() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.toggleDisponibilite.and.returnValue(throwError(() => new Error('err')));
    component.onToggleDisponibilite(mockCocktails[0]);
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- delete ---

  it('onDelete() retire le cocktail de la liste et affiche un toast de succès', fakeAsync(() => {
    component.charger(); tick();
    component.onDelete(mockCocktails[0]);
    tick();
    flushMicrotasks();
    expect(component.cocktails.find(c => c.id === 1)).toBeUndefined();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('onDelete() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.delete.and.returnValue(throwError(() => new Error('err')));
    component.onDelete(mockCocktails[0]);
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- navigation & refresh ---

  it('onAdd() navigue vers /cocktails/new', () => {
    spyOn(router, 'navigate');
    component.onAdd();
    expect(router.navigate).toHaveBeenCalledWith(['/cocktails/new']);
  });

  it('onEdit() navigue vers /cocktails/:id/edit', () => {
    spyOn(router, 'navigate');
    component.onEdit(mockCocktails[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/cocktails', 1, 'edit']);
  });

  it('onRefresh() recharge les cocktails avec l\'événement refresher', () => {
    const event = { target: { complete: jasmine.createSpy('complete') } };
    component.onRefresh(event);
    expect(serviceSpy.getAll).toHaveBeenCalled();
  });

  it('trackById() retourne l\'id du cocktail', () => {
    expect(component.trackById(0, mockCocktails[0])).toBe(1);
  });

  // --- isHorsSaison ---

  it('isHorsSaison() retourne true pour un cocktail hors saison', () => {
    expect(component.isHorsSaison(mockSaisonnier)).toBeTrue();
  });

  it('isHorsSaison() retourne false pour un cocktail non saisonnier', () => {
    expect(component.isHorsSaison(mockCocktails[0])).toBeFalse();
  });

  // --- toggle pictures ---

  it('togglePictures() inverse showPictures et sauvegarde la préférence', () => {
    const initial = component.showPictures;
    component.togglePictures();
    expect(component.showPictures).toBe(!initial);
    expect(localStorage.getItem('openbar_show_pictures')).toBe(String(!initial));
  });
});
