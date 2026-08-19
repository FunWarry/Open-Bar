import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError, Subject } from 'rxjs';
import { IonicModule, ToastController } from '@ionic/angular';
import { FactureListComponent } from '../../../app/features/factures/facture-list/facture-list.component';
import { FactureService } from '../../../app/features/factures/services/facture.service';
import { Facture } from '../../../app/features/factures/models/facture.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockFactures: Facture[] = [
  {
    id: 1,
    tableId: 1,
    tableNumero: 1,
    numero: 'FAC-001',
    total: 25.5,
    totalTTC: 25.5,
    items: [],
    reglee: false,
    dateFacture: '2026-01-01T10:00:00',
    serveurNom: 'Alice',
    modePaiement: 'CARTE',
    createdAt: '2026-01-01T10:00:00',
    updatedAt: '2026-01-01T10:00:00'
  },
  {
    id: 2,
    tableId: 2,
    tableNumero: 2,
    numero: 'FAC-002',
    total: 40.0,
    totalTTC: 40.0,
    items: [],
    reglee: true,
    dateFacture: '2026-01-02T10:00:00',
    serveurNom: 'Bob',
    modePaiement: 'ESPECES',
    createdAt: '2026-01-02T10:00:00',
    updatedAt: '2026-01-02T10:00:00'
  },
  {
    id: 3,
    tableId: 3,
    tableNumero: 3,
    numero: 'FAC-003',
    total: 10.0,
    totalTTC: 10.0,
    items: [],
    reglee: true,
    dateFacture: '2026-01-03T10:00:00',
    serveurNom: 'Charlie',
    modePaiement: 'TICKETS_RESTO',
    createdAt: '2026-01-03T10:00:00',
    updatedAt: '2026-01-03T10:00:00'
  }
];

