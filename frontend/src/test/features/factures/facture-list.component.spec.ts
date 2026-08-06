import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError, Subject } from 'rxjs';
import { IonicModule } from '@ionic/angular';
import { FactureListComponent } from '../../../app/features/factures/facture-list/facture-list.component';
import { FactureService } from '../../../app/features/factures/services/facture.service';
import { Facture } from '../../../app/features/factures/models/facture.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockFactures: Facture[] = [
  { id: 1, tableId: 1, tableNumero: 1, numero: 'FAC-001', total: 25.5, totalTTC: 25.5, items: [], reglee: false, dateFacture: '2026-01-01T10:00:00', createdAt: '2026-01-01T10:00:00', updatedAt: '2026-01-01T10:00:00' },
  { id: 2, tableId: 2, tableNumero: 2, numero: 'FAC-002', total: 40.0, totalTTC: 40.0, items: [], reglee: true,  dateFacture: '2026-01-02T10:00:00', createdAt: '2026-01-02T10:00:00', updatedAt: '2026-01-02T10:00:00' },
];

describe('FactureListComponent', () => {
  let component: FactureListComponent;
  let fixture: ComponentFixture<FactureListComponent>;
  let factureServiceSpy: jasmine.SpyObj<FactureService>;

  beforeEach(async () => {
    factureServiceSpy = jasmine.createSpyObj<FactureService>('FactureService', ['getAllFactures']);
    factureServiceSpy.getAllFactures.and.returnValue(of(mockFactures));

    await TestBed.configureTestingModule({
      imports: [
        FactureListComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: FactureService, useValue: factureServiceSpy },
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

  it('computes totalCA, settledCount, and settledRate correctly', () => {
    expect(component.totalCA).toBe(65.5);
    expect(component.settledCount).toBe(1);
    expect(component.settledRate).toBe(50);
  });

  it('filters invoices by search term and status filter', () => {
    component.searchTerm = 'FAC-001';
    expect(component.filteredFactures.length).toBe(1);
    expect(component.filteredFactures[0].numero).toBe('FAC-001');

    component.searchTerm = '';
    component.setFilter('SETTLED');
    expect(component.filteredFactures.length).toBe(1);
    expect(component.filteredFactures[0].reglee).toBeTrue();

    component.setFilter('PENDING');
    expect(component.filteredFactures.length).toBe(1);
    expect(component.filteredFactures[0].reglee).toBeFalse();
  });

  it('resetFilters() resets search term and active status filter', () => {
    component.searchTerm = 'SearchQuery';
    component.activeFilter = 'SETTLED';

    component.resetFilters();

    expect(component.searchTerm).toBe('');
    expect(component.activeFilter).toBe('ALL');
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

  it('trackById() returns invoice id', () => {
    const facture = { id: 7 } as Facture;
    expect(component.trackById(0, facture)).toBe(7);
  });

  it('ngOnDestroy() completes destroy$ subject', () => {
    const subject = new Subject<Facture[]>();
    factureServiceSpy.getAllFactures.and.returnValue(subject.asObservable());

    component.charger();
    component.ngOnDestroy();

    expect(() => subject.next([])).not.toThrow();
  });
});
