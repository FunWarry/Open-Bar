import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastController, AlertController, provideIonicAngular } from '@ionic/angular';
import { InventorySessionsComponent } from '../../../app/features/inventory/inventory-sessions/inventory-sessions.component';
import { InventoryAuditService } from '../../../app/core/services/inventory-audit.service';
import { InventoryAuditSession } from '../../../app/core/models/inventory-audit.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('InventorySessionsComponent', () => {
  let component: InventorySessionsComponent;
  let fixture: ComponentFixture<InventorySessionsComponent>;
  let auditServiceSpy: jasmine.SpyObj<InventoryAuditService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;

  const mockToast = { present: jasmine.createSpy('present') };
  const mockAlert = { present: jasmine.createSpy('present') };

  const mockSessions: InventoryAuditSession[] = [
    {
      id: 1,
      referenceCode: 'INV-20260927-001',
      title: 'Spirits Monthly Audit',
      status: 'IN_PROGRESS',
      storageLocationScope: 'ALL',
      categoryScope: 'alcohol',
      createdByUsername: 'manager',
      createdAt: '2026-09-27T10:00:00Z',
      totalTheoreticalValueHt: 1000,
      totalCountedValueHt: 950,
      totalVarianceValueHt: -50,
      totalItemsCount: 10,
      countedItemsCount: 5,
    },
    {
      id: 2,
      referenceCode: 'INV-20260920-001',
      title: 'Wine Cellar Audit',
      status: 'FINALIZED',
      storageLocationScope: 'Cave à vins & Spiritueux',
      categoryScope: 'alcohol',
      createdByUsername: 'admin',
      createdAt: '2026-09-20T10:00:00Z',
      finalizedAt: '2026-09-20T12:00:00Z',
      totalTheoreticalValueHt: 2000,
      totalCountedValueHt: 2050,
      totalVarianceValueHt: 50,
      totalItemsCount: 20,
      countedItemsCount: 20,
    },
  ];

  beforeEach(async () => {
    auditServiceSpy = jasmine.createSpyObj('InventoryAuditService', [
      'getAllSessions',
      'createSession',
      'downloadPdf',
      'downloadCsv',
    ]);
    auditServiceSpy.getAllSessions.and.returnValue(of(mockSessions));
    auditServiceSpy.downloadPdf.and.returnValue(of(new Blob(['%PDF-1.4'], { type: 'application/pdf' })));
    auditServiceSpy.downloadCsv.and.returnValue(of(new Blob(['data'], { type: 'text/csv' })));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as unknown as HTMLIonToastElement));

    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrlSpy.create.and.returnValue(Promise.resolve(mockAlert as unknown as HTMLIonAlertElement));

    await TestBed.configureTestingModule({
      imports: [
        InventorySessionsComponent,
        getTranslocoTestingModule(),
      ],
      providers: [
        provideIonicAngular(),
        { provide: InventoryAuditService, useValue: auditServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventorySessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load sessions on init', () => {
    expect(component).toBeTruthy();
    expect(auditServiceSpy.getAllSessions).toHaveBeenCalled();
    expect(component.sessions()).toHaveSize(2);
  });

  it('should compute KPI values accurately', () => {
    expect(component.totalAuditsCount()).toBe(2);
    expect(component.activeSessionsCount()).toBe(1);
    expect(component.totalNetVarianceHt()).toBe(50);
    expect(component.totalShrinkageLossHt()).toBe(0);
  });

  it('should filter sessions by status', () => {
    component.setFilter('IN_PROGRESS');
    expect(component.filteredSessions()).toHaveSize(1);
    expect(component.filteredSessions()[0].id).toBe(1);

    component.setFilter('FINALIZED');
    expect(component.filteredSessions()).toHaveSize(1);
    expect(component.filteredSessions()[0].id).toBe(2);

    component.setFilter('ALL');
    expect(component.filteredSessions()).toHaveSize(2);
  });

  it('should filter sessions by search query', () => {
    component.onSearch('Wine');
    expect(component.filteredSessions()).toHaveSize(1);
    expect(component.filteredSessions()[0].title).toBe('Wine Cellar Audit');

    component.onSearch('INV-20260927');
    expect(component.filteredSessions()).toHaveSize(1);
    expect(component.filteredSessions()[0].id).toBe(1);
  });

  it('openSession should navigate to detail page', () => {
    component.openSession(mockSessions[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/inventory', 1]);
  });

  it('openCreateModal should open modal and init form', () => {
    component.openCreateModal();
    expect(component.isCreateModalOpen()).toBeTrue();
    expect(component.createForm.valid).toBeTrue();

    component.createForm.patchValue({ title: '' });
    expect(component.createForm.valid).toBeFalse();

    component.createForm.patchValue({ title: 'New Stocktake' });
    expect(component.createForm.valid).toBeTrue();

    component.closeCreateModal();
    expect(component.isCreateModalOpen()).toBeFalse();
  });

  it('submitCreate should create session and navigate to counting sheet', fakeAsync(() => {
    const createdSession: InventoryAuditSession = {
      ...mockSessions[0],
      id: 3,
      referenceCode: 'INV-20260927-003',
      title: 'New Stocktake',
    };
    auditServiceSpy.createSession.and.returnValue(of(createdSession));

    component.openCreateModal();
    component.createForm.patchValue({
      title: 'New Stocktake',
      storageLocationScope: 'Main Bar',
      categoryScope: 'alcohol',
      notes: 'Initial check',
    });

    component.submitCreate();
    tick();

    expect(auditServiceSpy.createSession).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/inventory', 3]);
  }));

  it('exportPdf should trigger downloadPdf from service', () => {
    const mockEvent = new MouseEvent('click');
    spyOn(mockEvent, 'stopPropagation');

    component.exportPdf(mockSessions[0], mockEvent);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(auditServiceSpy.downloadPdf).toHaveBeenCalledWith(1);
  });

  it('exportCsv should trigger downloadCsv from service', () => {
    const mockEvent = new MouseEvent('click');
    spyOn(mockEvent, 'stopPropagation');

    component.exportCsv(mockSessions[0], mockEvent);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(auditServiceSpy.downloadCsv).toHaveBeenCalledWith(1);
  });
});