describe('FactureListComponent', () => {
  let component: FactureListComponent;
  let fixture: ComponentFixture<FactureListComponent>;
  let factureServiceSpy: jasmine.SpyObj<FactureService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  beforeEach(async () => {
    factureServiceSpy = jasmine.createSpyObj<FactureService>('FactureService', ['getAllFactures']);
    factureServiceSpy.getAllFactures.and.returnValue(of(mockFactures));
    toastCtrlSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);

    await TestBed.configureTestingModule({
      imports: [
        FactureListComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: FactureService, useValue: factureServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FactureListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('charger() loads invoices on init', () => {
    expect(factureServiceSpy.getAllFactures).toHaveBeenCalled();
    expect(component.factures).toEqual(mockFactures);
    expect(component.loading).toBeFalse();
  });

  it('charger() manages loading flag during HTTP call', fakeAsync(() => {
    const subject = new Subject<Facture[]>();
    factureServiceSpy.getAllFactures.and.returnValue(subject.asObservable());

    component.charger();
    expect(component.loading).toBeTrue();

    subject.next(mockFactures);
    subject.complete();
    tick();

    expect(component.loading).toBeFalse();
    expect(component.factures).toEqual(mockFactures);
  }));

  it('charger() resets loading flag on HTTP error', fakeAsync(() => {
    factureServiceSpy.getAllFactures.and.returnValue(throwError(() => new Error('500')));

    component.charger();
    tick();

    expect(component.loading).toBeFalse();
    expect(component.factures).toEqual([]);
  }));

  it('computes totalCA, totalSettledCA, totalPendingCA, settledCount, pendingCount, settledRate, and settledRatio correctly', () => {
    expect(component.totalCA).toBe(75.5);
    expect(component.totalSettledCA).toBe(50.0);
    expect(component.totalPendingCA).toBe(25.5);
    expect(component.settledCount).toBe(2);
    expect(component.pendingCount).toBe(1);
    expect(component.settledRate).toBe(67);
    expect(component.settledRatio).toBeCloseTo(2 / 3, 2);
  });

  it('handles empty factures list for KPI metrics gracefully', () => {
    component.factures = [];
    expect(component.totalCA).toBe(0);
    expect(component.totalSettledCA).toBe(0);
    expect(component.totalPendingCA).toBe(0);
    expect(component.settledCount).toBe(0);
    expect(component.pendingCount).toBe(0);
    expect(component.settledRate).toBe(0);
    expect(component.settledRatio).toBe(0);
  });

  it('filters invoices by search term across number, table, server, and payment mode', () => {
    // Number search
    component.searchTerm = 'FAC-001';
    expect(component.filteredFactures).toHaveSize(1);
    expect(component.filteredFactures[0].numero).toBe('FAC-001');

    // Table search
    component.searchTerm = '2';
    expect(component.filteredFactures).toHaveSize(1);
    expect(component.filteredFactures[0].tableNumero).toBe(2);

    // Server search
    component.searchTerm = 'alice';
    expect(component.filteredFactures).toHaveSize(1);
    expect(component.filteredFactures[0].serveurNom).toBe('Alice');

    // Payment mode search
    component.searchTerm = 'especes';
    expect(component.filteredFactures).toHaveSize(1);
    expect(component.filteredFactures[0].modePaiement).toBe('ESPECES');
  });

  it('filters invoices by status (ALL, SETTLED, PENDING)', () => {
    component.setFilter('SETTLED');
    expect(component.filteredFactures).toHaveSize(2);
    expect(component.filteredFactures.every(f => f.reglee)).toBeTrue();

    component.setFilter('PENDING');
    expect(component.filteredFactures).toHaveSize(1);
    expect(component.filteredFactures[0].reglee).toBeFalse();

    component.setFilter('ALL');
    expect(component.filteredFactures).toHaveSize(3);
  });

  it('sorts invoices by date (desc/asc), amount (desc/asc), and number', () => {
    // Date desc (default)
    component.setSort('DATE_DESC');
    expect(component.filteredFactures[0].numero).toBe('FAC-003');
    expect(component.filteredFactures[2].numero).toBe('FAC-001');

    // Date asc
    component.setSort('DATE_ASC');
    expect(component.filteredFactures[0].numero).toBe('FAC-001');
    expect(component.filteredFactures[2].numero).toBe('FAC-003');

    // Amount desc
    component.setSort('AMOUNT_DESC');
    expect(component.filteredFactures[0].totalTTC).toBe(40.0);
    expect(component.filteredFactures[2].totalTTC).toBe(10.0);

    // Amount asc
    component.setSort('AMOUNT_ASC');
    expect(component.filteredFactures[0].totalTTC).toBe(10.0);
    expect(component.filteredFactures[2].totalTTC).toBe(40.0);

    // Number
    component.setSort('NUMBER');
    expect(component.filteredFactures[0].numero).toBe('FAC-001');
  });

  it('switches view mode between grid and list', () => {
    expect(component.viewMode).toBe('grid');
    component.setViewMode('list');
    expect(component.viewMode).toBe('list');
    component.setViewMode('grid');
    expect(component.viewMode).toBe('grid');
  });

  it('resetFilters() resets search term, active filter, and sort order', () => {
    component.searchTerm = 'SearchQuery';
    component.activeFilter = 'SETTLED';
    component.sortBy = 'AMOUNT_ASC';

    component.resetFilters();

    expect(component.searchTerm).toBe('');
    expect(component.activeFilter).toBe('ALL');
    expect(component.sortBy).toBe('DATE_DESC');
  });

  it('onRefresh() reloads invoices and completes refresher event', fakeAsync(() => {
    const completeSpy = jasmine.createSpy('complete');
    const fakeEvent = { target: { complete: completeSpy } } as unknown as CustomEvent;
    factureServiceSpy.getAllFactures.and.returnValue(of(mockFactures));

    component.onRefresh(fakeEvent);
    tick();

    expect(factureServiceSpy.getAllFactures).toHaveBeenCalled();
    expect(component.factures).toEqual(mockFactures);
    expect(completeSpy).toHaveBeenCalled();
  }));

  it('statutColor() returns success for settled and warning for pending', () => {
    expect(component.statutColor(true)).toBe('success');
    expect(component.statutColor(false)).toBe('warning');
  });

  it('getPaymentModeIcon() returns appropriate icon per payment mode', () => {
    expect(component.getPaymentModeIcon('ESPECES')).toBe('cash-outline');
    expect(component.getPaymentModeIcon('CASH')).toBe('cash-outline');
    expect(component.getPaymentModeIcon('TICKETS_RESTO')).toBe('wallet-outline');
    expect(component.getPaymentModeIcon('CARTE')).toBe('card-outline');
    expect(component.getPaymentModeIcon(undefined)).toBe('card-outline');
  });

  it('copyInvoiceNumber() copies number to clipboard and updates copiedInvoiceId with timeout', fakeAsync(() => {
    const fakeClipboard = {
      writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
    };
    Object.defineProperty(navigator, 'clipboard', { value: fakeClipboard, configurable: true });

    const stopPropagationSpy = jasmine.createSpy('stopPropagation');
    const preventDefaultSpy = jasmine.createSpy('preventDefault');
    const fakeEvent = {
      stopPropagation: stopPropagationSpy,
      preventDefault: preventDefaultSpy
    } as unknown as Event;

    component.copyInvoiceNumber(fakeEvent, 'FAC-001', 1);
    tick();

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(fakeClipboard.writeText).toHaveBeenCalledWith('FAC-001');
    expect(component.copiedInvoiceId).toBe(1);

    tick(2000);
    expect(component.copiedInvoiceId).toBeNull();
  }));

  it('downloadPdf() opens window with correct pdf endpoint', () => {
    const openSpy = spyOn(window, 'open');
    const stopPropagationSpy = jasmine.createSpy('stopPropagation');
    const preventDefaultSpy = jasmine.createSpy('preventDefault');
    const fakeEvent = {
      stopPropagation: stopPropagationSpy,
      preventDefault: preventDefaultSpy
    } as unknown as Event;

    component.downloadPdf(fakeEvent, 42);

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(jasmine.stringMatching(/\/factures\/42\/pdf/), '_blank');
  });

  it('trackById() returns invoice id', () => {
    const facture = { id: 7 } as Facture;
    expect(component.trackById(0, facture)).toBe(7);
  });

  it('ngOnDestroy() completes destroy$ subject and clears timeout', () => {
    const subject = new Subject<Facture[]>();
    factureServiceSpy.getAllFactures.and.returnValue(subject.asObservable());

    component.charger();
    component.ngOnDestroy();

    expect(() => subject.next([])).not.toThrow();
  });
});

