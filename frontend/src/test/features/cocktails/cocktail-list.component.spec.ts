import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { Subject, of, throwError } from 'rxjs';
import { CocktailListComponent } from '../../../app/features/cocktails/cocktail-list/cocktail-list.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
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
  let wsSpy: jasmine.SpyObj<WebSocketService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let storeSpy: jasmine.SpyObj<Store>;
  let router: Router;
  let wsCocktailSubject: Subject<any>;
  let wsCocktailDeleteSubject: Subject<any>;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    wsCocktailSubject = new Subject<any>();
    wsCocktailDeleteSubject = new Subject<any>();

    serviceSpy = jasmine.createSpyObj('CocktailService', ['getAll', 'toggleDisponibilite', 'delete']);
    serviceSpy.getAll.and.returnValue(of(mockCocktails));
    serviceSpy.toggleDisponibilite.and.returnValue(of({ ...mockCocktails[0], disponible: false } as any));
    serviceSpy.delete.and.returnValue(of(undefined as any));

    wsSpy = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsSpy.watch.and.callFake((destination: string) => {
      if (destination === '/topic/cocktails/supprime') {
        return wsCocktailDeleteSubject.asObservable();
      }
      return wsCocktailSubject.asObservable();
    });

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [CocktailListComponent, IonicModule.forRoot(), RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: CocktailService, useValue: serviceSpy },
        { provide: WebSocketService, useValue: wsSpy },
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

  it('charger() displays a toast danger en cas d\'erreur', fakeAsync(() => {
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

  it('filters by category and text search', fakeAsync(() => {
    component.charger(); tick();
    component.selectedCategory = 'SANS_ALCOOL';
    expect(component.filteredCocktails).toHaveSize(1);
    expect(component.filteredCocktails[0].nom).toBe('Virgin Mojito');

    component.searchQuery = 'virgin';
    expect(component.filteredCocktails).toHaveSize(1);
  }));

  // --- Allergens ---

  it('getCocktailAllergens() correctly detects present allergens', () => {
    const cocktailLait: Cocktail = {
      ...mockCocktails[0],
      ingredients: [
        { id: 1, ingredientId: 10, ingredientNom: 'Rhum', quantite: 5, uniteMesure: 'cl' },
        { id: 2, ingredientId: 12, ingredientNom: 'Sour cream', quantite: 3, uniteMesure: 'cl' },
      ],
    };
    const allergens = component.getCocktailAllergens(cocktailLait);
    expect(allergens).toContain('LAIT');
  });

  it('toggleAllergenFilter() adds and removes allergen from excluded filters', () => {
    expect(component.selectedAllergens).toHaveSize(0);
    component.toggleAllergenFilter('LAIT');
    expect(component.selectedAllergens).toContain('LAIT');

    component.toggleAllergenFilter('LAIT');
    expect(component.selectedAllergens).not.toContain('LAIT');
  });

  it('clearAllergenFilters() resets allergen filters', () => {
    component.selectedAllergens = ['LAIT', 'GLUTEN'];
    component.clearAllergenFilters();
    expect(component.selectedAllergens).toHaveSize(0);
  });

  it('filteredCocktails excludes cocktails containing selected allergen', fakeAsync(() => {
    const cocktailLait: Cocktail = {
      ...makeC(10, 'Pina Colada'),
      ingredients: [
        { id: 1, ingredientId: 10, ingredientNom: 'Rhum', quantite: 5, uniteMesure: 'cl' },
        { id: 2, ingredientId: 12, ingredientNom: 'Lait de coco', quantite: 5, uniteMesure: 'cl' },
      ],
    };
    const cocktailNormal: Cocktail = makeC(11, 'Mojito Simple');

    component.cocktails = [cocktailLait, cocktailNormal];
    expect(component.filteredCocktails).toHaveSize(2);

    component.toggleAllergenFilter('LAIT');
    expect(component.filteredCocktails).toHaveSize(1);
    expect(component.filteredCocktails[0].nom).toBe('Mojito Simple');
  }));

  // --- getIngredientsText ---

  it('getIngredientsText() returns bullet-separated ingredients', () => {
    const text = component.getIngredientsText(mockCocktails[0]);
    expect(text).toBe('Rhum · Menthe');
  });

  it('getIngredientsText() returns description if no ingredients', () => {
    const noIng: Cocktail = { ...mockCocktails[0], ingredients: [], description: 'Test desc' };
    expect(component.getIngredientsText(noIng)).toBe('Test desc');
  });

  // --- Category pill styling ---

  it('getCategoryDotColor() returns appropriate color by category', () => {
    expect(component.getCategoryDotColor('ALCOOLISE')).toBe('#10b981');
    expect(component.getCategoryDotColor('SANS_ALCOOL')).toBe('#06b6d4');
    expect(component.getCategoryDotColor('SHOT')).toBe('#84cc16');
    expect(component.getCategoryDotColor('APERITIF')).toBe('#f97316');
    expect(component.getCategoryDotColor('DIGESTIF')).toBe('#ef4444');
    expect(component.getCategoryDotColor('SPECIAL')).toBe('#eab308');
    expect(component.getCategoryDotColor('AUTRE')).toBe('#6366f1');
  });

  it('getCategoryPillStyle() generates active and inactive styles', () => {
    const activeStyle = component.getCategoryPillStyle('ALCOOLISE', true);
    expect(activeStyle['background-color']).toBe('#10b981');

    const inactiveStyle = component.getCategoryPillStyle('ALCOOLISE', false);
    expect(inactiveStyle['color']).toBe('var(--text-primary)');
  });

  // --- toggle availability ---

  it('onToggleDisponibilite() calls service and updates list', fakeAsync(() => {
    component.charger(); tick();
    component.onToggleDisponibilite(mockCocktails[0]);
    tick();
    expect(serviceSpy.toggleDisponibilite).toHaveBeenCalledWith(1);
  }));

  it('onToggleDisponibilite() displays a toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.toggleDisponibilite.and.returnValue(throwError(() => new Error('err')));
    component.onToggleDisponibilite(mockCocktails[0]);
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- delete ---

  it('onDelete() removes cocktail from list and displays success toast', fakeAsync(() => {
    component.charger(); tick();
    component.onDelete(mockCocktails[0]);
    tick();
    flushMicrotasks();
    expect(component.cocktails.find(c => c.id === 1)).toBeUndefined();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('onDelete() displays a toast danger en cas d\'erreur', fakeAsync(() => {
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

  it('onRefresh() reloads cocktails with refresher event', () => {
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

  it('togglePictures() toggles showPictures and saves preference', () => {
    const initial = component.showPictures;
    component.togglePictures();
    expect(component.showPictures).toBe(!initial);
    expect(localStorage.getItem('openbar_show_pictures')).toBe(String(!initial));
  });

  // --- getCocktailImage ---

  it('getCocktailImage() returns fallback glass image when url is empty or legacy', () => {
    expect(component.getCocktailImage({ ...mockCocktails[0], imageUrl: undefined })).toBe('assets/images/verres/verre_tumbler.png');
    expect(component.getCocktailImage({ ...mockCocktails[0], imageUrl: 'assets/images/cocktails/mojito.png' })).toBe('assets/images/verres/verre_tumbler.png');
  });

  it('getCocktailImage() resolves /uploads/ paths with API baseUrl and returns other URLs directly', () => {
    const uploadUrl = component.getCocktailImage({ ...mockCocktails[0], imageUrl: '/uploads/cocktails/mojito.jpg' });
    expect(uploadUrl).toContain('/uploads/cocktails/mojito.jpg');

    const externalUrl = component.getCocktailImage({ ...mockCocktails[0], imageUrl: 'https://example.com/mojito.png' });
    expect(externalUrl).toBe('https://example.com/mojito.png');
  });

  // --- WebSocket Real-Time Synchronization ---

  it('updates an existing cocktail in-place when message is received on /topic/cocktails', () => {
    serviceSpy.getAll.calls.reset();
    const updated = { ...mockCocktails[0], disponible: false, nom: 'Mojito Royal' };
    wsCocktailSubject.next({ body: JSON.stringify(updated) });

    expect(component.cocktails.find(c => c.id === 1)?.disponible).toBeFalse();
    expect(component.cocktails.find(c => c.id === 1)?.nom).toBe('Mojito Royal');
    // Ensure full charger() wasn't triggered
    expect(serviceSpy.getAll).not.toHaveBeenCalled();
  });

  it('prepends a newly created cocktail when received on /topic/cocktails', () => {
    const newCocktail = makeC(99, 'Pina Colada', true);
    wsCocktailSubject.next({ body: JSON.stringify(newCocktail) });

    expect(component.cocktails.find(c => c.id === 99)).toBeDefined();
    expect(component.cocktails[0].nom).toBe('Pina Colada');
  });

  it('removes deleted cocktail when message is received on /topic/cocktails/supprime', () => {
    wsCocktailDeleteSubject.next({ body: JSON.stringify({ id: 1, deleted: true }) });
    expect(component.cocktails.find(c => c.id === 1)).toBeUndefined();
    expect(component.cocktails).toHaveSize(1);
  });

  it('ignores malformed messages on /topic/cocktails gracefully', () => {
    expect(() => {
      wsCocktailSubject.next({ body: 'NOT_VALID_JSON' });
    }).not.toThrow();
    expect(component.cocktails).toHaveSize(2);
  });
});
