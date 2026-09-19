import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController, AlertController, ToastController, provideIonicAngular } from '@ionic/angular';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { BarTabsListComponent } from '../../../app/features/dashboard-serveur/components/bar-tabs-list/bar-tabs-list.component';
import { BarTabService } from '../../../app/core/services/bar-tab.service';
import { BarTab } from '../../../app/core/models/bar-tab.model';

describe('BarTabsListComponent', () => {
  let component: BarTabsListComponent;
  let fixture: ComponentFixture<BarTabsListComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const mockTabs: BarTab[] = [
    {
      id: 1,
      nom: 'VIP Dupont',
      clientReference: 'CB-1234',
      cautionMontant: 50,
      statut: 'ACTIVE',
      openedAt: '2026-09-18T20:00:00',
      total: 35.0,
      activeOrdersCount: 2,
      itemsCount: 4,
    },
    {
      id: 2,
      nom: 'Comptoir Martin',
      clientReference: 'TAB-88',
      cautionMontant: 0,
      statut: 'ACTIVE',
      openedAt: '2026-09-18T20:30:00',
      total: 18.0,
      activeOrdersCount: 1,
      itemsCount: 2,
    },
  ];

  const activeTabsSignal = signal<BarTab[]>(mockTabs);
  const activeCountSignal = signal<number>(2);
  const activeTotalAmountSignal = signal<number>(53.0);
  const isLoadingSignal = signal<boolean>(false);

  const fakeBarTabService = {
    tabs: signal<BarTab[]>(mockTabs),
    activeTabs: activeTabsSignal,
    activeCount: activeCountSignal,
    activeTotalAmount: activeTotalAmountSignal,
    isLoading: isLoadingSignal,
    loading: isLoadingSignal,
    loadTabs: jasmine.createSpy('loadTabs').and.returnValue(of(mockTabs)),
    cancelTab: jasmine.createSpy('cancelTab').and.returnValue(of(mockTabs[0])),
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'getTop']);
    modalCtrlSpy.getTop.and.resolveTo(undefined);
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);

    await TestBed.configureTestingModule({
      imports: [
        BarTabsListComponent,
        CommonModule,
        FormsModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        provideIonicAngular(),
        { provide: BarTabService, useValue: fakeBarTabService },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BarTabsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should list all active tabs initially', () => {
    expect(component.filteredTabs()).toHaveSize(2);
  });

  it('should filter tabs by name or reference', () => {
    component.searchTerm.set('dupont');
    expect(component.filteredTabs()).toHaveSize(1);
    expect(component.filteredTabs()[0].nom).toBe('VIP Dupont');

    component.searchTerm.set('TAB-88');
    expect(component.filteredTabs()).toHaveSize(1);
    expect(component.filteredTabs()[0].nom).toBe('Comptoir Martin');

    component.searchTerm.set('nonexistent');
    expect(component.filteredTabs()).toHaveSize(0);
  });

  it('should emit orderForTab when onAddOrder is called', () => {
    spyOn(component.orderForTab, 'emit');
    component.onAddOrder(mockTabs[0]);
    expect(component.orderForTab.emit).toHaveBeenCalledWith(mockTabs[0]);
  });

  it('should emit settleTab when onSettle is called', () => {
    spyOn(component.settleTab, 'emit');
    component.onSettle(mockTabs[0]);
    expect(component.settleTab.emit).toHaveBeenCalledWith(mockTabs[0]);
  });

  it('should update and clear search term', () => {
    component.onSearchChange('mart');
    expect(component.searchTerm()).toBe('mart');

    component.clearSearch();
    expect(component.searchTerm()).toBe('');
  });

  it('should open create modal', async () => {
    const modalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onDidDismiss']);
    modalSpy.onDidDismiss.and.resolveTo({ role: 'backdrop' });
    modalCtrlSpy.create.and.resolveTo(modalSpy);

    await component.openCreateModal();
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(modalSpy.present).toHaveBeenCalled();
  });

  it('should open edit modal with tab componentProps', async () => {
    const modalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onDidDismiss']);
    modalSpy.onDidDismiss.and.resolveTo({ role: 'backdrop' });
    modalCtrlSpy.create.and.resolveTo(modalSpy);

    await component.openEditModal(mockTabs[0]);
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        componentProps: { tab: mockTabs[0] },
      })
    );
    expect(modalSpy.present).toHaveBeenCalled();
  });

  it('should open transfer modal with sourceTab componentProps', async () => {
    const modalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onDidDismiss']);
    modalSpy.onDidDismiss.and.resolveTo({ role: 'backdrop' });
    modalCtrlSpy.create.and.resolveTo(modalSpy);

    await component.openTransferModal(mockTabs[0]);
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        componentProps: { sourceTab: mockTabs[0] },
      })
    );
    expect(modalSpy.present).toHaveBeenCalled();
  });

  it('should refresh tabs via service', () => {
    component.refreshTabs();
    expect(fakeBarTabService.loadTabs).toHaveBeenCalled();
  });

  it('should present confirmation alert on cancel tab', async () => {
    const alertSpy = jasmine.createSpyObj('HTMLIonAlertElement', ['present']);
    alertCtrlSpy.create.and.resolveTo(alertSpy);

    await component.onCancelTab(mockTabs[0]);
    expect(alertCtrlSpy.create).toHaveBeenCalled();
    expect(alertSpy.present).toHaveBeenCalled();
  });
});
