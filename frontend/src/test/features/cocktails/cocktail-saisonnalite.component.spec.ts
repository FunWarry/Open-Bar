import { getTranslocoTestingModule } from '../../transloco-testing.module';
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
      , getTranslocoTestingModule()],
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

  it('ngOnInit() initializes touteAnnee=false when moisDebut and moisFin are set', () => {
    component.cocktail = { ...mockCocktail, moisDebut: 3, moisFin: 9 };
    component.ngOnInit();
    expect(component.touteAnnee).toBeFalse();
    expect(component.moisDebut).toBe(3);
    expect(component.moisFin).toBe(9);
  });

  it('ngOnInit() initializes touteAnnee=false when only moisDebut is set', () => {
    component.cocktail = { ...mockCocktail, moisDebut: 6, moisFin: null };
    component.ngOnInit();
    expect(component.touteAnnee).toBeFalse();
  });

  // ── onTouteAnneeChange ───────────────────────────────────────────────────────

  it('onTouteAnneeChange() resets moisDebut and moisFin to null when touteAnnee=true', () => {
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

  it('isMoisActif() returns true for month in simple period (same year)', () => {
    component.moisDebut = 3;
    component.moisFin = 9;
    expect(component.isMoisActif(3)).toBeTrue();
    expect(component.isMoisActif(6)).toBeTrue();
    expect(component.isMoisActif(9)).toBeTrue();
  });

  it('isMoisActif() returns false for month outside simple period', () => {
    component.moisDebut = 3;
    component.moisFin = 9;
    expect(component.isMoisActif(1)).toBeFalse();
    expect(component.isMoisActif(10)).toBeFalse();
  });

  it('isMoisActif() handles year rollover (e.g. Oct -> Feb)', () => {
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

  it('isDisponibleAujourdhui returns true when current month is in active period', () => {
    component.moisDebut = 1;
    component.moisFin = 12;
    expect(component.isDisponibleAujourdhui).toBeTrue();
  });

  it('isDisponibleAujourdhui retourne false quand le mois courant est hors saison', () => {
    // Force current month to a known value for deterministic testing
    component.moisCourant = 7;
    component.moisDebut = 10;
    component.moisFin = 3;
    // Period Oct->Mar: July is out of season
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

  it('sauvegarder() emits updated event with updated cocktail', () => {
    const updatedCocktail: Cocktail = { ...mockCocktail, moisDebut: 4, moisFin: 9 };
    cocktailServiceSpy.updateSaisonnalite.and.returnValue(of(updatedCocktail));
    spyOn(component.updated, 'emit');

    component.sauvegarder();

    expect(component.updated.emit).toHaveBeenCalledOnceWith(updatedCocktail);
  });

  it('sauvegarder() resets saving=false after success', () => {
    const updatedCocktail: Cocktail = { ...mockCocktail };
    cocktailServiceSpy.updateSaisonnalite.and.returnValue(of(updatedCocktail));

    component.sauvegarder();

    expect(component.saving).toBeFalse();
  });

  it('sauvegarder() remet saving=false en cas d\'erreur', () => {
    cocktailServiceSpy.updateSaisonnalite.and.returnValue(throwError(() => new Error('Network error')));

    component.sauvegarder();

    expect(component.saving).toBeFalse();
  });

  it('sauvegarder() does not trigger updated.emit on error', () => {
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
    expect(component.listeMois).toHaveSize(12);
    expect(component.listeMois[0].value).toBe(1);
    expect(component.listeMois[11].value).toBe(12);
  });
});
