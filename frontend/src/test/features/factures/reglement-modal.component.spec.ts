import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { ReglementModalComponent } from '../../../app/features/factures/reglement-modal/reglement-modal.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('ReglementModalComponent', () => {
  let component: ReglementModalComponent;
  let fixture: ComponentFixture<ReglementModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    await TestBed.configureTestingModule({
      imports: [
        ReglementModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReglementModalComponent);
    component = fixture.componentInstance;
    component.totalInitial = 50.00;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute initial total and default no tip correctly', () => {
    expect(component.totalInitial).toBe(50.00);
    expect(component.pourboire).toBe(0);
    expect(component.totalAvecPourboire).toBe(50.00);
  });

  it('should calculate 5% tip correctly', () => {
    component.setTipMode('5pct');
    expect(component.pourboire).toBe(2.50);
    expect(component.totalAvecPourboire).toBe(52.50);
  });

  it('should calculate 10% tip correctly', () => {
    component.setTipMode('10pct');
    expect(component.pourboire).toBe(5.00);
    expect(component.totalAvecPourboire).toBe(55.00);
  });

  it('should handle custom tip mode correctly', () => {
    component.setTipMode('custom');
    component.customPourboire = 3.50;
    expect(component.pourboire).toBe(3.50);
    expect(component.totalAvecPourboire).toBe(53.50);
  });

  it('should calculate cash change correctly', () => {
    component.modePaiement = 'ESPECES';
    component.setTipMode('none');
    component.montantRecu = 60.00;
    expect(component.monnaieARendre).toBe(10.00);
    expect(component.isMontantRecuSuffisant).toBeTrue();
  });

  it('should flag insufficient cash received', () => {
    component.modePaiement = 'ESPECES';
    component.montantRecu = 40.00;
    expect(component.monnaieARendre).toBe(0);
    expect(component.isMontantRecuSuffisant).toBeFalse();
  });

  it('annuler() dismisses modal with null', () => {
    component.annuler();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null);
  });

  it('validerReglement() dismisses modal with payment payload', () => {
    component.modePaiement = 'CARTE';
    component.setTipMode('5pct');
    component.validerReglement();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      modePaiement: 'CARTE',
      pourboire: 2.50,
      totalTotal: 52.50,
      montantRecu: undefined,
      monnaieARendre: undefined
    });
  });
});
