import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { FactureSplitComponent } from '../../../app/features/factures/facture-split/facture-split.component';
import { FactureService, SplitResultDTO } from '../../../app/features/factures/services/facture.service';
import { Facture } from '../../../app/features/factures/models/facture.model';

const mockFacture: Facture = {
  id: 42, tableId: 1, tableNumero: 3, numero: 'F-001',
  total: 21, reglee: false, dateFacture: '2026-06-22T12:00:00Z',
  createdAt: '2026-06-22T12:00:00Z', updatedAt: '2026-06-22T12:00:00Z',
  items: [
    { id: 10, factureId: 42, commandeItemId: 1, description: 'Mojito', quantite: 1, prixUnitaire: 8, total: 8 },
    { id: 11, factureId: 42, commandeItemId: 2, description: 'Daiquiri', quantite: 2, prixUnitaire: 9, total: 18 },
  ],
};

const mockSplitResults: SplitResultDTO[] = [
  { factureId: 42, nomConvive: 'Convive 1', items: [], sousTotal: 10.5, totalAvecPourboire: 10.5 },
  { factureId: 42, nomConvive: 'Convive 2', items: [], sousTotal: 10.5, totalAvecPourboire: 10.5 },
];

describe('FactureSplitComponent', () => {
  let component: FactureSplitComponent;
  let fixture: ComponentFixture<FactureSplitComponent>;
  let factureServiceSpy: jasmine.SpyObj<FactureService>;

  beforeEach(async () => {
    factureServiceSpy = jasmine.createSpyObj<FactureService>('FactureService', [
      'splitEgal', 'splitParSelection', 'getFactureById',
    ]);
    factureServiceSpy.splitEgal.and.returnValue(of(mockSplitResults));
    factureServiceSpy.splitParSelection.and.returnValue(of(mockSplitResults));
    factureServiceSpy.getFactureById.and.returnValue(of(mockFacture));

    await TestBed.configureTestingModule({
      imports: [FactureSplitComponent, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (_: string) => '42' } } },
        },
        { provide: FactureService, useValue: factureServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FactureSplitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize factureId from route param', () => {
    expect(component).toBeTruthy();
    expect(component.factureId).toBe(42);
  });

  it('should initialize with default values', () => {
    expect(component.mode).toBe('egal');
    expect(component.nombreConvives).toBe(2);
    expect(component.results).toEqual([]);
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBeNull();
    expect(component.convives.length).toEqual(2);
  });

  // ── onModeChange ─────────────────────────────────────────────────────────────

  describe('onModeChange()', () => {
    it('should reset results and errorMessage', () => {
      component.results = mockSplitResults;
      component.errorMessage = 'Une erreur';
      component.onModeChange();
      expect(component.results).toEqual([]);
      expect(component.errorMessage).toBeNull();
    });

    it('should load facture when switching to selection mode', () => {
      component.mode = 'selection';
      component.onModeChange();
      expect(factureServiceSpy.getFactureById).toHaveBeenCalledWith(42);
      expect(component.facture).toEqual(mockFacture);
    });

    it('should not reload facture if already loaded', () => {
      component.facture = mockFacture;
      component.mode = 'selection';
      component.onModeChange();
      expect(factureServiceSpy.getFactureById).not.toHaveBeenCalled();
    });
  });

  // ── Mode égal ─────────────────────────────────────────────────────────────────

  describe('ajusterConvives()', () => {
    it('should increase nombreConvives by delta', () => {
      component.nombreConvives = 3;
      component.ajusterConvives(1);
      expect(component.nombreConvives).toBe(4);
    });

    it('should decrease nombreConvives by delta', () => {
      component.nombreConvives = 5;
      component.ajusterConvives(-1);
      expect(component.nombreConvives).toBe(4);
    });

    it('should not go below 2', () => {
      component.nombreConvives = 2;
      component.ajusterConvives(-1);
      expect(component.nombreConvives).toBe(2);
    });

    it('should not exceed 20', () => {
      component.nombreConvives = 20;
      component.ajusterConvives(1);
      expect(component.nombreConvives).toBe(20);
    });
  });

  describe('calculerSplitEgal()', () => {
    it('should call splitEgal and populate results on success', () => {
      component.calculerSplitEgal();
      expect(factureServiceSpy.splitEgal).toHaveBeenCalledWith(42, 2);
      expect(component.results).toEqual(mockSplitResults);
      expect(component.loading).toBeFalse();
    });

    it('should set errorMessage on service error', () => {
      factureServiceSpy.splitEgal.and.returnValue(throwError(() => ({ error: { message: 'Facture introuvable' } })));
      component.calculerSplitEgal();
      expect(component.errorMessage).toBe('Facture introuvable');
      expect(component.loading).toBeFalse();
    });

    it('should use fallback error message when none provided', () => {
      factureServiceSpy.splitEgal.and.returnValue(throwError(() => ({})));
      component.calculerSplitEgal();
      expect(component.errorMessage).toBe('Erreur lors du calcul');
    });
  });

  // ── Mode par article ──────────────────────────────────────────────────────────

  describe('addConvive()', () => {
    it('should add a new empty convive', () => {
      component.addConvive();
      expect(component.convives.length).toEqual(3);
      expect(component.convives[2].nom).toBe('');
    });

    it('should not add more than 20 convives', () => {
      component.convives = Array.from({ length: 20 }, () => ({ nom: '' }));
      component.addConvive();
      expect(component.convives.length).toEqual(20);
    });
  });

  describe('removeConvive()', () => {
    it('should remove convive at given index', () => {
      component.convives = [{ nom: 'Alice' }, { nom: 'Bob' }, { nom: 'Charlie' }];
      component.removeConvive(1);
      expect(component.convives.length).toEqual(2);
      expect(component.convives[1].nom).toBe('Charlie');
    });

    it('should unassign items belonging to the removed convive', () => {
      component.convives = [{ nom: 'Alice' }, { nom: 'Bob' }, { nom: 'Charlie' }];
      component.itemAssignments = { 10: 1, 11: 2 };
      component.removeConvive(1); // supprime Bob
      expect(component.itemAssignments[10]).toBeUndefined();
      expect(component.itemAssignments[11]).toBe(1); // Charlie décalé de 2→1
    });
  });

  describe('conviveNom()', () => {
    it('should return trimmed name when set', () => {
      component.convives = [{ nom: '  Alice  ' }, { nom: '' }];
      expect(component.conviveNom(0)).toBe('Alice');
    });

    it('should return fallback "Convive N" when name is empty', () => {
      component.convives = [{ nom: '' }, { nom: '' }];
      expect(component.conviveNom(1)).toBe('Convive 2');
    });
  });

  describe('tousItemsAssignes getter', () => {
    beforeEach(() => { component.facture = mockFacture; });

    it('should return false when no items are assigned', () => {
      component.itemAssignments = {};
      expect(component.tousItemsAssignes).toBeFalse();
    });

    it('should return false when only some items are assigned', () => {
      component.itemAssignments = { 10: 0 }; // item 11 not assigned
      expect(component.tousItemsAssignes).toBeFalse();
    });

    it('should return true when all items are assigned', () => {
      component.itemAssignments = { 10: 0, 11: 1 };
      expect(component.tousItemsAssignes).toBeTrue();
    });

    it('should return false when facture has no items', () => {
      component.facture = { ...mockFacture, items: [] };
      expect(component.tousItemsAssignes).toBeFalse();
    });
  });

  describe('calculerSplitSelection()', () => {
    beforeEach(() => {
      component.facture = mockFacture;
      component.convives = [{ nom: 'Alice' }, { nom: 'Bob' }];
      component.itemAssignments = { 10: 0, 11: 1 };
    });

    it('should call splitParSelection with correct parts', () => {
      component.calculerSplitSelection();
      expect(factureServiceSpy.splitParSelection).toHaveBeenCalledWith(42, [
        { nomConvive: 'Alice', itemIds: [10] },
        { nomConvive: 'Bob', itemIds: [11] },
      ]);
      expect(component.results).toEqual(mockSplitResults);
    });

    it('should exclude convives with no items', () => {
      component.convives = [{ nom: 'Alice' }, { nom: 'Bob' }, { nom: 'Charlie' }];
      component.itemAssignments = { 10: 0, 11: 0 }; // tout à Alice, Bob et Charlie sans items
      component.calculerSplitSelection();
      const call = factureServiceSpy.splitParSelection.calls.mostRecent().args[1];
      expect(call.find(p => p.nomConvive === 'Bob')).toBeUndefined();
      expect(call.find(p => p.nomConvive === 'Charlie')).toBeUndefined();
    });

    it('should use fallback name for convive with empty nom', () => {
      component.convives = [{ nom: '' }, { nom: 'Bob' }];
      component.calculerSplitSelection();
      const call = factureServiceSpy.splitParSelection.calls.mostRecent().args[1];
      expect(call[0].nomConvive).toBe('Convive 1');
    });

    it('should set errorMessage on service error', () => {
      factureServiceSpy.splitParSelection.and.returnValue(throwError(() => ({ error: { message: 'Erreur serveur' } })));
      component.calculerSplitSelection();
      expect(component.errorMessage).toBe('Erreur serveur');
      expect(component.loading).toBeFalse();
    });

    it('should do nothing if facture is null', () => {
      component.facture = null;
      component.calculerSplitSelection();
      expect(factureServiceSpy.splitParSelection).not.toHaveBeenCalled();
    });
  });

  // ── totalSplit ────────────────────────────────────────────────────────────────

  describe('totalSplit getter', () => {
    it('should return 0 when results is empty', () => {
      component.results = [];
      expect(component.totalSplit).toBe(0);
    });

    it('should sum all sousTotal values', () => {
      component.results = mockSplitResults;
      expect(component.totalSplit).toBe(21);
    });
  });
});
