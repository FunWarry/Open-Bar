import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { BarTicketPrintComponent } from '../../../app/features/dashboard-barman/components/bar-ticket-print/bar-ticket-print.component';
import { CommandeView } from '../../../app/features/dashboard-barman/models/commande-view.model';
import { AppSettingsService } from '../../../app/core/services/app-settings.service';
import { PrinterService } from '../../../app/core/services/printer.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('BarTicketPrintComponent', () => {
  let component: BarTicketPrintComponent;
  let fixture: ComponentFixture<BarTicketPrintComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let settingsServiceSpy: jasmine.SpyObj<AppSettingsService>;
  let printerServiceSpy: jasmine.SpyObj<PrinterService>;

  const mockCommande: CommandeView = {
    id: 123,
    tableNom: 'Table 5',
    tableNumero: 5,
    serveurNom: 'Bob',
    serveurUsername: 'bob',
    statut: 'EN_ATTENTE',
    prioritaire: true,
    dateCommande: new Date(),
    items: [
      { id: 1, cocktailNom: 'Mojito', quantite: 2, prioritaire: false, varianteNom: 'Fraise' },
      { id: 2, cocktailNom: 'Pina Colada', quantite: 1, prioritaire: false, notes: 'Sans alcool' }
    ]
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));
    printerServiceSpy = jasmine.createSpyObj('PrinterService', ['dispatchOrder']);
    printerServiceSpy.dispatchOrder.and.returnValue(of([{
      role: 'BAR',
      ip: '192.168.1.101',
      port: 9100,
      success: true,
      message: 'OK',
      durationMs: 15,
    }]));

    settingsServiceSpy = jasmine.createSpyObj('AppSettingsService', ['getSettings']);
    settingsServiceSpy.getSettings.and.returnValue(
      of({
        id: 1,
        primaryColor: '#6c7fe8',
        primaryColorStrong: '#5a68d6',
        logoUrl: null,
        establishmentName: 'Le Bar Basque',
        defaultTheme: 'DARK',
        tempsAlerteCommandeMinutes: 5,
        tempsAlerteCritiqueCommandeMinutes: 10,
        directPrintingEnabled: true,
        printerPort: 9100,
        barPrinterIp: '192.168.1.101',
        updatedAt: null
      })
    );

    await TestBed.configureTestingModule({
      imports: [BarTicketPrintComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AppSettingsService, useValue: settingsServiceSpy },
        { provide: PrinterService, useValue: printerServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BarTicketPrintComponent);
    component = fixture.componentInstance;
    component.commande = mockCommande;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads establishment name from AppSettingsService', () => {
    expect(component.establishmentName).toBe('Le Bar Basque');
  });

  it('should calculate total items count correctly', () => {
    expect(component.totalItemsCount).toBe(3);
  });

  it('should render thermal receipt with paper tear edges and action buttons', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.paper-receipt-container')).toBeTruthy();
    expect(compiled.querySelector('.paper-tear-top')).toBeTruthy();
    expect(compiled.querySelector('.paper-tear-bottom')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="thermal-receipt-80mm"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="btn-close-ticket-modal"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="btn-direct-escpos-print"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="confirm-print-btn"]')).toBeTruthy();
  });

  it('printTicket() triggers thermal ticket print', () => {
    spyOn(document.body, 'appendChild').and.returnValue({} as any);
    component.printTicket();
    expect(document.body.appendChild).toHaveBeenCalled();
  });

  it('should dismiss modal on dismiss()', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });

  it('should trigger dismiss when clicking cancel button in template', () => {
    spyOn(component, 'dismiss');
    const cancelBtn = fixture.nativeElement.querySelector('[data-testid="btn-close-ticket-modal"]') as HTMLElement;
    cancelBtn.click();
    expect(component.dismiss).toHaveBeenCalled();
  });

  it('should trigger printTicket when clicking confirm print button in template', () => {
    spyOn(component, 'printTicket');
    const printBtn = fixture.nativeElement.querySelector('[data-testid="confirm-print-btn"]') as HTMLElement;
    printBtn.click();
    expect(component.printTicket).toHaveBeenCalled();
  });

  it('printDirectEscPos() dispatches order to ESC/POS printers and presents toast', fakeAsync(() => {
    component.printDirectEscPos();
    tick();
    expect(printerServiceSpy.dispatchOrder).toHaveBeenCalledWith(123);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(component.isDirectPrinting).toBeFalse();
  }));

  it('printDirectEscPos() handles dispatch error gracefully', fakeAsync(() => {
    printerServiceSpy.dispatchOrder.and.returnValue(throwError(() => new Error('Connection refused')));
    component.printDirectEscPos();
    tick();
    expect(printerServiceSpy.dispatchOrder).toHaveBeenCalledWith(123);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(component.isDirectPrinting).toBeFalse();
  }));

  it('printDirectEscPos() shows warning toast when one of the printers fails', fakeAsync(() => {
    printerServiceSpy.dispatchOrder.and.returnValue(of([
      { role: 'BAR', ip: '192.168.1.101', port: 9100, success: true, message: 'OK', durationMs: 15 },
      { role: 'KITCHEN', ip: '192.168.1.102', port: 9100, success: false, message: 'Offline', durationMs: 15 },
    ]));
    component.printDirectEscPos();
    tick();
    expect(printerServiceSpy.dispatchOrder).toHaveBeenCalledWith(123);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(component.isDirectPrinting).toBeFalse();
  }));

  it('printDirectEscPos() returns early if commande has no ID', () => {
    component.commande = { ...mockCommande, id: 0 as any };
    component.printDirectEscPos();
    expect(printerServiceSpy.dispatchOrder).not.toHaveBeenCalled();
  });
});
