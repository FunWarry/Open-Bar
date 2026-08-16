import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { VarianteModalComponent, VarianteSelectionResult } from '../../../app/features/dashboard-serveur/variante-modal/variante-modal.component';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

/** Cocktail with two available variants and one unavailable. */
const mockCocktailWithVariantes: Cocktail = {
  id: 1,
  nom: 'Martini',
  prix: 11,
  categorie: 'ALCOOLISE',
  disponible: true,
  saisonnier: false,
  ingredients: [],
  variantes: [
    { id: 10, nom: 'Martini Dry', description: 'Very dry', prixSupplement: 2, disponible: true },
    { id: 11, nom: 'Martini Rosso', prixSupplement: 0, disponible: true },
    { id: 12, nom: 'Indisponible', prixSupplement: 1, disponible: false },
  ],
  createdAt: '',
  updatedAt: '',
};

/** Cocktail with no variants. */
const mockCocktailNoVariante: Cocktail = {
  id: 2,
  nom: 'Mojito',
  prix: 9.5,
  categorie: 'SANS_ALCOOL',
  disponible: true,
  saisonnier: false,
  ingredients: [],
  variantes: [],
  createdAt: '',
  updatedAt: '',
};

describe('VarianteModalComponent', () => {
  let component: VarianteModalComponent;
  let fixture: ComponentFixture<VarianteModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [
        VarianteModalComponent,
        IonicModule.forRoot(),
        FormsModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VarianteModalComponent);
    component = fixture.componentInstance;
    component.cocktail = mockCocktailWithVariantes;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- ngOnInit ---

  it('ngOnInit() filters out unavailable variants', () => {
    expect(component.variantesDisponibles).toHaveSize(2);
    expect(component.variantesDisponibles.find(v => v.id === 12)).toBeUndefined();
  });

  it('ngOnInit() initialises selectedVarianteId to null (classic)', () => {
    expect(component.selectedVarianteId).toBeNull();
  });

  it('ngOnInit() produces an empty list when cocktail has no variants', () => {
    component.cocktail = mockCocktailNoVariante;
    component.ngOnInit();
    expect(component.variantesDisponibles).toHaveSize(0);
  });

  // --- prixEffectif ---

  it('prixEffectif returns base price when no variant is selected', () => {
    component.selectedVarianteId = null;
    expect(component.prixEffectif).toBe(11);
  });

  it('prixEffectif adds the supplement when a variant is selected', () => {
    component.selectedVarianteId = 10; // supplement = 2
    expect(component.prixEffectif).toBeCloseTo(13, 2);
  });

  it('prixEffectif returns base price when variant supplement is zero', () => {
    component.selectedVarianteId = 11; // supplement = 0
    expect(component.prixEffectif).toBeCloseTo(11, 2);
  });

  it('prixEffectif returns base price for unknown variant id', () => {
    component.selectedVarianteId = 999;
    expect(component.prixEffectif).toBeCloseTo(11, 2);
  });

  // --- supplementLabel ---

  it('supplementLabel returns empty string when no variant is selected', () => {
    component.selectedVarianteId = null;
    expect(component.supplementLabel).toBe('');
  });

  it('supplementLabel returns "+X.XX €" for a positive supplement', () => {
    component.selectedVarianteId = 10; // supplement = 2
    expect(component.supplementLabel).toContain('+');
    expect(component.supplementLabel).toContain('2.00');
  });

  it('supplementLabel returns empty string when supplement is zero', () => {
    component.selectedVarianteId = 11; // supplement = 0
    expect(component.supplementLabel).toBe('');
  });

  // --- confirmer() ---

  it('confirmer() dismisses with role "confirm" and the selected variant', () => {
    component.selectedVarianteId = 10;
    component.notes = 'allergie fraise';
    component.confirmer();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(
      jasmine.objectContaining<VarianteSelectionResult>({
        variante: jasmine.objectContaining({ id: 10 }),
        notes: 'allergie fraise',
        prixEffectif: 13,
      }),
      'confirm',
    );
  });

  it('confirmer() sends variante=null for the classic selection', () => {
    component.selectedVarianteId = null;
    component.notes = '';
    component.confirmer();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(
      jasmine.objectContaining<VarianteSelectionResult>({ variante: null }),
      'confirm',
    );
  });

  it('confirmer() sends notes=undefined when notes field is empty', () => {
    component.selectedVarianteId = null;
    component.notes = '   '; // whitespace only
    component.confirmer();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(
      jasmine.objectContaining<VarianteSelectionResult>({ notes: undefined }),
      'confirm',
    );
  });

  it('confirmer() trims the notes before sending', () => {
    component.notes = '  sans menthe  ';
    component.confirmer();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(
      jasmine.objectContaining<VarianteSelectionResult>({ notes: 'sans menthe' }),
      'confirm',
    );
  });

  // --- annuler() ---

  it('annuler() dismisses with role "cancel" and null data', () => {
    component.annuler();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });
});
