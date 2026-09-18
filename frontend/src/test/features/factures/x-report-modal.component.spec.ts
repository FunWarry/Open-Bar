import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { provideIonicAngular, ModalController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { XReportModalComponent } from '../../../app/features/factures/x-report-modal/x-report-modal.component';
import { CashDrawerService } from '../../../app/core/services/cash-drawer.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { XReport } from '../../../app/core/models/cash-drawer.model';

describe('XReportModalComponent', () => {
  let component: XReportModalComponent;
  let fixture: ComponentFixture<XReportModalComponent>;
  let cashDrawerServiceSpy: jasmine.SpyObj<CashDrawerService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  const mockReport: XReport = {
    reportDate: '2026-09-18',
    generatedAt: '2026-09-18T16:00:00Z',
    generatedBy: 'Admin',
    openingFloat: 150.0,
    totalRevenueHT: 400.0,
    totalRevenueTTC: 480.0,
    totalCashRevenue: 120.0,
    totalCashIn: 50.0,
    totalCashDrop: 30.0,
    totalPaidOut: 10.0,
    theoreticalCashInDrawer: 280.0,
    movements: [
      {
        id: 1,
        sessionId: 10,
        type: 'CASH_DROP',
        amount: 30.0,
        reason: 'Safe drop',
        timestamp: '2026-09-18T14:00:00Z'
      }
    ],
    ventilationModePaiement: [
      { modePaiement: 'ESPECES', count: 5, totalTtc: 120.0 },
      { modePaiement: 'CARTE', count: 12, totalTtc: 360.0 }
    ],
    ventilationTva: [
      { taux: 20.0, tauxLabel: '20%', baseHt: 400.0, montantTva: 80.0, totalTtc: 480.0 }
    ]
  };

  beforeEach(async () => {
    cashDrawerServiceSpy = jasmine.createSpyObj('CashDrawerService', [
      'getXReport',
      'printXReport',
      'downloadXReportPdf'
    ]);
    cashDrawerServiceSpy.getXReport.and.returnValue(of(mockReport));
    cashDrawerServiceSpy.printXReport.and.returnValue(of({
      success: true,
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      message: 'Printed',
      durationMs: 45
    }));
    cashDrawerServiceSpy.downloadXReportPdf.and.returnValue(of(new Blob(['pdf-bytes'], { type: 'application/pdf' })));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as unknown as ReturnType<ToastController['create']> extends Promise<infer U> ? U : never));

    await TestBed.configureTestingModule({
      imports: [XReportModalComponent, getTranslocoTestingModule()],
      providers: [
        provideIonicAngular(),
        { provide: CashDrawerService, useValue: cashDrawerServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(XReportModalComponent);
    component = fixture.componentInstance;
    component.date = '2026-09-18';
    fixture.detectChanges();
  });

  it('should create component and load X-Report on init', () => {
    expect(component).toBeTruthy();
    expect(component.xReport).toEqual(mockReport);
    expect(component.isLoading).toBeFalse();
    expect(cashDrawerServiceSpy.getXReport).toHaveBeenCalledWith('2026-09-18');
  });

  it('should handle load error gracefully', fakeAsync(() => {
    cashDrawerServiceSpy.getXReport.and.returnValue(throwError(() => ({
      error: { message: 'Failed to compute X-report' }
    })));

    component.loadXReport();
    tick();
    flushMicrotasks();

    expect(component.isLoading).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      message: 'Failed to compute X-report',
      color: 'danger'
    }));
  }));

  it('should print intermediate ticket via CashDrawerService', fakeAsync(() => {
    component.printTicket();
    tick();
    flushMicrotasks();

    expect(cashDrawerServiceSpy.printXReport).toHaveBeenCalledWith('2026-09-18');
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should download PDF blob on downloadPdf', fakeAsync(() => {
    component.downloadPdf();
    tick();
    flushMicrotasks();

    expect(cashDrawerServiceSpy.downloadXReportPdf).toHaveBeenCalledWith('2026-09-18');
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should map movement types to appropriate badge colors', () => {
    expect(component.getMovementColor('CASH_IN')).toBe('success');
    expect(component.getMovementColor('CASH_DROP')).toBe('warning');
    expect(component.getMovementColor('PAID_OUT')).toBe('danger');
    expect(component.getMovementColor('UNKNOWN')).toBe('medium');
  });

  it('should dismiss modal on cancel', () => {
    component.cancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null);
  });
});
