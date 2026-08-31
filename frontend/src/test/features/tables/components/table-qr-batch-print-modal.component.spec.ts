import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableQrBatchPrintModalComponent } from '../../../../app/features/tables/components/table-qr-batch-print-modal/table-qr-batch-print-modal.component';
import { TableService } from '../../../../app/core/services/table.service';
import { AppSettingsService } from '../../../../app/core/services/app-settings.service';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { TableBar } from '../../../../app/core/models/table.model';
import { AppSettings } from '../../../../app/core/models/app-settings.model';

describe('TableQrBatchPrintModalComponent', () => {
  let component: TableQrBatchPrintModalComponent;
  let fixture: ComponentFixture<TableQrBatchPrintModalComponent>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let mockToast: jasmine.SpyObj<HTMLIonToastElement>;
  let settingsSubject: BehaviorSubject<AppSettings | null>;

  const mockTables: TableBar[] = [
    { id: 1, numero: 1, capacite: 4, zone: 'INTERIEUR', occupee: false, createdAt: '', updatedAt: '' },
    { id: 2, numero: 2, capacite: 2, zone: 'TERRASSE', occupee: true, createdAt: '', updatedAt: '' },
    { id: 3, numero: 3, capacite: 6, zone: 'ETAGE', occupee: false, createdAt: '', updatedAt: '' }
  ];

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
    tableServiceSpy = jasmine.createSpyObj('TableService', ['getAll', 'downloadQrCodesPdf']);
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);

    mockToast = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast));

    tableServiceSpy.getAll.and.returnValue(of(mockTables));
    tableServiceSpy.downloadQrCodesPdf.and.returnValue(of(new Blob(['pdf-bytes'], { type: 'application/pdf' })));

    await TestBed.configureTestingModule({
      imports: [
        TableQrBatchPrintModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: TableService, useValue: tableServiceSpy },
        {
          provide: AppSettingsService,
          useValue: {
            settings$: settingsSubject.asObservable(),
            getSettings: () => of(mockSettings)
          }
        },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TableQrBatchPrintModalComponent);
    component = fixture.componentInstance;
    component.tables = [...mockTables];
    fixture.detectChanges();
  });

  it('should create component and select all tables by default', () => {
    expect(component).toBeTruthy();
    expect(component.selectedIdsSet.size).toBe(3);
    expect(component.selectAll).toBeTrue();
    expect(component.selectedLayout).toBe('STAND');
  });

  it('should toggle layout correctly', () => {
    component.setLayout('CARD');
    expect(component.selectedLayout).toBe('CARD');

    component.setLayout('STICKER');
    expect(component.selectedLayout).toBe('STICKER');
  });

  it('toggleSelectAll should deselect all when all were selected and reselect all when none', () => {
    component.toggleSelectAll();
    expect(component.selectAll).toBeFalse();
    expect(component.selectedIdsSet.size).toBe(0);

    component.toggleSelectAll();
    expect(component.selectAll).toBeTrue();
    expect(component.selectedIdsSet.size).toBe(3);
  });

  it('toggleTableSelection should toggle individual table ID in set', () => {
    component.toggleTableSelection(1);
    expect(component.isTableSelected(1)).toBeFalse();
    expect(component.selectAll).toBeFalse();

    component.toggleTableSelection(1);
    expect(component.isTableSelected(1)).toBeTrue();
    expect(component.selectAll).toBeTrue();
  });

  it('generatePdf should download PDF and dismiss modal on success', () => {
    if (!jasmine.isSpy(window.URL.createObjectURL)) {
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:batch-pdf');
    } else {
      (window.URL.createObjectURL as jasmine.Spy).and.returnValue('blob:batch-pdf');
    }
    if (!jasmine.isSpy(window.URL.revokeObjectURL)) {
      spyOn(window.URL, 'revokeObjectURL');
    }

    component.generatePdf();
    expect(tableServiceSpy.downloadQrCodesPdf).toHaveBeenCalledWith('STAND', undefined, true);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });

  it('generatePdf with partial selection should pass targetIds', () => {
    if (!jasmine.isSpy(window.URL.createObjectURL)) {
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:batch-pdf');
    } else {
      (window.URL.createObjectURL as jasmine.Spy).and.returnValue('blob:batch-pdf');
    }
    if (!jasmine.isSpy(window.URL.revokeObjectURL)) {
      spyOn(window.URL, 'revokeObjectURL');
    }

    component.toggleTableSelection(1); // Deselect table 1
    component.generatePdf();
    expect(tableServiceSpy.downloadQrCodesPdf).toHaveBeenCalledWith('STAND', [2, 3], true);
  });

  it('generatePdf with empty selection should do nothing', () => {
    component.selectedIdsSet.clear();
    component.generatePdf();
    expect(tableServiceSpy.downloadQrCodesPdf).not.toHaveBeenCalled();
  });

  it('generatePdf should show toast error on failure', () => {
    tableServiceSpy.downloadQrCodesPdf.and.returnValue(throwError(() => new Error('PDF Error')));
    component.generatePdf();
    expect(component.isGenerating).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('dismiss should call modalCtrl.dismiss', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });
});
