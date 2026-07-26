import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { CocktailSaisonnaliteComponent } from '../../../app/features/cocktails/cocktail-saisonnalite/cocktail-saisonnalite.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { Cocktail } from '../../../app/core/models/cocktail.model';

const mockCocktail: Cocktail = {
  id: 1,
  nom: 'Mojito',
  prix: 8.5,
  disponible: true,
  moisDebut: null,
  moisFin: null
} as Cocktail;

describe('CocktailSaisonnaliteComponent', () => {
  let component: CocktailSaisonnaliteComponent;
  let fixture: ComponentFixture<CocktailSaisonnaliteComponent>;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;

  beforeEach(async () => {
    cocktailServiceSpy = jasmine.createSpyObj('CocktailService', ['updateSaisonnalite']);

    await TestBed.configureTestingModule({
      imports: [
        CocktailSaisonnaliteComponent,
        IonicModule.forRoot(),
        RouterTestingModule
      ],
      providers: [
        { provide: CocktailService, useValue: cocktailServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CocktailSaisonnaliteComponent);
    component = fixture.componentInstance;
    component.cocktail = { ...mockCocktail };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ngOnInit ────────────────────────────────────────────────────────────────

  it('ngOnInit() initialise touteAnnee=true quand moisDebut et moisFin sont null', () => {
    component.cocktail = { ...mockCocktail, moisDebut: null, moisFin: null };
    component.ngOnInit();
    expect(component.touteAnnee).toBeTrue();
    expect(component.moisDebut).toBeNull();
    expect(component.moisFin).toBeNull();
  });

  it('ngOnInit() initialise touteAnnee=false quand moisDebut et moisFin sont définis', () => {
    component.cocktail = { ...mockCocktail, moisDebut: 3, moisFin: 9 };
    component.ngOnInit();
    expect(component.touteAnnee).toBeFalse();
    expect(component.moisDebut).toBe(3);
    expect(component.moisFin).toBe(9);
  });

  it('ngOnInit() initialise touteAnnee=false quand seulement moisDebut est défini', () => {
    component.cocktail = { ...mockCocktail, moisDebut: 6, moisFin: null };
    component.ngOnInit();
    expect(component.touteAnnee).toBeFalse();
  });

  // ── onTouteAnneeChange ───────────────────────────────────────────────────────

  it('onTouteAnneeChange() remet moisDebut et moisFin à null quand touteAnnee=true', () => {
    component.moisDebut = 4;
    component.moisFin = 8;
    component.touteAnnee = true;
    component.onTouteAnneeChange();
    expect(component.moisDebut).toBeNull();
    expect(component.moisFin).toBeNull();
  });

  it('onTouteAnneeChange() ne modifie pas les mois quand touteAnnee=false', () => {
    component.moisDebut = 4;
    component.moisFin = 8;
    component.touteAnnee = false;
    component.onTouteAnneeChange();
    expect(component.moisDebut).toBe(4);
    expect(component.moisFin).toBe(8);
  });

  // ── isMoisActif ──────────────────────────────────────────────────────────────

  it('isMoisActif() retourne false si moisDebut ou moisFin est null', () => {
    component.moisDebut = null;
    component.moisFin = null;
    expect(component.isMoisActif(5)).toBeFalse();
  });

  it('isMoisActif() retourne true pour un mois dans la période simple (même année)', () => {
    component.moisDebut = 3;
    component.moisFin = 9;
    expect(component.isMoisActif(3)).toBeTrue();
    expect(component.isMoisActif(6)).toBeTrue();
    expect(component.isMoisActif(9)).toBeTrue();
  });

  it('isMoisActif() retourne false pour un mois hors de la période simple', () => {
    component.moisDebut = 3;
    component.moisFin = 9;
    expect(component.isMoisActif(1)).toBeFalse();
    expect(component.isMoisActif(10)).toBeFalse();
  });

  it('isMoisActif() gère le chevauchement d\'année (ex: Oct → Fév)', () => {
    component.moisDebut = 10;
    component.moisFin = 2;
    expect(component.isMoisActif(10)).toBeTrue();
    expect(component.isMoisActif(12)).toBeTrue();
    expect(component.isMoisActif(1)).toBeTrue();
    expect(component.isMoisActif(2)).toBeTrue();
    expect(component.isMoisActif(5)).toBeFalse();
  });

  // ── isDisponibleAujourdhui ───────────────────────────────────────────────────

  it('isDisponibleAujourdhui retourne true si moisDebut ou moisFin est null', () => {
    component.moisDebut = null;
    component.moisFin = null;
    expect(component.isDisponibleAujourdhui).toBeTrue();
  });

  it('isDisponibleAujourdhui retourne true quand le mois courant est dans la période', () => {
    component.moisDebut = 1;
    component.moisFin = 12;
    expect(component.isDisponibleAujourdhui).toBeTrue();
  });

  it('isDisponibleAujourdhui retourne false quand le mois courant est hors saison', () => {
    // Forcer moisCourant à une valeur connue pour rendre le test déterministe
    component.moisCourant = 7;
    component.moisDebut = 10;
    component.moisFin = 3;
    // Période Oct→Mars : juillet est hors saison
    expect(component.isDisponibleAujourdhui).toBeFalse();
  });

  // ── sauvegarder ──────────────────────────────────────────────────────────────

  it('sauvegarder() appelle updateSaisonnalite avec les bons arguments', () => {
    const updatedCocktail: Cocktail = { ...mockCocktail, moisDebut: 4, moisFin: 9 };
    cocktailServiceSpy.updateSaisonnalite.and.returnValue(of(updatedCocktail));
    component.moisDebut = 4;
    component.moisFin = 9;

    component.sauvegarder();

    expect(cocktailServiceSpy.updateSaisonnalite).toHaveBeenCalledOnceWith(mockCocktail.id, 4, 9);
  });

  it('sauvegarder() emet l\'événement updated avec le cocktail mis à jour', () => {
    const updatedCocktail: Cocktail = { ...mockCocktail, moisDebut: 4, moisFin: 9 };
    cocktailServiceSpy.updateSaisonnalite.and.returnValue(of(updatedCocktail));
    spyOn(component.updated, 'emit');

    component.sauvegarder();

    expect(component.updated.emit).toHaveBeenCalledOnceWith(updatedCocktail);
  });

  it('sauvegarder() remet saving=false après succès', () => {
    const updatedCocktail: Cocktail = { ...mockCocktail };
    cocktailServiceSpy.updateSaisonnalite.and.returnValue(of(updatedCocktail));

    component.sauvegarder();

    expect(component.saving).toBeFalse();
  });

  it('sauvegarder() remet saving=false en cas d\'erreur', () => {
    cocktailServiceSpy.updateSaisonnalite.and.returnValue(throwError(() => new Error('Erreur réseau')));

    component.sauvegarder();

    expect(component.saving).toBeFalse();
  });

  it('sauvegarder() ne déclenche pas updated.emit en cas d\'erreur', () => {
    cocktailServiceSpy.updateSaisonnalite.and.returnValue(throwError(() => new Error('500')));
    spyOn(component.updated, 'emit');

    component.sauvegarder();

    expect(component.updated.emit).not.toHaveBeenCalled();
  });

  it('sauvegarder() passe null pour moisDebut et moisFin si touteAnnee=true', () => {
    const updatedCocktail: Cocktail = { ...mockCocktail };
    cocktailServiceSpy.updateSaisonnalite.and.returnValue(of(updatedCocktail));
    component.touteAnnee = true;
    component.moisDebut = null;
    component.moisFin = null;

    component.sauvegarder();

    expect(cocktailServiceSpy.updateSaisonnalite).toHaveBeenCalledOnceWith(mockCocktail.id, null, null);
  });

  // ── listeMois ────────────────────────────────────────────────────────────────

  it('listeMois contient bien les 12 mois', () => {
    expect(component.listeMois.length).toEqual(12);
    expect(component.listeMois[0].value).toBe(1);
    expect(component.listeMois[11].value).toBe(12);
  });
});
