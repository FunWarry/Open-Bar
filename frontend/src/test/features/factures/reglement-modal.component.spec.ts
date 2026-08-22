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

  it('validerReglement() with ESPECES mode includes montantRecu and monnaieARendre', () => {
    component.modePaiement = 'ESPECES';
    component.setTipMode('none');
    component.montantRecu = 60.00;
    component.validerReglement();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      modePaiement: 'ESPECES',
      pourboire: 0,
      totalTotal: 50.00,
      montantRecu: 60.00,
      monnaieARendre: 10.00
    });
  });

  it('supports 15pct tip mode, custom tip adjustment and presets', () => {
    component.setTipMode('15pct');
    expect(component.pourboire).toBe(7.50);
    expect(component.totalAvecPourboire).toBe(57.50);

    component.setTipMode('custom');
    component.adjustCustomTip(2.5);
    expect(component.pourboire).toBe(2.5);

    component.adjustCustomTip(-1.0);
    expect(component.pourboire).toBe(1.5);
  });

  it('handles cash presets and payment selection', () => {
    component.selectPaymentMethod('ESPECES');
    expect(component.paymentMethod).toBe('ESPECES');
    expect(component.receivedAmount).toBe(50.00);

    component.setCashAmount(100);
    expect(component.receivedAmount).toBe(100);
    expect(component.monnaieARendre).toBe(50.00);

    component.setExactCash();
    expect(component.receivedAmount).toBe(50.00);
  });

  it('handles negative or zero initialTotal gracefully', () => {
    component.initialTotal = -10;
    component.ngOnInit();
    expect(component.initialTotal).toBe(0);
    expect(component.getTipAmount(10)).toBe(0);
  });

  it('resets totalInitial to 0 if negative on init', () => {
    const fixture2 = TestBed.createComponent(ReglementModalComponent);
    const comp2 = fixture2.componentInstance;
    comp2.totalInitial = -10;
    comp2.ngOnInit();
    expect(comp2.totalInitial).toBe(0);
  });

  it('handles negative or null custom pourboire as 0', () => {
    component.setTipMode('custom');
    component.customPourboire = -5;
    expect(component.pourboire).toBe(0);
  });

  it('returns true for isMontantRecuSuffisant when mode is not ESPECES or montantRecu is null', () => {
    component.modePaiement = 'CARTE';
    expect(component.isMontantRecuSuffisant).toBeTrue();

    component.modePaiement = 'ESPECES';
    component.montantRecu = null;
    expect(component.isMontantRecuSuffisant).toBeTrue();
  });

  it('tests English property aliases and cancel/confirmPayment methods', () => {
    component.paymentMethod = 'CARTE';
    expect(component.modePaiement).toBe('CARTE');

    component.customTip = 4.00;
    expect(component.customPourboire).toBe(4.00);

    component.receivedAmount = 70.00;
    expect(component.montantRecu).toBe(70.00);

    component.setTipMode('none');
    expect(component.customTip).toBe(0);

    component.cancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null);

    component.confirmPayment();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });

  it('should return currency symbol from appSettingsService', () => {
    expect(component.currencySymbol).toBe('€');
  });
});
