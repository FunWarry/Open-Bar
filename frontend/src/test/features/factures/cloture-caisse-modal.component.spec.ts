import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { ClotureCaisseModalComponent } from '../../../app/features/factures/cloture-caisse-modal/cloture-caisse-modal.component';
import { FactureService } from '../../../app/core/services/facture.service';
import { PrinterService } from '../../../app/core/services/printer.service';
import { DailyRecap } from '../../../app/core/models/daily-recap.model';
import { DailyCashClosure } from '../../../app/core/models/daily-cash-closure.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockDailyRecap: DailyRecap = {
  date: '2026-09-06',
  totalCaTtc: 350.00,
  totalCaHt: 291.67,
  totalTva: 58.33,
  nombreFacturesReglees: 10,
  panierMoyen: 35.00,
  nombreClients: 18,
  ventilationModePaiement: [
    { modePaiement: 'ESPECES', count: 4, totalTtc: 100.00 },
    { modePaiement: 'CARTE', count: 6, totalTtc: 250.00 }
  ],
  ventilationTva: [
    { tauxLabel: '20.0%', baseHt: 291.67, montantTva: 58.33, totalTtc: 350.00 }
  ]
};

const mockClosureResponse: DailyCashClosure = {
  id: 42,
  closureNumber: 'Z-2026-00042',
  closureDate: '2026-09-06',
  openingFloat: 150.00,
  theoreticalCash: 250.00,
  countedCash: 250.00,
  cashDiscrepancy: 0.00,
  totalRevenueHT: 291.67,
  totalRevenueTTC: 350.00,
  sha256Hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  createdAt: '2026-09-06T20:00:00Z',
  updatedAt: '2026-09-06T20:00:00Z'
};

