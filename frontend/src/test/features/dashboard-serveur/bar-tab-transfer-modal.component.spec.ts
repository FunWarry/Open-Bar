import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController, ToastController, provideIonicAngular } from '@ionic/angular';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { BarTabTransferModalComponent } from '../../../app/features/dashboard-serveur/components/bar-tab-transfer-modal/bar-tab-transfer-modal.component';
import { BarTabService } from '../../../app/core/services/bar-tab.service';
import { TableService } from '../../../app/core/services/table.service';
import { BarTab } from '../../../app/core/models/bar-tab.model';
import { TableBar } from '../../../app/core/models/table.model';

describe('BarTabTransferModalComponent', () => {
  let component: BarTabTransferModalComponent;
  let fixture: ComponentFixture<BarTabTransferModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  const mockTables: TableBar[] = [
    {
      id: 1,
      numero: 1,
      zone: 'Salle',
      capacite: 4,
      occupee: false,
      createdAt: '2026-09-18T20:00:00',
      updatedAt: '2026-09-18T20:00:00',
    },
    {
      id: 2,
      numero: 2,
      zone: 'Terrasse',
      capacite: 6,
      occupee: true,
      createdAt: '2026-09-18T20:00:00',
      updatedAt: '2026-09-18T20:00:00',
    },
  ];

  const mockTabs: BarTab[] = [
    {
      id: 10,
      nom: 'Tab Dupont',
      clientReference: 'REF-1',
      cautionMontant: 50,
      statut: 'ACTIVE',
      openedAt: '2026-09-18T20:00:00',
      total: 30.0,
      activeOrdersCount: 2,
      itemsCount: 3,
    },
    {
      id: 20,
      nom: 'Tab Martin',
      clientReference: 'REF-2',
      cautionMontant: 0,
      statut: 'ACTIVE',
      openedAt: '2026-09-18T20:30:00',
      total: 45.0,
      activeOrdersCount: 1,
      itemsCount: 2,
    },
  ];

  let fakeBarTabService: {
    activeTabs: ReturnType<typeof signal<BarTab[]>>;
    transferSingleOrder: jasmine.Spy;
    transferTabToTable: jasmine.Spy;
    transferOrdersFromTable: jasmine.Spy;
  };

  let fakeTableService: {
    getAll: jasmine.Spy;
  };

  beforeEach(async () => {
    fakeBarTabService = {
      activeTabs: signal<BarTab[]>(mockTabs),
      transferSingleOrder: jasmine.createSpy('transferSingleOrder').and.returnValue(of(mockTabs[0])),
      transferTabToTable: jasmine.createSpy('transferTabToTable').and.returnValue(of(mockTabs[0])),
      transferOrdersFromTable: jasmine.createSpy('transferOrdersFromTable').and.returnValue(of(mockTabs[1])),
    };

    fakeTableService = {
      getAll: jasmine.createSpy('getAll').and.returnValue(of(mockTables)),
    };

    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastSpy.present.and.resolveTo();

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.resolveTo(toastSpy);

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [
        BarTabTransferModalComponent,
        CommonModule,
        FormsModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        provideIonicAngular(),
        { provide: BarTabService, useValue: fakeBarTabService },
        { provide: TableService, useValue: fakeTableService },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BarTabTransferModalComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should initialize in TAB_TO_TABLE mode when sourceTab is provided', () => {
    component.sourceTab = mockTabs[0];
    fixture.detectChanges();

    expect(component.transferMode).toBe('TAB_TO_TABLE');
    expect(fakeTableService.getAll).toHaveBeenCalled();
    expect(component.tables).toEqual(mockTables);
    expect(component.tabs).toEqual([mockTabs[1]]); // filters out sourceTab
  });

  it('should initialize in TABLE_TO_TAB mode when sourceTableId is provided', () => {
    component.sourceTableId = 1;
    fixture.detectChanges();

    expect(component.transferMode).toBe('TABLE_TO_TAB');
  });

  it('should dismiss modal with cancel role', () => {
    fixture.detectChanges();
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should switch mode and reset selections', () => {
    fixture.detectChanges();
    component.selectedTableId = 1;
    component.selectedTabId = 10;

    component.onModeChange('TABLE_TO_TAB');
    expect(component.transferMode).toBe('TABLE_TO_TAB');
    expect(component.selectedTableId).toBeNull();
    expect(component.selectedTabId).toBeNull();

    expect(component.canSubmit()).toBeFalse();
    component.selectedTabId = 20;
    expect(component.canSubmit()).toBeTrue();
  });

  it('should transfer single order when orderId is provided', async () => {
    component.sourceTab = mockTabs[0];
    component.orderId = 101;
    component.transferMode = 'TAB_TO_TABLE';
    fixture.detectChanges();
    component.selectedTableId = 2;

    await component.onConfirmTransfer();
    await new Promise((r) => setTimeout(r, 50));

    expect(fakeBarTabService.transferSingleOrder).toHaveBeenCalledWith(10, {
      commandeIds: [101],
      targetTableId: 2,
      targetTabId: undefined,
    });
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(mockTabs[0], 'confirm');
  });

  it('should transfer tab to table when transferMode is TAB_TO_TABLE', async () => {
    component.sourceTab = mockTabs[0];
    component.transferMode = 'TAB_TO_TABLE';
    fixture.detectChanges();
    component.selectedTableId = 1;

    await component.onConfirmTransfer();
    await new Promise((r) => setTimeout(r, 50));

    expect(fakeBarTabService.transferTabToTable).toHaveBeenCalledWith(10, {
      targetTableId: 1,
    });
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(mockTabs[0], 'confirm');
  });

  it('should transfer table orders to tab when transferMode is TABLE_TO_TAB', async () => {
    component.sourceTableId = 1;
    component.transferMode = 'TABLE_TO_TAB';
    fixture.detectChanges();
    component.selectedTabId = 20;

    await component.onConfirmTransfer();
    await new Promise((r) => setTimeout(r, 50));

    expect(fakeBarTabService.transferOrdersFromTable).toHaveBeenCalledWith(20, {
      targetTableId: 1,
    });
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(mockTabs[1], 'confirm');
  });

  it('should handle transfer error gracefully with danger toast', async () => {
    fakeBarTabService.transferTabToTable.and.returnValue(throwError(() => new Error('Transfer failed')));
    component.sourceTab = mockTabs[0];
    component.transferMode = 'TAB_TO_TABLE';
    fixture.detectChanges();
    component.selectedTableId = 1;

    await component.onConfirmTransfer();
    await new Promise((r) => setTimeout(r, 50));

    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(component.isSubmitting).toBeFalse();
  });
});
