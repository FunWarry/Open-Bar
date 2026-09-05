import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableQrModalComponent } from '../../../../app/features/tables/components/table-qr-modal/table-qr-modal.component';
import { TableService } from '../../../../app/core/services/table.service';
import { AppSettingsService } from '../../../../app/core/services/app-settings.service';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { TableBar } from '../../../../app/core/models/table.model';
import { AppSettings } from '../../../../app/core/models/app-settings.model';

describe('TableQrModalComponent', () => {
  let component: TableQrModalComponent;
  let fixture: ComponentFixture<TableQrModalComponent>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;
  let appSettingsServiceSpy: jasmine.SpyObj<AppSettingsService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let mockToast: jasmine.SpyObj<HTMLIonToastElement>;
  let settingsSubject: BehaviorSubject<AppSettings | null>;

  const mockTable: TableBar = {
    id: 1,
    numero: 4,
    capacite: 4,
    zone: 'TERRASSE',
    occupee: false,
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00'
  };

  const mockSettings: AppSettings = {
    id: 1,
    establishmentName: 'OpenBar',
    clientBaseUrl: 'https://openbar.local',
    wifiSsid: 'OpenBar-Guests',
    wifiPassword: 'supersecretpass',
    wifiSecurity: 'WPA',
    wifiEnabled: true,
    tempsAlerteWarningMinutes: 3,
    tempsAlerteCommandeMinutes: 5,
    tempsAlerteCritiqueCommandeMinutes: 10,
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyPosition: 'AFTER',
    defaultTheme: 'DARK',
    primaryColor: '#6c7fe8',
    primaryColorStrong: '#5a68d6',
    logoUrl: null,
    updatedAt: null
  };

  beforeEach(async () => {
    settingsSubject = new BehaviorSubject<AppSettings | null>(mockSettings);
    tableServiceSpy = jasmine.createSpyObj('TableService', ['getTableQrCodeUrl', 'downloadTableQrCode', 'downloadQrCodesPdf']);
    appSettingsServiceSpy = jasmine.createSpyObj('AppSettingsService', ['getWifiQrCodeUrl', 'downloadWifiQrCode'], {
      settings$: settingsSubject.asObservable()
    });
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);

    mockToast = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast));

    tableServiceSpy.getTableQrCodeUrl.and.returnValue('http://localhost:8080/api/tables/1/qrcode?format=PNG&size=320');
    tableServiceSpy.downloadTableQrCode.and.returnValue(of(new Blob(['qr-bytes'], { type: 'image/png' })));
    tableServiceSpy.downloadQrCodesPdf.and.returnValue(of(new Blob(['pdf-bytes'], { type: 'application/pdf' })));

    appSettingsServiceSpy.getWifiQrCodeUrl.and.returnValue('http://localhost:8080/api/settings/wifi/qrcode?format=PNG&size=320');
    appSettingsServiceSpy.downloadWifiQrCode.and.returnValue(of(new Blob(['wifi-qr-bytes'], { type: 'image/png' })));

    if (!jasmine.isSpy(window.URL.createObjectURL)) {
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test-preview');
    } else {
      (window.URL.createObjectURL as jasmine.Spy).and.returnValue('blob:test-preview');
    }
    if (!jasmine.isSpy(window.URL.revokeObjectURL)) {
      spyOn(window.URL, 'revokeObjectURL');
    }

    await TestBed.configureTestingModule({
      imports: [
        TableQrModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: TableService, useValue: tableServiceSpy },
        { provide: AppSettingsService, useValue: appSettingsServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TableQrModalComponent);
    component = fixture.componentInstance;
    component.table = mockTable;
    fixture.detectChanges();
  });

  it('should create component and initialize order URL and QR image preview', () => {
    expect(component).toBeTruthy();
    expect(component.orderUrl).toBe('https://openbar.local/client/commande?table=4');
    expect(tableServiceSpy.downloadTableQrCode).toHaveBeenCalledWith(1, 'PNG', 320);
    expect(component.previewUrl).toBeDefined();
  });

  it('setMode should switch to WIFI mode and load Wi-Fi QR preview', () => {
    component.setMode('WIFI');
    expect(component.activeMode).toBe('WIFI');
    expect(appSettingsServiceSpy.downloadWifiQrCode).toHaveBeenCalledWith('PNG', 320);
  });

  it('setFormat should update format and refresh QR preview', () => {
    component.setFormat('SVG');
    expect(component.qrFormat).toBe('SVG');
    expect(tableServiceSpy.downloadTableQrCode).toHaveBeenCalledWith(1, 'SVG', 320);
  });

  it('copyOrderUrl should write text to clipboard and show toast', async () => {
    if (!jasmine.isSpy(navigator.clipboard.writeText)) {
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    } else {
      (navigator.clipboard.writeText as jasmine.Spy).and.returnValue(Promise.resolve());
    }
    await component.copyOrderUrl();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(component.orderUrl);
    expect(component.copiedUrl).toBeTrue();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(mockToast.present).toHaveBeenCalled();
  });

  it('copyWifiPassword should copy Wi-Fi password to clipboard and show toast', async () => {
    if (!jasmine.isSpy(navigator.clipboard.writeText)) {
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    } else {
      (navigator.clipboard.writeText as jasmine.Spy).and.returnValue(Promise.resolve());
    }
    await component.copyWifiPassword();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('supersecretpass');
    expect(component.copiedPass).toBeTrue();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(mockToast.present).toHaveBeenCalled();
  });

  it('downloadImage should trigger table QR download in ORDER mode', () => {
    component.downloadImage('PNG');
    expect(tableServiceSpy.downloadTableQrCode).toHaveBeenCalledWith(1, 'PNG', 600);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('downloadImage should trigger wifi QR download in WIFI mode', () => {
    component.setMode('WIFI');
    component.downloadImage('PNG');
    expect(appSettingsServiceSpy.downloadWifiQrCode).toHaveBeenCalledWith('PNG', 600);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('downloadImage should show error toast on failure', async () => {
    tableServiceSpy.downloadTableQrCode.and.returnValue(throwError(() => new Error('Download failed')));
    component.downloadImage('PNG');
    expect(component.isDownloading).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('printStandPdf should download stand PDF for this table', () => {
    component.printStandPdf();
    expect(tableServiceSpy.downloadQrCodesPdf).toHaveBeenCalledWith('STAND', [1], true);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('printStandPdf should show error toast on failure', () => {
    tableServiceSpy.downloadQrCodesPdf.and.returnValue(throwError(() => new Error('PDF failed')));
    component.printStandPdf();
    expect(component.isDownloading).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('dismiss should call modalCtrl.dismiss', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });
});
