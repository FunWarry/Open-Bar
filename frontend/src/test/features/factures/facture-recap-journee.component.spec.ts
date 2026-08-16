import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { FactureRecapJourneeComponent } from '../../../app/features/factures/facture-recap-journee/facture-recap-journee.component';
import { FactureService } from '../../../app/core/services/facture.service';
import { DailyRecap } from '../../../app/core/models/daily-recap.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockDailyRecap: DailyRecap = {
  date: '2026-08-02',
  totalCaTtc: 100,
  totalCaHt: 83.33,
  totalTva: 16.67,
  nombreFacturesReglees: 4,
  panierMoyen: 25,
  nombreClients: 8,
  ventilationModePaiement: [
    { modePaiement: 'CARTE', count: 3, totalTtc: 75 },
    { modePaiement: 'ESPECES', count: 1, totalTtc: 25 },
  ],
  ventilationTva: [
    { tauxLabel: '20.0%', baseHt: 83.33, montantTva: 16.67, totalTtc: 100 },
  ],
};

describe('FactureRecapJourneeComponent', () => {
  let component: FactureRecapJourneeComponent;
  let fixture: ComponentFixture<FactureRecapJourneeComponent>;
  let factureServiceSpy: jasmine.SpyObj<FactureService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    factureServiceSpy = jasmine.createSpyObj('FactureService', ['getDailyRecap', 'downloadDailyRecapPdf']);
    factureServiceSpy.getDailyRecap.and.returnValue(of(mockDailyRecap));
    factureServiceSpy.downloadDailyRecapPdf.and.returnValue(of(new Blob(['pdf-bytes'])));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [FactureRecapJourneeComponent, IonicModule.forRoot(), getTranslocoTestingModule()],
      providers: [
        { provide: FactureService, useValue: factureServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FactureRecapJourneeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('charger() peuple recap depuis le service', fakeAsync(() => {
    component.charger();
    tick();
    expect(component.recap).toEqual(mockDailyRecap);
    expect(factureServiceSpy.getDailyRecap).toHaveBeenCalled();
  }));

  it('charger() affiche un toast danger en cas d\'erreur API', fakeAsync(() => {
    factureServiceSpy.getDailyRecap.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('exportPdf() triggers PDF download', fakeAsync(() => {
    component.recap = mockDailyRecap;
    component.exportPdf();
    tick();
    flushMicrotasks();
    expect(factureServiceSpy.downloadDailyRecapPdf).toHaveBeenCalledWith(component.selectedDate);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('onDateChange() reloads recap for chosen date', fakeAsync(() => {
    component.onDateChange({ target: { value: '2026-08-01' } });
    tick();
    expect(component.selectedDate).toBe('2026-08-01');
    expect(factureServiceSpy.getDailyRecap).toHaveBeenCalledWith('2026-08-01');
  }));

  it('getPaymentModeColor() retourne la couleur Ionic correspondant au mode', () => {
    expect(component.getPaymentModeColor('CARTE')).toBe('primary');
    expect(component.getPaymentModeColor('ESPECES')).toBe('success');
    expect(component.getPaymentModeColor('CHEQUE')).toBe('warning');
    expect(component.getPaymentModeColor('AUTRE')).toBe('medium');
  });

  it('getPaymentModePercentage() calcule correctement le pourcentage du CA', () => {
    component.recap = mockDailyRecap;
    const pm = mockDailyRecap.ventilationModePaiement[0]; // 75 sur 100
    expect(component.getPaymentModePercentage(pm)).toBe(75);
  });
});