describe('ClotureCaisseModalComponent', () => {
  let component: ClotureCaisseModalComponent;
  let fixture: ComponentFixture<ClotureCaisseModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let factureServiceSpy: jasmine.SpyObj<FactureService>;
  let printerServiceSpy: jasmine.SpyObj<PrinterService>;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    factureServiceSpy = jasmine.createSpyObj('FactureService', [
      'cloturerCaisse',
      'downloadZReportPdf',
      'downloadFecExport'
    ]);
    factureServiceSpy.cloturerCaisse.and.returnValue(of(mockClosureResponse));
    factureServiceSpy.downloadZReportPdf.and.returnValue(of(new Blob(['pdf-data'])));
    factureServiceSpy.downloadFecExport.and.returnValue(of(new Blob(['fec-data'])));

    printerServiceSpy = jasmine.createSpyObj('PrinterService', ['printZReport']);
    printerServiceSpy.printZReport.and.returnValue(of({
      success: true,
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      message: 'Printed successfully',
      durationMs: 120
    }));

    await TestBed.configureTestingModule({
      imports: [ClotureCaisseModalComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: FactureService, useValue: factureServiceSpy },
        { provide: PrinterService, useValue: printerServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClotureCaisseModalComponent);
    component = fixture.componentInstance;
    component.date = '2026-09-06';
    component.recap = mockDailyRecap;
    fixture.detectChanges();
  });

  it('should create component with default step 1 and initial opening float', () => {
    expect(component).toBeTruthy();
    expect(component.currentStep).toBe(1);
    expect(component.openingFloat).toBe(150.0);
    expect(component.cashRevenue).toBe(100.0);
    expect(component.theoreticalCash).toBe(250.0);
  });

  it('should correctly compute live counted cash and discrepancy from coin and bill entries', () => {
    component.currentStep = 2;
    component.adjustCount('50e', 4); // 200 €
    component.adjustCount('20e', 2); // 40 €
    component.adjustCount('10e', 1); // 10 €

    expect(component.countedCash).toBe(250.0);
    expect(component.cashDiscrepancy).toBe(0.0);
    expect(component.hasDiscrepancy).toBeFalse();

    // Add 5 € surplus
    component.adjustCount('5e', 1);
    expect(component.countedCash).toBe(255.0);
    expect(component.cashDiscrepancy).toBe(5.0);
    expect(component.hasDiscrepancy).toBeTrue();
  });

  it('should navigate between steps sequentially', () => {
    expect(component.currentStep).toBe(1);
    component.goToNextStep();
    expect(component.currentStep).toBe(2);

    component.goToNextStep();
    expect(component.currentStep).toBe(3);

    component.goToPrevStep();
    expect(component.currentStep).toBe(2);
  });

  it('should block step 3 progression if discrepancy exists without a justification note', fakeAsync(() => {
    component.currentStep = 3;
    // Force discrepancy
    component.counting['50e'] = 1; // 50 counted vs 250 expected
    component.discrepancyReason = '';

    component.goToNextStep();
    tick();
    flushMicrotasks();

    expect(component.currentStep).toBe(3);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'warning' }));

    // Provide justification note
    component.discrepancyReason = 'Refund error at cash desk';
    component.goToNextStep();
    expect(component.currentStep as number).toBe(4);
  }));

  it('confirmClosure() should call factureService and transition to step 5 on success', fakeAsync(() => {
    component.currentStep = 4;
    component.confirmClosure();
    tick();
    flushMicrotasks();

    expect(factureServiceSpy.cloturerCaisse).toHaveBeenCalledWith(jasmine.objectContaining({
      date: '2026-09-06',
      openingFloat: 150.0,
      countedCash: 0.0
    }));
    expect(component.currentStep as number).toBe(5);
    expect(component.createdClosure).toEqual(mockClosureResponse);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('confirmClosure() should show error toast on API failure', fakeAsync(() => {
    component.currentStep = 4;
    factureServiceSpy.cloturerCaisse.and.returnValue(throwError(() => ({ error: { message: 'Already closed' } })));

    component.confirmClosure();
    tick();
    flushMicrotasks();

    expect(component.isSubmitting).toBeFalse();
    expect(component.currentStep).toBe(4);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('printZReport() should call printerService and show success feedback', fakeAsync(() => {
    component.createdClosure = mockClosureResponse;
    component.printZReport();
    tick();
    flushMicrotasks();

    expect(printerServiceSpy.printZReport).toHaveBeenCalledWith(42);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('printZReport() should handle print failure or service error gracefully', fakeAsync(() => {
    component.createdClosure = mockClosureResponse;
    printerServiceSpy.printZReport.and.returnValue(of({
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      success: false,
      message: 'Printer unreachable',
      durationMs: 100,
    }));

    component.printZReport();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'warning' }));

    // Service throws error
    printerServiceSpy.printZReport.and.returnValue(throwError(() => new Error('Socket timeout')));
    component.printZReport();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('downloadPdf() and downloadFec() should trigger file downloads', fakeAsync(() => {
    component.createdClosure = mockClosureResponse;

    component.downloadPdf();
    tick();
    flushMicrotasks();
    expect(factureServiceSpy.downloadZReportPdf).toHaveBeenCalledWith(42);

    component.downloadFec();
    tick();
    flushMicrotasks();
    expect(factureServiceSpy.downloadFecExport).toHaveBeenCalledWith(42);
  }));

  it('downloadPdf() and downloadFec() should handle errors gracefully', fakeAsync(() => {
    component.createdClosure = mockClosureResponse;
    factureServiceSpy.downloadZReportPdf.and.returnValue(throwError(() => new Error('PDF fail')));
    component.downloadPdf();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));

    factureServiceSpy.downloadFecExport.and.returnValue(throwError(() => new Error('FEC fail')));
    component.downloadFec();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('copySealHash() should write hash to clipboard and show toast', fakeAsync(() => {
    component.createdClosure = mockClosureResponse;
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

    component.copySealHash();
    tick();
    flushMicrotasks();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockClosureResponse.sha256Hash);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('goToPrevStep() should do nothing when on step 1', () => {
    component.currentStep = 1;
    component.goToPrevStep();
    expect(component.currentStep).toBe(1);
  });

  it('dismiss() should close modal with data', () => {
    component.createdClosure = mockClosureResponse;
    component.dismiss(true);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ closed: true, closure: mockClosureResponse });
  });
});
