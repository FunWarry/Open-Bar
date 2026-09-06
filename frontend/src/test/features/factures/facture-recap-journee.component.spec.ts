import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { FactureRecapJourneeComponent } from '../../../app/features/factures/facture-recap-journee/facture-recap-journee.component';
import { FactureService } from '../../../app/core/services/facture.service';
import { PrinterService } from '../../../app/core/services/printer.service';
import { DailyRecap } from '../../../app/core/models/daily-recap.model';
import { DailyCashClosure } from '../../../app/core/models/daily-cash-closure.model';
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

const mockClosure: DailyCashClosure = {
  id: 10,
  closureNumber: 'Z-2026-00010',
  closureDate: '2026-08-02',
  openingFloat: 150.00,
  theoreticalCash: 175.00,
  countedCash: 175.00,
  cashDiscrepancy: 0.00,
  totalRevenueHT: 83.33,
  totalRevenueTTC: 100.00,
  sha256Hash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
  createdAt: '2026-08-02T23:30:00Z',
  updatedAt: '2026-08-02T23:30:00Z'
};

describe('FactureRecapJourneeComponent', () => {
  let component: FactureRecapJourneeComponent;
  let fixture: ComponentFixture<FactureRecapJourneeComponent>;
  let factureServiceSpy: jasmine.SpyObj<FactureService>;
  let printerServiceSpy: jasmine.SpyObj<PrinterService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockToast = { present: jasmine.createSpy('present') };
  const mockModal = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: { closed: true } }))
  };

  beforeEach(async () => {
    factureServiceSpy = jasmine.createSpyObj('FactureService', [
      'getDailyRecap',
      'downloadDailyRecapPdf',
      'getClotureByDate',
      'downloadZReportPdf',
      'downloadFecExport'
    ]);
    factureServiceSpy.getDailyRecap.and.returnValue(of(mockDailyRecap));
    factureServiceSpy.downloadDailyRecapPdf.and.returnValue(of(new Blob(['pdf-bytes'])));
    factureServiceSpy.getClotureByDate.and.returnValue(of(null));
    factureServiceSpy.downloadZReportPdf.and.returnValue(of(new Blob(['z-pdf-bytes'])));
    factureServiceSpy.downloadFecExport.and.returnValue(of(new Blob(['fec-bytes'])));

    printerServiceSpy = jasmine.createSpyObj('PrinterService', ['printZReport']);
    printerServiceSpy.printZReport.and.returnValue(of({
      success: true,
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      message: 'Printed successfully',
      durationMs: 120
    }));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    await TestBed.configureTestingModule({
      imports: [FactureRecapJourneeComponent, IonicModule.forRoot(), getTranslocoTestingModule()],
      providers: [
        { provide: FactureService, useValue: factureServiceSpy },
        { provide: PrinterService, useValue: printerServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
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

  it('charger() peuple recap et closure status depuis le service', fakeAsync(() => {
    factureServiceSpy.getClotureByDate.and.returnValue(of(mockClosure));
    component.charger();
    tick();
    expect(component.recap).toEqual(mockDailyRecap);
    expect(component.currentClosure).toEqual(mockClosure);
    expect(factureServiceSpy.getDailyRecap).toHaveBeenCalled();
    expect(factureServiceSpy.getClotureByDate).toHaveBeenCalledWith(component.selectedDate);
  }));

  it('charger() displays a toast danger en cas d\'erreur API', fakeAsync(() => {
    factureServiceSpy.getDailyRecap.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('openClotureModal() should present ClotureCaisseModal and reload on close', fakeAsync(() => {
    component.recap = mockDailyRecap;
    component.openClotureModal();
    tick();
    flushMicrotasks();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(mockModal.present).toHaveBeenCalled();
    expect(mockModal.onDidDismiss).toHaveBeenCalled();
  }));

  it('exportPdf() triggers PDF download when no closure exists', fakeAsync(() => {
    component.recap = mockDailyRecap;
    component.currentClosure = null;
    component.exportPdf();
    tick();
    flushMicrotasks();
    expect(factureServiceSpy.downloadDailyRecapPdf).toHaveBeenCalledWith(component.selectedDate);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('exportPdf() delegates to downloadZReportPdf when closure exists', fakeAsync(() => {
    component.recap = mockDailyRecap;
    component.currentClosure = mockClosure;
    component.exportPdf();
    tick();
    flushMicrotasks();
    expect(factureServiceSpy.downloadZReportPdf).toHaveBeenCalledWith(10);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('printZReportTicket() sends print command to printer service', fakeAsync(() => {
    component.currentClosure = mockClosure;
    component.printZReportTicket();
    tick();
    flushMicrotasks();
    expect(printerServiceSpy.printZReport).toHaveBeenCalledWith(10);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('printZReportTicket() handles failure status and service errors', fakeAsync(() => {
    component.currentClosure = mockClosure;
    printerServiceSpy.printZReport.and.returnValue(of({
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      success: false,
      message: 'Failed to connect',
      durationMs: 50,
    }));

    component.printZReportTicket();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'warning' }));

    printerServiceSpy.printZReport.and.returnValue(throwError(() => new Error('Offline')));
    component.printZReportTicket();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('exportPdf() and downloadFecExport() handle service errors', fakeAsync(() => {
    component.currentClosure = mockClosure;
    factureServiceSpy.downloadZReportPdf.and.returnValue(throwError(() => new Error('Error')));
    component.exportPdf();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));

    factureServiceSpy.downloadFecExport.and.returnValue(throwError(() => new Error('Error')));
    component.downloadFecExport();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('downloadFecExport() triggers FEC download', fakeAsync(() => {
    component.currentClosure = mockClosure;
    component.downloadFecExport();
    tick();
    flushMicrotasks();
    expect(factureServiceSpy.downloadFecExport).toHaveBeenCalledWith(10);
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
