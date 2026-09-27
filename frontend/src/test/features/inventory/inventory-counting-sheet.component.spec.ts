import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastController, AlertController, provideIonicAngular } from '@ionic/angular';
import { InventoryCountingSheetComponent } from '../../../app/features/inventory/inventory-counting-sheet/inventory-counting-sheet.component';
import { InventoryAuditService } from '../../../app/core/services/inventory-audit.service';
import {
  InventoryAuditSession,
  InventoryAuditItem,
  InventoryVarianceSummary,
} from '../../../app/core/models/inventory-audit.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('InventoryCountingSheetComponent', () => {
  let component: InventoryCountingSheetComponent;
  let fixture: ComponentFixture<InventoryCountingSheetComponent>;
  let auditServiceSpy: jasmine.SpyObj<InventoryAuditService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;

  const mockToast = { present: jasmine.createSpy('present') };
  const mockAlert = { present: jasmine.createSpy('present') };

  const mockItem: InventoryAuditItem = {
    id: 10,
    ingredientId: 100,
    ingredientNom: 'Rhum Blanc Agricole',
    ingredientUnite: 'cl',
    ingredientCategory: 'alcohol',
    packagingCapacity: 70,
    theoreticalQuantity: 140,
    countedQuantity: 140,
    varianceQuantity: 0,
    unitCostHt: 20,
    theoreticalValueHt: 2800,
    countedValueHt: 2800,
    varianceValueHt: 0,
    notes: '',
    locationCounts: [
      {
        id: 101,
        storageLocation: 'Main Bar',
        fullContainersCount: 2,
        partialQuantity: 0,
        countedQuantity: 140,
        countedAt: '2026-09-27T10:00:00Z',
      },
    ],
  };

  const mockItemWithDiscrepancy: InventoryAuditItem = {
    id: 11,
    ingredientId: 101,
    ingredientNom: 'Gin Artisanal',
    ingredientUnite: 'cl',
    ingredientCategory: 'alcohol',
    packagingCapacity: 70,
    theoreticalQuantity: 210,
    countedQuantity: 175,
    varianceQuantity: -35,
    unitCostHt: 25,
    theoreticalValueHt: 5250,
    countedValueHt: 4375,
    varianceValueHt: -875,
    notes: 'Shrinkage noticed',
    locationCounts: [],
  };

  const mockSession: InventoryAuditSession = {
    id: 1,
    referenceCode: 'INV-20260927-001',
    title: 'Monthly Spirits Audit',
    status: 'IN_PROGRESS',
    storageLocationScope: 'ALL',
    categoryScope: 'alcohol',
    createdByUsername: 'manager',
    createdAt: '2026-09-27T10:00:00Z',
    totalTheoreticalValueHt: 8050,
    totalCountedValueHt: 7175,
    totalVarianceValueHt: -875,
    totalItemsCount: 2,
    countedItemsCount: 1,
    items: [mockItem, mockItemWithDiscrepancy],
  };

  const mockSummary: InventoryVarianceSummary = {
    totalTheoreticalValueHt: 8050,
    totalCountedValueHt: 7175,
    totalVarianceValueHt: -875,
    totalShrinkageValueHt: 875,
    totalSurplusValueHt: 0,
    totalItemsAudited: 2,
    itemsWithVarianceCount: 1,
    varianceValueByCategory: { alcohol: -875 },
    countedValueByLocation: { 'Main Bar': 2800 },
  };

  beforeEach(async () => {
    auditServiceSpy = jasmine.createSpyObj('InventoryAuditService', [
      'getSessionById',
      'getVarianceSummary',
      'updateItemCount',
      'finalizeSession',
      'cancelSession',
      'downloadPdf',
      'downloadCsv',
    ]);
    auditServiceSpy.getSessionById.and.returnValue(of(mockSession));
    auditServiceSpy.getVarianceSummary.and.returnValue(of(mockSummary));
    auditServiceSpy.updateItemCount.and.returnValue(of(mockItem));
    auditServiceSpy.finalizeSession.and.returnValue(of({ ...mockSession, status: 'FINALIZED' }));
    auditServiceSpy.downloadPdf.and.returnValue(of(new Blob(['%PDF-1.4'], { type: 'application/pdf' })));
    auditServiceSpy.downloadCsv.and.returnValue(of(new Blob(['data'], { type: 'text/csv' })));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as unknown as HTMLIonToastElement));

    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrlSpy.create.and.returnValue(Promise.resolve(mockAlert as unknown as HTMLIonAlertElement));

    await TestBed.configureTestingModule({
      imports: [
        InventoryCountingSheetComponent,
        getTranslocoTestingModule(),
      ],
      providers: [
        provideIonicAngular(),
        { provide: InventoryAuditService, useValue: auditServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '1' : null),
              },
            },
          },
        },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryCountingSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load session with summary on init', () => {
    expect(component).toBeTruthy();
    expect(auditServiceSpy.getSessionById).toHaveBeenCalledWith(1);
    expect(auditServiceSpy.getVarianceSummary).toHaveBeenCalledWith(1);
    expect(component.session()).toEqual(mockSession);
    expect(component.summary()).toEqual(mockSummary);
  });

  it('should switch between counting sheet and variance report tabs', () => {
    expect(component.activeTab()).toBe('counting');

    component.selectTab('report');
    expect(component.activeTab()).toBe('report');

    component.selectTab('counting');
    expect(component.activeTab()).toBe('counting');
  });

  it('should switch selected storage location', () => {
    expect(component.selectedLocation()).toBe('Main Bar');

    component.selectLocation('Cave à vins & Spiritueux');
    expect(component.selectedLocation()).toBe('Cave à vins & Spiritueux');
  });

  it('should filter items by search query and discrepancy flag', () => {
    expect(component.filteredItems()).toHaveSize(2);

    component.onSearch('Gin');
    expect(component.filteredItems()).toHaveSize(1);
    expect(component.filteredItems()[0].id).toBe(11);

    component.onSearch('');
    component.toggleDiscrepanciesOnly();
    expect(component.showDiscrepanciesOnly()).toBeTrue();
    expect(component.filteredItems()).toHaveSize(1);
    expect(component.filteredItems()[0].id).toBe(11);
  });

  it('should adjust bottle gauge counters correctly', () => {
    const state = component.getItemState(mockItem.id);
    expect(state.fullContainers).toBe(2);

    component.updateFullContainers(mockItem.id, state.fullContainers + 1);
    expect(component.getItemState(mockItem.id).fullContainers).toBe(3);

    component.updateFullContainers(mockItem.id, state.fullContainers - 1);
    expect(component.getItemState(mockItem.id).fullContainers).toBe(2);

    component.applyFraction(mockItem, 0.5);
    expect(component.getItemState(mockItem.id).partialQuantity).toBe(35);
  });

  it('saveCount should call service and update state', fakeAsync(() => {
    component.saveCount(mockItem);
    tick();

    expect(auditServiceSpy.updateItemCount).toHaveBeenCalled();
  }));

  it('finalize confirmation modal workflow', fakeAsync(() => {
    component.openFinalizeModal();
    expect(component.isFinalizeModalOpen()).toBeTrue();

    component.confirmFinalize();
    tick();

    expect(auditServiceSpy.finalizeSession).toHaveBeenCalledWith(1);
    expect(component.isFinalizeModalOpen()).toBeFalse();
  }));

  it('export actions should trigger pdf and csv downloads', () => {
    component.exportPdf();
    expect(auditServiceSpy.downloadPdf).toHaveBeenCalledWith(1);

    component.exportCsv();
    expect(auditServiceSpy.downloadCsv).toHaveBeenCalledWith(1);
  });

  it('cancelAudit should present alert and cancel session on confirm', async () => {
    auditServiceSpy.cancelSession.and.returnValue(of({ ...mockSession, status: 'CANCELLED' }));
    await component.cancelAudit();
    expect(alertCtrlSpy.create).toHaveBeenCalled();
  });

  it('getProgress should compute ratio correctly', () => {
    expect(component.getProgress()).toBe(0.5);
  });

  it('computeItemLocationCount should calculate total location volume', () => {
    const counted = component.computeItemLocationCount(mockItem);
    expect(counted).toBe(140);
  });

  it('goBack should navigate to /inventory', () => {
    component.goBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/inventory']);
  });
});
