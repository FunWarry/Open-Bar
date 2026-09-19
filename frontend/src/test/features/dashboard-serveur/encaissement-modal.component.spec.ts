import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { ModalController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { EncaissementModalComponent } from '../../../app/features/dashboard-serveur/components/encaissement-modal/encaissement-modal.component';
import {
  DashboardServeurService,
  TableAdditionResponse,
  TableAdditionItem
} from '../../../app/features/dashboard-serveur/services/dashboard-serveur.service';
import { FactureService, SplitResultDTO } from '../../../app/features/factures/services/facture.service';
import { BarTabService } from '../../../app/core/services/bar-tab.service';
import { TableView } from '../../../app/features/dashboard-serveur/models/table-view.model';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AppSettingsService } from '../../../app/core/services/app-settings.service';
import {
  DEFAULT_EUR_DENOMINATIONS,
  DEFAULT_USD_DENOMINATIONS,
  DEFAULT_CHF_DENOMINATIONS,
  DEFAULT_JPY_DENOMINATIONS
} from '../../../app/core/models/cash-denomination.model';

describe('EncaissementModalComponent', () => {
  let component: EncaissementModalComponent;
  let fixture: ComponentFixture<EncaissementModalComponent>;
  let appSettingsService: AppSettingsService;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: { present: jasmine.Spy };
  let dashboardServiceSpy: jasmine.SpyObj<DashboardServeurService>;
  let factureServiceSpy: jasmine.SpyObj<FactureService>;
  let barTabServiceSpy: jasmine.SpyObj<BarTabService>;

  const mockTable: TableView = {
    id: 1,
    nom: 'Table 1',
    zone: 'Terrasse',
    capacite: 4,
    occupee: true,
    commandesActives: []
  };

  const mockItems: TableAdditionItem[] = [
    {
      itemId: 101,
      commandeId: 10,
      cocktailId: 5,
      cocktailNom: 'Mojito',
      varianteNom: 'Fraise',
      quantite: 2,
      prixUnitaire: 9.0,
      total: 18.0,
      priceHT: 15.0,
      vatAmount: 3.0,
      vatRate: '20%'
    },
    {
      itemId: 102,
      commandeId: 10,
      cocktailId: 6,
      cocktailNom: 'Piña Colada',
      quantite: 1,
      prixUnitaire: 10.0,
      total: 10.0,
      priceHT: 8.33,
      vatAmount: 1.67,
      vatRate: '20%'
    }
  ];

  const mockAddition: TableAdditionResponse = {
    tableId: 1,
    tableNumero: 1,
    zone: 'Terrasse',
    serveurId: 2,
    serveurNom: 'Jean Dupont',
    dateOccupation: '2026-08-15T20:00:00',
    items: mockItems,
    commandeIds: [10],
    totalHT: 23.33,
    totalVAT: 4.67,
    totalTTC: 28.0,
    nombreArticles: 3,
    hasUnpaidFacture: false
  };

  beforeEach(() => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    toastSpy = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy as any));

    dashboardServiceSpy = jasmine.createSpyObj('DashboardServeurService', [
      'getTableAddition',
      'encaisserTable'
    ]);
    dashboardServiceSpy.getTableAddition.and.returnValue(of(mockAddition));
    dashboardServiceSpy.encaisserTable.and.returnValue(of({
      id: 50,
      numero: 'FAC-2026-00050',
      totalTTC: 28.0,
      reglee: true
    } as any));

    factureServiceSpy = jasmine.createSpyObj('FactureService', ['getFacturesByTable', 'genererFactureTable', 'genererFactureTab']);
    barTabServiceSpy = jasmine.createSpyObj('BarTabService', ['getTabAddition', 'encaisserTab']);

    TestBed.configureTestingModule({
      imports: [
        EncaissementModalComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: {}, en: {} },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' }
        })
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: DashboardServeurService, useValue: dashboardServiceSpy },
        { provide: FactureService, useValue: factureServiceSpy },
        { provide: BarTabService, useValue: barTabServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EncaissementModalComponent);
    component = fixture.componentInstance;
    component.table = mockTable;
    appSettingsService = TestBed.inject(AppSettingsService);
  });

  it('should initialize and load table addition details', () => {
    component.ngOnInit();
    expect(dashboardServiceSpy.getTableAddition).toHaveBeenCalledWith(1);
    expect(component.addition).toEqual(mockAddition);
    expect(component.isLoading).toBeFalse();
    expect(component.subTotalTTC).toBe(28.0);
    expect(component.totalHT).toBe(23.33);
    expect(component.totalVAT).toBe(4.67);
  });

  it('should handle addition loading error', () => {
    dashboardServiceSpy.getTableAddition.and.returnValue(throwError(() => new Error('Server error')));
    component.ngOnInit();
    expect(component.errorMessage).toBeTruthy();
    expect(component.addition).toBeNull();
  });

  it('should compute commercial discount percentage and fixed amount correctly', () => {
    component.addition = mockAddition;

    component.setDiscountMode('percent');
    component.discountPercent = 10;
    expect(component.discountAmount).toBe(2.8);
    expect(component.netTotalBeforeTip).toBe(25.2);

    component.setDiscountMode('fixed');
    component.discountFixed = 5.0;
    expect(component.discountAmount).toBe(5.0);
    expect(component.netTotalBeforeTip).toBe(23.0);
  });

  it('should compute server tips (+5%, +10%, custom) correctly', () => {
    component.addition = mockAddition;

    component.setTipMode('5pct');
    expect(component.pourboire).toBe(1.4);
    expect(component.totalNetAPayer).toBe(29.4);

    component.setTipMode('10pct');
    expect(component.pourboire).toBe(2.8);
    expect(component.totalNetAPayer).toBe(30.8);

    component.setTipMode('custom');
    component.customTip = 3.5;
    expect(component.pourboire).toBe(3.5);
    expect(component.totalNetAPayer).toBe(31.5);
  });

  it('should return primary cash increments dynamically for EUR', () => {
    spyOnProperty(appSettingsService, 'currencyCode', 'get').and.returnValue('EUR');
    spyOn(appSettingsService, 'getCashDenominations').and.returnValue(DEFAULT_EUR_DENOMINATIONS);
    expect(component.primaryCashIncrements).toEqual([5, 10, 20, 50, 100]);
  });

  it('should return primary cash increments dynamically for USD, CHF, and JPY', () => {
    spyOnProperty(appSettingsService, 'currencyCode', 'get').and.returnValue('USD');
    spyOn(appSettingsService, 'getCashDenominations').and.returnValue(DEFAULT_USD_DENOMINATIONS);
    expect(component.primaryCashIncrements).toEqual([1, 5, 10, 20, 50, 100]);

    (Object.getOwnPropertyDescriptor(appSettingsService, 'currencyCode')?.get as jasmine.Spy).and.returnValue('CHF');
    (appSettingsService.getCashDenominations as jasmine.Spy).and.returnValue(DEFAULT_CHF_DENOMINATIONS);
    expect(component.primaryCashIncrements).toEqual([10, 20, 50, 100]);

    (Object.getOwnPropertyDescriptor(appSettingsService, 'currencyCode')?.get as jasmine.Spy).and.returnValue('JPY');
    (appSettingsService.getCashDenominations as jasmine.Spy).and.returnValue(DEFAULT_JPY_DENOMINATIONS);
    expect(component.primaryCashIncrements).toEqual([1000, 2000, 5000, 10000]);
  });

  it('should fallback to default increments if denominations contain no bills', () => {
    spyOn(appSettingsService, 'getCashDenominations').and.returnValue([]);
    expect(component.primaryCashIncrements).toEqual([5, 10, 20, 50]);
  });

  it('should calculate intelligent smart cash suggestions for different amounts', () => {
    spyOnProperty(appSettingsService, 'currencyCode', 'get').and.returnValue('EUR');
    spyOn(appSettingsService, 'getCashDenominations').and.returnValue(DEFAULT_EUR_DENOMINATIONS);

    // 34.50 € -> next round 10 is 40, next bill is 50
    component.addition = { ...mockAddition, totalTTC: 34.50 };
    expect(component.smartCashSuggestions).toEqual([40, 50]);

    // 48.00 € -> next 10 is 50, next bill is 50, next bill 2 is 100
    component.addition = { ...mockAddition, totalTTC: 48.00 };
    expect(component.smartCashSuggestions).toEqual([50, 100]);

    // 8.50 € -> next 10 is 10, next bill 2 is 20
    component.addition = { ...mockAddition, totalTTC: 8.50 };
    expect(component.smartCashSuggestions).toEqual([10, 20]);

    // 0 € -> empty suggestions
    component.addition = { ...mockAddition, totalTTC: 0 };
    expect(component.smartCashSuggestions).toEqual([]);
  });

  it('should calculate smart cash suggestions for JPY amounts', () => {
    spyOnProperty(appSettingsService, 'currencyCode', 'get').and.returnValue('JPY');
    spyOn(appSettingsService, 'getCashDenominations').and.returnValue(DEFAULT_JPY_DENOMINATIONS);

    component.addition = { ...mockAddition, totalTTC: 3450 };
    expect(component.smartCashSuggestions).toEqual([4000, 5000]);
  });

  it('should calculate cash received and change to return accurately', () => {
    component.addition = mockAddition;
    component.modePaiement = 'ESPECES';

    component.montantRecu = 30.0;
    expect(component.monnaieARendre).toBe(2.0);
    expect(component.isMontantRecuSuffisant).toBeTrue();

    component.montantRecu = 20.0;
    expect(component.monnaieARendre).toBe(0);
    expect(component.isMontantRecuSuffisant).toBeFalse();

    component.definirMontantExact();
    expect(component.montantRecu).toBe(28.0);
    expect(component.monnaieARendre).toBe(0);

    component.definirMontantRecu(50.0);
    expect(component.montantRecu).toBe(50.0);
    expect(component.monnaieARendre).toBe(22.0);

    component.ajouterEspeces(10.0);
    expect(component.montantRecu).toBe(60.0);
    expect(component.monnaieARendre).toBe(32.0);
  });

  it('should render quick cash chips in template and allow clicking next bill shortcut', () => {
    component.addition = mockAddition; // 28.00 € -> suggestions: [30, 50]
    component.modePaiement = 'ESPECES';
    component.isLoading = false;
    fixture.detectChanges();

    const quickChips = fixture.nativeElement.querySelector('[data-testid="quick-cash-chips"]');
    expect(quickChips).toBeTruthy();

    const exactBtn = fixture.nativeElement.querySelector('[data-testid="chip-cash-exact"]');
    expect(exactBtn).toBeTruthy();

    const nextBillBtn = fixture.nativeElement.querySelector('[data-testid="chip-cash-next-bill"]');
    expect(nextBillBtn).toBeTruthy();
    nextBillBtn.click();
    fixture.detectChanges();

    expect(component.montantRecu).toBe(30.0);
    expect(component.monnaieARendre).toBe(2.0);
  });

  it('should submit single table payment and dismiss with settled invoice', fakeAsync(() => {
    component.addition = mockAddition;
    component.modePaiement = 'CARTE';
    component.libererTable = true;

    component.validerEncaissement();
    tick();

    expect(dashboardServiceSpy.encaisserTable).toHaveBeenCalledWith(1, jasmine.objectContaining({
      modePaiement: 'CARTE',
      libererTable: true,
      commandeIds: [10]
    }));
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'settled' }));
  }));

  it('should generate equal split parts correctly', () => {
    component.addition = mockAddition;
    component.splitMode = 'egal';
    component.nombreConvives = 4;

    component.calculerSplitEgal();
    expect(component.splitResults).toHaveSize(4);
    expect(component.splitResults[0].sousTotal).toBe(7.0);
    expect(component.soldeRestantSplit).toBe(28.0);
  });

  it('should adjust guests count within bounds [2, 20]', () => {
    component.nombreConvives = 2;
    component.ajusterConvives(-1);
    expect(component.nombreConvives).toBe(2);

    component.ajusterConvives(5);
    expect(component.nombreConvives).toBe(7);

    component.ajusterConvives(25);
    expect(component.nombreConvives).toBe(20);
  });

  it('should calculate item-based split based on assignments', () => {
    component.addition = mockAddition;
    component.splitMode = 'selection';
    component.convives = [{ nom: 'Alice' }, { nom: 'Bob' }];
    component.itemAssignments = {
      101: 0, // Mojito (18€) to Alice
      102: 1  // Pina Colada (10€) to Bob
    };

    component.calculerSplitSelection();
    expect(component.splitResults).toHaveSize(2);
    expect(component.splitResults[0].nomConvive).toBe('Alice');
    expect(component.splitResults[0].sousTotal).toBe(18.0);
    expect(component.splitResults[1].nomConvive).toBe('Bob');
    expect(component.splitResults[1].sousTotal).toBe(10.0);
  });

  it('should manage convives addition, removal and naming in item split mode', () => {
    component.convives = [{ nom: 'Alice' }, { nom: 'Bob' }];
    component.addConvive();
    expect(component.convives).toHaveSize(3);

    expect(component.conviveNom(0)).toBe('Alice');
    component.convives[2].nom = '';
    expect(component.conviveNom(2)).toBe('Convive 3');

    component.removeConvive(2);
    expect(component.convives).toHaveSize(2);
  });

  it('should handle validerEncaissement error gracefully with toast feedback', fakeAsync(() => {
    component.addition = mockAddition;
    dashboardServiceSpy.encaisserTable.and.returnValue(throwError(() => new Error('Settlement failed')));

    component.validerEncaissement();
    tick();

    expect(component.isSubmitting).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('should settle an individual split part in-modal and finalize if all paid', fakeAsync(() => {
    component.addition = mockAddition;
    component.splitMode = 'egal';
    component.nombreConvives = 2;
    component.calculerSplitEgal();

    component.reglerPart(0, component.splitResults[0]);
    expect(component.settlingPartIndex).toBe(0);
    expect(component.settlingPart).toBe(component.splitResults[0]);

    component.partPaymentMode = 'CARTE';
    component.setPartTipMode('custom');
    component.partCustomTip = 1.0;
    component.validerReglementPart();
    tick();

    expect(component.partStates[0].reglee).toBeTrue();
    expect(component.partStates[0].modePaiement).toBe('CARTE');
    expect(component.partStates[0].pourboire).toBe(1.0);
    expect(component.montantRegleSplit).toBe(14.0);
  }));

  it('imprimerRecu() invokes window.print()', () => {
    spyOn(window, 'print');
    component.imprimerRecu();
    expect(window.print).toHaveBeenCalled();
  });

  it('telechargerPdf() opens the invoice PDF URL', () => {
    spyOn(window, 'open');
    component.addition = { ...mockAddition, hasUnpaidFacture: true, existingFactureId: 99 };
    component.telechargerPdf();
    expect(window.open).toHaveBeenCalledWith(jasmine.stringMatching(/\/api\/factures\/99\/pdf/), '_blank');
  });

  it('trackByItemId returns itemId', () => {
    expect(component.trackByItemId(0, mockItems[0])).toBe(101);
  });

  it('should dismiss modal when clicking close', () => {
    component.fermer();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });

  it('should return currency symbol from appSettingsService', () => {
    expect(component.currencySymbol).toBe('€');
  });

  it('onPaymentTabChange("split") switches paymentTab to split and calculates equal split without dismissing modal', () => {
    component.addition = mockAddition;
    component.onPaymentTabChange('split');

    expect(component.paymentTab).toBe('split');
    expect(component.splitResults).toHaveSize(2);
    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
  });

  it('definirNombreConvives() updates guest count and recalculates equal split', () => {
    component.addition = mockAddition;
    component.definirNombreConvives(4);

    expect(component.nombreConvives).toBe(4);
    expect(component.splitResults).toHaveSize(4);
    expect(component.splitResults[0].sousTotal).toBe(7.0); // 28 / 4
  });

  it('calculerSplitLibre() correctly calculates custom amounts for guests', () => {
    component.addition = mockAddition;
    component.customAmountGuests = [
      { nom: 'Alice', montant: 13 },
      { nom: 'Bob', montant: 15 }
    ];

    expect(component.isCustomAmountValid).toBeTrue();
    component.calculerSplitLibre();

    expect(component.splitResults).toHaveSize(2);
    expect(component.splitResults[0].nomConvive).toBe('Alice');
    expect(component.splitResults[0].sousTotal).toBe(13);
    expect(component.splitResults[1].nomConvive).toBe('Bob');
    expect(component.splitResults[1].sousTotal).toBe(15);
  });

  it('calculerSplitPourcentage() correctly calculates percentage splits', () => {
    component.addition = mockAddition;
    component.customPercentageGuests = [
      { nom: 'Alice', pourcentage: 60 },
      { nom: 'Bob', pourcentage: 40 }
    ];

    expect(component.isCustomPercentageValid).toBeTrue();
    component.calculerSplitPourcentage();

    expect(component.splitResults).toHaveSize(2);
    expect(component.splitResults[0].sousTotal).toBe(16.8); // 28 * 0.60
    expect(component.splitResults[1].sousTotal).toBe(11.2); // 28 * 0.40
  });

  it('distributePercentagesEqually() divides 100% equally among guests', () => {
    component.customPercentageGuests = [
      { nom: 'A', pourcentage: null },
      { nom: 'B', pourcentage: null },
      { nom: 'C', pourcentage: null }
    ];

    component.distributePercentagesEqually();

    expect(component.customPercentageGuests[0].pourcentage).toBe(33.33);
    expect(component.customPercentageGuests[1].pourcentage).toBe(33.33);
    expect(component.customPercentageGuests[2].pourcentage).toBe(33.34);
    expect(component.isCustomPercentageValid).toBeTrue();
  });

  it('onPaymentTabChange("single") switches paymentTab to single', () => {
    component.paymentTab = 'split';
    component.onPaymentTabChange('single');
    expect(component.paymentTab).toBe('single');
  });

  describe('Custom Tip and Discount Tiers', () => {
    beforeEach(() => {
      component.addition = mockAddition; // totalTTC: 28.0
    });

    it('calculates custom percentage tip correctly', () => {
      component.setTipMode('custom_percent');
      component.customTipPercent = 10;
      // 10% of 28.0 = 2.80
      expect(component.pourboire).toBe(2.8);
      expect(component.totalNetAPayer).toBe(30.8);
    });

    it('applies percentage discount tier correctly', () => {
      const tier = { id: 'staff', label: 'Équipier', type: 'percent' as const, value: 50 };
      component.applyDiscountTier(tier);

      expect(component.selectedTierId).toBe('staff');
      expect(component.discountMode).toBe('percent');
      expect(component.discountAmount).toBe(14.0); // 50% of 28.0
      expect(component.totalNetAPayer).toBe(14.0);
    });

    it('applies fixed discount tier correctly', () => {
      const tier = { id: 'vip', label: 'VIP', type: 'fixed' as const, value: 10 };
      component.applyDiscountTier(tier);

      expect(component.selectedTierId).toBe('vip');
      expect(component.discountMode).toBe('fixed');
      expect(component.discountAmount).toBe(10.0);
      expect(component.totalNetAPayer).toBe(18.0);
    });
  });

  describe('Item Assignment (Par article)', () => {
    beforeEach(() => {
      component.addition = mockAddition; // item 101: 18.0, item 102: 10.0
      component.convives = [{ nom: 'Alice' }, { nom: 'Bob' }];
    });

    it('assigns item to a guest and computes assigned total and count', () => {
      component.assignItemToGuest(101, 0); // Alice gets Mojito (18€)
      component.assignItemToGuest(102, 1); // Bob gets Piña Colada (10€)

      expect(component.getGuestAssignedTotal(0)).toBe(18.0);
      expect(component.getGuestAssignedCount(0)).toBe(1);
      expect(component.getGuestAssignedTotal(1)).toBe(10.0);
      expect(component.getGuestAssignedCount(1)).toBe(1);
      expect(component.totalAssignedItemsAmount).toBe(28.0);
      expect(component.unassignedItemsRemainder).toBe(0);
    });

    it('allows unassigning an item', () => {
      component.assignItemToGuest(101, 0);
      expect(component.getGuestAssignedCount(0)).toBe(1);

      component.assignItemToGuest(101, undefined);
      expect(component.getGuestAssignedCount(0)).toBe(0);
      expect(component.unassignedItemsRemainder).toBe(28.0);
    });

    it('assigns and unassigns individual units between guests', () => {
      // Mojito has 2 units (9€ each). Assign 1 unit to Alice (0) and 1 unit to Bob (1)
      component.assignOneUnitToGuest(0, 101);
      expect(component.getGuestTotal(0)).toBe(9.0);
      expect(component.getUnassignedCount(101)).toBe(1);

      component.assignOneUnitToGuest(1, 101);
      expect(component.getGuestTotal(1)).toBe(9.0);
      expect(component.getUnassignedCount(101)).toBe(0);

      // Unassign 1 unit from Alice
      component.unassignOneUnitFromGuest(0, 101);
      expect(component.getGuestTotal(0)).toBe(0);
      expect(component.getUnassignedCount(101)).toBe(1);
    });

    it('removes all units of an item from a guest', () => {
      component.assignOneUnitToGuest(0, 101);
      component.assignOneUnitToGuest(0, 101);
      expect(component.getGuestTotal(0)).toBe(18.0);

      component.removeAllUnitsOfItemFromGuest(0, 101);
      expect(component.getGuestTotal(0)).toBe(0);
      expect(component.getUnassignedCount(101)).toBe(2);
    });

    it('validates allItemsAssigned and calculates split selection', () => {
      expect(component.allItemsAssigned).toBeFalse();

      // Assign all units: 2x Mojito to Alice, 1x Piña Colada to Bob
      component.assignOneUnitToGuest(0, 101);
      component.assignOneUnitToGuest(0, 101);
      component.assignOneUnitToGuest(1, 102);

      expect(component.allItemsAssigned).toBeTrue();
      expect(component.availableAdditionItems).toHaveSize(0);

      component.calculerSplitSelection();
      expect(component.splitResults).toHaveSize(2);
      expect(component.splitResults[0].nomConvive).toBe('Alice');
      expect(component.splitResults[0].sousTotal).toBe(18.0);
      expect(component.splitResults[1].nomConvive).toBe('Bob');
      expect(component.splitResults[1].sousTotal).toBe(10.0);
    });
  });

  describe('In-modal Part Settlement Flow', () => {
    const mockPart: SplitResultDTO = {
      factureId: 50,
      nomConvive: 'Alice',
      items: [],
      sousTotal: 14.0,
      totalAvecPourboire: 14.0
    };

    beforeEach(() => {
      component.addition = mockAddition;
      component.splitResults = [mockPart];
    });

    it('reglerPart() initiates part settlement mode', () => {
      component.reglerPart(0, mockPart);

      expect(component.settlingPartIndex).toBe(0);
      expect(component.settlingPart).toBe(mockPart);
      expect(component.partPaymentMode).toBe('CARTE');
      expect(component.partTotalNetAPayer).toBe(14.0);
    });

    it('annulerReglementPart() exits part settlement mode without settling', () => {
      component.reglerPart(0, mockPart);
      component.annulerReglementPart();

      expect(component.settlingPartIndex).toBeNull();
      expect(component.settlingPart).toBeNull();
    });

    it('validerReglementPart() settles the part and updates partStates', () => {
      component.reglerPart(0, mockPart);
      component.partPaymentMode = 'CARTE';
      component.setPartTipMode('10pct'); // 10% of 14 = 1.40
      expect(component.partTotalNetAPayer).toBe(15.4);

      component.validerReglementPart();

      expect(component.partStates[0].reglee).toBeTrue();
      expect(component.partStates[0].modePaiement).toBe('CARTE');
      expect(component.partStates[0].pourboire).toBe(1.4);
      expect(component.settlingPart).toBeNull();
    });

    it('computes cash suggestions and change for part settlement', () => {
      component.reglerPart(0, mockPart);
      component.partPaymentMode = 'ESPECES';
      component.definirPartMontantRecu(20);

      expect(component.isPartMontantRecuSuffisant).toBeTrue();
      expect(component.partMonnaieARendre).toBe(6.0); // 20 - 14
    });

    it('computes financial breakdown with discounts and tips for part settlement', () => {
      const part20: SplitResultDTO = {
        factureId: 50,
        nomConvive: 'Bob',
        items: [],
        sousTotal: 20.0,
        totalAvecPourboire: 20.0
      };
      component.reglerPart(0, part20);

      // Initial subtotal
      expect(component.partSubTotal).toBe(20.0);
      expect(component.partDiscountAmount).toBe(0);
      expect(component.partDiscountLabel).toBe('');
      expect(component.partNetBeforeTip).toBe(20.0);
      expect(component.partPourboire).toBe(0);
      expect(component.partTipLabel).toBe('');
      expect(component.partTotalNetAPayer).toBe(20.0);

      // Apply 10% commercial discount
      component.partDiscountMode = 'percent';
      component.partDiscountPercent = 10;
      expect(component.partDiscountAmount).toBe(2.0);
      expect(component.partDiscountLabel).toBe('-10%');
      expect(component.partNetBeforeTip).toBe(18.0);

      // Apply 10% tip on net before tip (18.0 * 0.10 = 1.80)
      component.setPartTipMode('10pct');
      expect(component.partPourboire).toBe(1.80);
      expect(component.partTipLabel).toBe('+10%');
      expect(component.partTotalNetAPayer).toBe(19.80);
    });

    it('formats partTipLabel and partDiscountLabel correctly for various modes', () => {
      component.reglerPart(0, mockPart);

      // Tip labels
      component.setPartTipMode('5pct');
      expect(component.partTipLabel).toBe('+5%');
      component.setPartTipMode('15pct');
      expect(component.partTipLabel).toBe('+15%');
      component.setPartTipMode('custom_percent');
      component.partCustomTipPercent = 12;
      expect(component.partTipLabel).toBe('+12%');
      component.setPartTipMode('custom');
      component.partCustomTip = 3;
      expect(component.partTipLabel).toContain('+3');

      // Discount labels
      component.partDiscountMode = 'fixed';
      component.partDiscountFixed = 5;
      expect(component.partDiscountLabel).toContain('-5');

      component.discountTiers = [{ id: 'staff', label: 'Équipier', type: 'percent' as const, value: 50 }];
      component.applyPartDiscountTier(component.discountTiers[0]);
      expect(component.partDiscountLabel).toContain('Équipier');
      expect(component.partDiscountLabel).toContain('-50%');
    });

    it('formats single payment discountLabel and tipLabel correctly', () => {
      component.addition = mockAddition;
      component.tipMode = '10pct';
      expect(component.tipLabel).toBe('+10%');

      component.tipMode = 'custom_percent';
      component.customTipPercent = 8;
      expect(component.tipLabel).toBe('+8%');

      component.discountMode = 'percent';
      component.discountPercent = 15;
      expect(component.discountLabel).toBe('-15%');
      expect(component.netTotalBeforeTip).toBe(23.8);

      component.discountMode = 'fixed';
      component.discountFixed = 3;
      expect(component.discountLabel).toContain('-3');

      component.discountMode = 'none';
      expect(component.discountLabel).toBe('');

      component.tipMode = '5pct';
      expect(component.tipLabel).toBe('+5%');

      component.tipMode = '15pct';
      expect(component.tipLabel).toBe('+15%');

      component.tipMode = 'custom';
      component.customTip = 4;
      expect(component.tipLabel).toContain('+4');
    });

    it('exercises itemAssignments and guests getters and setters', () => {
      component.addition = mockAddition;
      component.convives = [{ nom: 'Guest A' }, { nom: 'Guest B' }];
      expect(component.guests).toEqual([{ name: 'Guest A' }, { name: 'Guest B' }]);

      component.guests = [{ name: 'Guest X' }, { name: 'Guest Y' }];
      expect(component.convives).toEqual([{ nom: 'Guest X' }, { nom: 'Guest Y' }]);

      component.unitAssignments = { '101_0': 0, '102_0': 1 };
      expect(component.itemAssignments).toEqual({ 101: 0, 102: 1 });

      component.itemAssignments = { 101: 1 };
      expect(component.unitAssignments['101_0']).toBe(1);
    });

    it('exercises split modes free amount and percentages', () => {
      component.addition = mockAddition; // 28.0
      // Libre
      component.addCustomAmountGuest();
      expect(component.customAmountGuests.length).toBe(3);
      component.customAmountGuests[0].montant = 10;
      component.assignRemainingToGuest(1);
      expect(component.customAmountGuests[1].montant).toBe(18);
      component.removeCustomAmountGuest(2);
      expect(component.customAmountGuests.length).toBe(2);

      // Pourcentage
      component.addCustomPercentageGuest();
      expect(component.customPercentageGuests.length).toBe(3);
      component.customPercentageGuests[0].pourcentage = 40;
      component.assignRemainingPercentageToGuest(1);
      expect(component.customPercentageGuests[1].pourcentage).toBe(60);
      component.removeCustomPercentageGuest(2);
      expect(component.customPercentageGuests.length).toBe(2);
    });

    it('exercises item split edge cases and removal', () => {
      component.addition = mockAddition;
      component.convives = [{ nom: 'A' }, { nom: 'B' }, { nom: 'C' }];
      component.unitAssignments = { '101_0': 1, '102_0': 2 };

      // Removing guest at index 1 shifts assignments for guest 2 down to 1
      component.removeConvive(1);
      expect(component.convives.length).toBe(2);
      expect(component.unitAssignments['101_0']).toBeUndefined();
      expect(component.unitAssignments['102_0']).toBe(1);

      expect(component.getGuestName(0)).toBe('A');
      expect(component.totalUnassignedCount).toBeGreaterThan(0);
      expect(component.availableAdditionItems.length).toBeGreaterThan(0);
      expect(component.allItemsAssigned).toBeFalse();
    });

    it('exercises cash operations and exact amount in part settlement', () => {
      component.reglerPart(0, mockPart);
      component.partPaymentMode = 'ESPECES';
      component.definirPartMontantExact();
      expect(component.partMontantRecu).toBe(component.partTotalNetAPayer);

      component.ajouterPartEspeces(5);
      expect(component.partMontantRecu).toBe(component.partTotalNetAPayer + 5);

      const suggestions = component.partBilletSuggestions;
      expect(suggestions).toBeDefined();

      component.setPartDiscountMode('fixed');
      component.partDiscountFixed = 2;
      expect(component.partDiscountAmount).toBe(2);

      component.setPartDiscountMode('none');
      expect(component.partDiscountAmount).toBe(0);

      const fixedTier = { id: 'promo', label: 'Promo 5€', type: 'fixed' as const, value: 5 };
      component.applyPartDiscountTier(fixedTier);
      expect(component.partDiscountMode).toBe('fixed');
      expect(component.partDiscountAmount).toBe(5);
    });
  });
});
