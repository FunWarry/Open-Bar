import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { CocktailListComponent } from '../../../app/features/cocktails/cocktail-list/cocktail-list.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { Cocktail } from '../../../app/core/models/cocktail.model';

const makeC = (id: number, nom: string, disponible = true): Cocktail => ({
  id, nom, prix: 8, categorie: 'ALCOOLISE', disponible,
  saisonnier: false, ingredients: [], variantes: [], createdAt: '', updatedAt: '',
});

const mockCocktails: Cocktail[] = [
  makeC(1, 'Mojito', true),
  makeC(2, 'Martini', false),
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
      imports: [CocktailListComponent, IonicModule.forRoot(), RouterTestingModule],
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
    expect(component.cocktails.length).toBe(2);
    expect(component.filteredCocktails.length).toBe(2);
  }));

  it('charger() affiche un toast danger en cas d\'erreur', fakeAsync(async () => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    await Promise.resolve();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- filtres ---

  it('onFiltreChange("disponibles") ne garde que les cocktails disponibles', fakeAsync(() => {
    component.charger(); tick();
    component.onFiltreChange({ detail: { value: 'disponibles' } });
    expect(component.filteredCocktails.every(c => c.disponible)).toBeTrue();
  }));

  it('onFiltreChange("indisponibles") ne garde que les cocktails indisponibles', fakeAsync(() => {
    component.charger(); tick();
    component.onFiltreChange({ detail: { value: 'indisponibles' } });
    expect(component.filteredCocktails.every(c => !c.disponible)).toBeTrue();
  }));

  it('onFiltreChange("tous") garde tous les cocktails', fakeAsync(() => {
    component.charger(); tick();
    component.onFiltreChange({ detail: { value: 'indisponibles' } });
    component.onFiltreChange({ detail: { value: 'tous' } });
    expect(component.filteredCocktails.length).toBe(2);
  }));

  // --- toggle disponibilité ---

  it('onToggleDisponibilite() appelle le service et met à jour la liste', fakeAsync(() => {
    component.charger(); tick();
    component.onToggleDisponibilite(mockCocktails[0]);
    tick();
    expect(serviceSpy.toggleDisponibilite).toHaveBeenCalledWith(1);
  }));

  // --- delete ---

  it('onDelete() retire le cocktail de la liste', fakeAsync(() => {
    component.charger(); tick();
    component.onDelete(mockCocktails[0]);
    tick();
    expect(component.cocktails.find(c => c.id === 1)).toBeUndefined();
  }));

  // --- navigation ---

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

  // --- isHorsSaison ---

  it('isHorsSaison() retourne true pour un cocktail hors saison', () => {
    expect(component.isHorsSaison(mockSaisonnier)).toBeTrue();
  });

  it('isHorsSaison() retourne false pour un cocktail non saisonnier', () => {
    expect(component.isHorsSaison(mockCocktails[0])).toBeFalse();
  });

  // --- trackById ---

  it('trackById retourne l\'id du cocktail', () => {
    expect(component.trackById(0, mockCocktails[0])).toBe(1);
  });
});
