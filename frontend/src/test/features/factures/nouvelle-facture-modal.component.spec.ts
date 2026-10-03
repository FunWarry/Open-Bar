import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { provideIonicAngular, ModalController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { NouvelleFactureModalComponent } from '../../../app/features/factures/nouvelle-facture-modal/nouvelle-facture-modal.component';
import { FactureService } from '../../../app/features/factures/services/facture.service';
import { TableService } from '../../../app/core/services/table.service';
import { AppSettingsService } from '../../../app/core/services/app-settings.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TableBar } from '../../../app/core/models/table.model';
import { TableAdditionResponse, Facture } from '../../../app/features/factures/models/facture.model';

describe('NouvelleFactureModalComponent', () => {
  let component: NouvelleFactureModalComponent;
  let fixture: ComponentFixture<NouvelleFactureModalComponent>;
  let factureServiceSpy: jasmine.SpyObj<FactureService>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let appSettingsServiceSpy: jasmine.SpyObj<AppSettingsService>;

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  const mockTables: TableBar[] = [
    {
      id: 1,
      numero: 4,
      capacite: 4,
      occupee: true,
      zone: 'Terrasse',
      createdAt: '2026-09-19T10:00:00Z',
      updatedAt: '2026-09-19T10:00:00Z'
    },
    {
      id: 2,
      numero: 5,
      capacite: 2,
      occupee: false,
      zone: 'Salle',
      createdAt: '2026-09-19T10:00:00Z',
      updatedAt: '2026-09-19T10:00:00Z'
    }
  ];

  const mockAddition: TableAdditionResponse = {
    tableId: 1,
    tableNumero: 4,
    zone: 'Terrasse',
    serveurId: 10,
    serveurNom: 'Thomas Robert',
    items: [
      {
        itemId: 101,
        commandeId: 201,
        cocktailNom: 'Mojito',
        quantite: 2,
        prixUnitaire: 9.5,
        total: 19.0,
        priceHT: 15.83,
        vatRate: '20%',
        vatAmount: 3.17
      }
    ],
    commandeIds: [201],
    totalHT: 15.83,
    totalVAT: 3.17,
    totalTTC: 19.0,
    nombreArticles: 2,
    hasUnpaidFacture: false
  };

  const mockFacture: Facture = {
    id: 99,
    tableId: 1,
    tableNumero: 4,
    numero: 'FAC-2026-00099',
    total: 19.0,
    totalTTC: 19.0,
    totalHT: 15.83,
    totalVAT: 3.17,
    reglee: false,
    dateFacture: '2026-09-19T14:30:00Z',
    serveurNom: 'Thomas Robert',
    items: [],
    createdAt: '2026-09-19T14:30:00Z',
    updatedAt: '2026-09-19T14:30:00Z'
  };

  beforeEach(async () => {
    factureServiceSpy = jasmine.createSpyObj('FactureService', ['getTableAddition', 'genererFactureTable']);
    factureServiceSpy.getTableAddition.and.returnValue(of(mockAddition));
    factureServiceSpy.genererFactureTable.and.returnValue(of(mockFacture));

    tableServiceSpy = jasmine.createSpyObj('TableService', ['getAll']);
    tableServiceSpy.getAll.and.returnValue(of(mockTables));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as unknown as ReturnType<ToastController['create']> extends Promise<infer U> ? U : never));

    appSettingsServiceSpy = jasmine.createSpyObj('AppSettingsService', ['formatCurrency'], {
      currencySymbol: '€'
    });
    appSettingsServiceSpy.formatCurrency.and.callFake((val: number) => `${val?.toFixed(2)} €`);

    await TestBed.configureTestingModule({
      imports: [NouvelleFactureModalComponent, getTranslocoTestingModule()],
      providers: [
        provideIonicAngular(),
        { provide: FactureService, useValue: factureServiceSpy },
        { provide: TableService, useValue: tableServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AppSettingsService, useValue: appSettingsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NouvelleFactureModalComponent);
    component = fixture.componentInstance;
  });

  it('should initialize and load occupied tables', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(tableServiceSpy.getAll).toHaveBeenCalled();
    expect(component.occupiedTables).toHaveSize(1);
    expect(component.occupiedTables[0].numero).toBe(4);
    expect(component.isLoadingTables).toBeFalse();
  }));

  it('should select table and load addition preview', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const targetTable = component.occupiedTables[0];
    component.selectTable(targetTable);
    tick();

    expect(component.selectedTable).toBe(targetTable);
    expect(factureServiceSpy.getTableAddition).toHaveBeenCalledWith(targetTable.id);
    expect(component.additionPreview).toEqual(mockAddition);
    expect(component.isLoadingPreview).toBeFalse();
  }));

  it('should handle error when loading tables', fakeAsync(() => {
    tableServiceSpy.getAll.and.returnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    tick();

    expect(component.isLoadingTables).toBeFalse();
    expect(component.errorMessage).toBeTruthy();
  }));

  it('should generate invoice without split and dismiss with result', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.selectTable(component.occupiedTables[0]);
    tick();

    component.generateInvoice(false);
    tick();
    flushMicrotasks();

    expect(factureServiceSpy.genererFactureTable).toHaveBeenCalledWith(1);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      action: 'created',
      facture: mockFacture,
      openSplit: false
    });
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should generate invoice with split and dismiss with openSplit=true', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.selectTable(component.occupiedTables[0]);
    tick();

    component.generateInvoice(true);
    tick();
    flushMicrotasks();

    expect(factureServiceSpy.genererFactureTable).toHaveBeenCalledWith(1);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      action: 'created',
      facture: mockFacture,
      openSplit: true
    });
  }));

  it('should not auto-select if multiple tables are occupied', fakeAsync(() => {
    const multiOccupied: TableBar[] = [
      { ...mockTables[0], id: 10, numero: 10, occupee: true },
      { ...mockTables[0], id: 11, numero: 11, occupee: true }
    ];
    tableServiceSpy.getAll.and.returnValue(of(multiOccupied));
    component.loadOccupiedTables();
    tick();

    expect(component.occupiedTables).toHaveSize(2);
    expect(component.selectedTable).toBeNull();
  }));

  it('should return early when re-selecting the same table with preview already present', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.selectTable(component.occupiedTables[0]);
    tick();
    expect(factureServiceSpy.getTableAddition).toHaveBeenCalledTimes(1);

    component.selectTable(component.occupiedTables[0]);
    tick();
    expect(factureServiceSpy.getTableAddition).toHaveBeenCalledTimes(1);
  }));

  it('should handle preview loading error in selectTable', fakeAsync(() => {
    factureServiceSpy.getTableAddition.and.returnValue(throwError(() => new Error('Preview error')));
    fixture.detectChanges();
    tick();

    expect(component.isLoadingPreview).toBeFalse();
    expect(component.additionPreview).toBeNull();
  }));

  it('should not generate invoice if no table is selected or isSubmitting is true', fakeAsync(() => {
    component.selectedTable = null;
    component.generateInvoice();
    tick();
    expect(factureServiceSpy.genererFactureTable).not.toHaveBeenCalled();

    component.selectedTable = mockTables[0];
    component.isSubmitting = true;
    component.generateInvoice();
    tick();
    expect(factureServiceSpy.genererFactureTable).not.toHaveBeenCalled();
  }));

  it('should handle error when generating invoice and show error toast', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    factureServiceSpy.genererFactureTable.and.returnValue(throwError(() => ({
      error: { message: 'Table has no items' }
    })));

    component.selectTable(component.occupiedTables[0]);
    tick();

    component.generateInvoice(false);
    tick();
    flushMicrotasks();

    expect(component.isSubmitting).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should dismiss modal on close', () => {
    component.close();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'cancelled' });
  });
});
