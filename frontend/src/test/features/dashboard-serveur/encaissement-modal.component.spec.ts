import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { EncaissementModalComponent } from '../../../app/features/dashboard-serveur/components/encaissement-modal/encaissement-modal.component';
import {
  DashboardServeurService,
  TableAdditionResponse,
  TableAdditionItem
} from '../../../app/features/dashboard-serveur/services/dashboard-serveur.service';
import { FactureService } from '../../../app/features/factures/services/facture.service';
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

    factureServiceSpy = jasmine.createSpyObj('FactureService', ['getFacturesByTable']);

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
        { provide: FactureService, useValue: factureServiceSpy }
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

  it('should settle an individual split part via ReglementModalComponent and finalize if all paid', fakeAsync(() => {
    component.addition = mockAddition;
    component.splitMode = 'egal';
    component.nombreConvives = 2;
    component.calculerSplitEgal();

    const mockModal = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({
        data: {
          modePaiement: 'CARTE',
          pourboire: 1.0,
          montantRecu: 15.0,
          monnaieRendue: 0,
          totalTotal: 15.0
        }
      }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    component.reglerPart(0, component.splitResults[0]);
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
});
