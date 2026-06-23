import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError, Subject } from 'rxjs';
import { IonicModule } from '@ionic/angular';
import { FactureListComponent } from '../../../app/features/factures/facture-list/facture-list.component';
import { FactureService } from '../../../app/features/factures/services/facture.service';
import { Facture } from '../../../app/features/factures/models/facture.model';

const mockFactures: Facture[] = [
  { id: 1, tableId: 1, tableNumero: 1, numero: 'F-001', total: 25.5, items: [], reglee: false, dateFacture: '2026-01-01T10:00:00', createdAt: '2026-01-01T10:00:00', updatedAt: '2026-01-01T10:00:00' },
  { id: 2, tableId: 2, tableNumero: 2, numero: 'F-002', total: 40.0, items: [], reglee: true,  dateFacture: '2026-01-02T10:00:00', createdAt: '2026-01-02T10:00:00', updatedAt: '2026-01-02T10:00:00' },
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
      ],
      providers: [
        { provide: FactureService, useValue: factureServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FactureListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // --- création ---

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // --- ngOnInit / charger() ---

  it('charger() charge les factures depuis le service au démarrage', () => {
    expect(factureServiceSpy.getAllFactures).toHaveBeenCalled();
    expect(component.factures).toEqual(mockFactures);
    expect(component.loading).toBeFalse();
  });

  it('charger() met loading à true pendant le chargement puis à false ensuite', fakeAsync(() => {
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

  it('charger() remet loading à false en cas d\'erreur HTTP', fakeAsync(() => {
    factureServiceSpy.getAllFactures.and.returnValue(throwError(() => new Error('500')));

    component.charger();
    tick();

    expect(component.loading).toBeFalse();
  }));

  // --- onRefresh() ---

  it('onRefresh() recharge les factures et appelle target.complete()', fakeAsync(() => {
    const completeSpy = jasmine.createSpy('complete');
    const fakeEvent = { target: { complete: completeSpy } } as unknown as CustomEvent;
    factureServiceSpy.getAllFactures.and.returnValue(of(mockFactures));

    component.onRefresh(fakeEvent);
    tick();

    expect(factureServiceSpy.getAllFactures).toHaveBeenCalled();
    expect(component.factures).toEqual(mockFactures);
    expect(completeSpy).toHaveBeenCalled();
  }));

  it('onRefresh() appelle target.complete() même en cas d\'erreur', fakeAsync(() => {
    const completeSpy = jasmine.createSpy('complete');
    const fakeEvent = { target: { complete: completeSpy } } as unknown as CustomEvent;
    factureServiceSpy.getAllFactures.and.returnValue(throwError(() => new Error('network')));

    component.onRefresh(fakeEvent);
    tick();

    expect(completeSpy).toHaveBeenCalled();
  }));

  // --- statutColor() ---

  it('statutColor() retourne "success" si reglee est true', () => {
    expect(component.statutColor(true)).toBe('success');
  });

  it('statutColor() retourne "warning" si reglee est false', () => {
    expect(component.statutColor(false)).toBe('warning');
  });

  // --- statutLabel() ---

  it('statutLabel() retourne "RÉGLÉE" si reglee est true', () => {
    expect(component.statutLabel(true)).toBe('RÉGLÉE');
  });

  it('statutLabel() retourne "EN ATTENTE" si reglee est false', () => {
    expect(component.statutLabel(false)).toBe('EN ATTENTE');
  });

  // --- trackById() ---

  it('trackById() retourne l\'id de la facture', () => {
    const facture = { id: 7 } as Facture;
    expect(component.trackById(0, facture)).toBe(7);
  });

  // --- ngOnDestroy() ---

  it('ngOnDestroy() complète le subject destroy$ et arrête les souscriptions', () => {
    const subject = new Subject<Facture[]>();
    factureServiceSpy.getAllFactures.and.returnValue(subject.asObservable());

    component.charger();
    component.ngOnDestroy();

    // Aucune erreur ne doit se produire quand le flux émet après destroy
    expect(() => subject.next([])).not.toThrow();
    expect(component.factures).toEqual(mockFactures); // valeur initiale inchangée après destroy
  });
});
