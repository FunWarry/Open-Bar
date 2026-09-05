import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';
import { OrderTimersSettingsComponent } from '../../../../app/features/dashboard-manager/components/order-timers-settings/order-timers-settings.component';
import { AppSettingsService } from '../../../../app/core/services/app-settings.service';
import { SoundService } from '../../../../app/core/services/sound.service';
import { AppSettings } from '../../../../app/core/models/app-settings.model';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('OrderTimersSettingsComponent', () => {
  let component: OrderTimersSettingsComponent;
  let fixture: ComponentFixture<OrderTimersSettingsComponent>;
  let settingsServiceMock: jasmine.SpyObj<AppSettingsService>;
  let soundServiceMock: jasmine.SpyObj<SoundService>;
  let toastControllerMock: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  const initialSettings: AppSettings = {
    id: 1,
    primaryColor: '#6c7fe8',
    primaryColorStrong: '#5a68d6',
    logoUrl: null,
    establishmentName: 'OpenBar Central',
    defaultTheme: 'DARK',
    tempsAlerteWarningMinutes: 3,
    tempsAlerteCommandeMinutes: 5,
    tempsAlerteCritiqueCommandeMinutes: 10,
    updatedAt: '2026-08-19T10:00:00',
  };

  beforeEach(async () => {
    settingsServiceMock = jasmine.createSpyObj('AppSettingsService', ['getSettings', 'updateSettings']);
    settingsServiceMock.getSettings.and.returnValue(of(initialSettings));
    settingsServiceMock.updateSettings.and.returnValue(of(initialSettings));

    soundServiceMock = jasmine.createSpyObj('SoundService', [
      'playNewOrderSound',
      'playOrderReadySound',
      'playUrgentAlertSound',
    ]);

    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastControllerMock = jasmine.createSpyObj('ToastController', ['create']);
    toastControllerMock.create.and.returnValue(Promise.resolve(toastSpy));

    await TestBed.configureTestingModule({
      imports: [
        OrderTimersSettingsComponent,
        ReactiveFormsModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: AppSettingsService, useValue: settingsServiceMock },
        { provide: SoundService, useValue: soundServiceMock },
        { provide: ToastController, useValue: toastControllerMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderTimersSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load current settings into form', () => {
    expect(component).toBeTruthy();
    expect(settingsServiceMock.getSettings).toHaveBeenCalled();
    expect(component.timersForm.get('tempsAlerteWarningMinutes')?.value).toBe(3);
    expect(component.timersForm.get('tempsAlerteCommandeMinutes')?.value).toBe(5);
    expect(component.timersForm.get('tempsAlerteCritiqueCommandeMinutes')?.value).toBe(10);
    expect(component.timersForm.valid).toBe(true);
  });

  it('should invalidate form when threshold hierarchy is violated (warning >= urgent)', () => {
    component.timersForm.patchValue({
      tempsAlerteWarningMinutes: 6,
      tempsAlerteCommandeMinutes: 5,
      tempsAlerteCritiqueCommandeMinutes: 10,
    });
    expect(component.timersForm.errors?.['invalidThresholdHierarchy']).toBe(true);
    expect(component.timersForm.invalid).toBe(true);
  });

  it('should invalidate form when threshold hierarchy is violated (urgent >= critical)', () => {
    component.timersForm.patchValue({
      tempsAlerteWarningMinutes: 3,
      tempsAlerteCommandeMinutes: 10,
      tempsAlerteCritiqueCommandeMinutes: 10,
    });
    expect(component.timersForm.errors?.['invalidThresholdHierarchy']).toBe(true);
  });

  it('should adjust field values using stepper buttons', () => {
    component.adjustValue('tempsAlerteWarningMinutes', 1);
    expect(component.timersForm.get('tempsAlerteWarningMinutes')?.value).toBe(4);

    component.adjustValue('tempsAlerteWarningMinutes', -2);
    expect(component.timersForm.get('tempsAlerteWarningMinutes')?.value).toBe(2);
  });

  it('should apply fast pace preset correctly', () => {
    const fastPreset = component.presets.find(p => p.id === 'fast')!;
    component.applyPreset(fastPreset);

    expect(component.timersForm.get('tempsAlerteWarningMinutes')?.value).toBe(2);
    expect(component.timersForm.get('tempsAlerteCommandeMinutes')?.value).toBe(4);
    expect(component.timersForm.get('tempsAlerteCritiqueCommandeMinutes')?.value).toBe(7);
    expect(component.timersForm.valid).toBe(true);
  });

  it('should reset form to standard default thresholds and currency', () => {
    component.timersForm.patchValue({
      tempsAlerteWarningMinutes: 5,
      tempsAlerteCommandeMinutes: 8,
      tempsAlerteCritiqueCommandeMinutes: 15,
      currencyCode: 'USD',
      currencySymbol: '$',
      currencyPosition: 'BEFORE'
    });

    component.resetToDefaults();

    expect(component.timersForm.value).toEqual({
      tempsAlerteWarningMinutes: 3,
      tempsAlerteCommandeMinutes: 5,
      tempsAlerteCritiqueCommandeMinutes: 10,
      currencyCode: 'EUR',
      currencySymbol: '€',
      currencyPosition: 'AFTER'
    });
  });

  it('should apply currency preset correctly (e.g. USD $)', () => {
    const usdPreset = component.currencyPresets.find(p => p.code === 'USD')!;
    component.applyCurrencyPreset(usdPreset);

    expect(component.currentCurrencyCode).toBe('USD');
    expect(component.currentCurrencySymbol).toBe('$');
    expect(component.currentCurrencyPosition).toBe('BEFORE');
  });

  it('should format preview price dynamically according to form values', () => {
    component.timersForm.patchValue({
      currencySymbol: '€',
      currencyPosition: 'AFTER'
    });
    expect(component.formatPreviewPrice(12.5)).toContain('12,50');
    expect(component.formatPreviewPrice(12.5)).toContain('€');

    component.timersForm.patchValue({
      currencySymbol: '$',
      currencyPosition: 'BEFORE'
    });
    expect(component.formatPreviewPrice(12.5)).toContain('12,50');
    expect(component.formatPreviewPrice(12.5)).toContain('$');
    expect(component.formatPreviewPrice(12.5).startsWith('$')).toBe(true);
  });

  it('should trigger sound tests via SoundService', () => {
    component.testNewOrderSound();
    expect(soundServiceMock.playNewOrderSound).toHaveBeenCalledTimes(1);

    component.testOrderReadySound();
    expect(soundServiceMock.playOrderReadySound).toHaveBeenCalledTimes(1);

    component.testUrgentAlertSound();
    expect(soundServiceMock.playUrgentAlertSound).toHaveBeenCalledTimes(1);
  });

  it('should compute simulated severity dynamically based on simulatedMinutes and thresholds', () => {
    component.timersForm.patchValue({
      tempsAlerteWarningMinutes: 3,
      tempsAlerteCommandeMinutes: 5,
      tempsAlerteCritiqueCommandeMinutes: 10,
    });

    component.simulatedMinutes.set(2);
    expect(component.simulatedSeverity).toBe('normal');

    component.simulatedMinutes.set(4);
    expect(component.simulatedSeverity).toBe('warning');

    component.simulatedMinutes.set(7);
    expect(component.simulatedSeverity).toBe('urgent');

    component.simulatedMinutes.set(12);
    expect(component.simulatedSeverity).toBe('critical');
  });

  it('should submit updated thresholds and currency and display success toast', async () => {
    const updatedMock: AppSettings = {
      ...initialSettings,
      tempsAlerteWarningMinutes: 2,
      tempsAlerteCommandeMinutes: 4,
      tempsAlerteCritiqueCommandeMinutes: 8,
      currencyCode: 'GBP',
      currencySymbol: '£',
      currencyPosition: 'BEFORE'
    };
    settingsServiceMock.updateSettings.and.returnValue(of(updatedMock));

    component.timersForm.patchValue({
      tempsAlerteWarningMinutes: 2,
      tempsAlerteCommandeMinutes: 4,
      tempsAlerteCritiqueCommandeMinutes: 8,
      currencyCode: 'GBP',
      currencySymbol: '£',
      currencyPosition: 'BEFORE'
    });

    component.onSubmit();

    expect(settingsServiceMock.updateSettings).toHaveBeenCalledWith(jasmine.objectContaining({
      tempsAlerteWarningMinutes: 2,
      tempsAlerteCommandeMinutes: 4,
      tempsAlerteCritiqueCommandeMinutes: 8,
      currencyCode: 'GBP',
      currencySymbol: '£',
      currencyPosition: 'BEFORE'
    }));
    expect(toastControllerMock.create).toHaveBeenCalled();
  });

  it('should display error toast when save fails', async () => {
    settingsServiceMock.updateSettings.and.returnValue(throwError(() => new Error('Save error')));

    component.timersForm.patchValue({
      tempsAlerteWarningMinutes: 2,
      tempsAlerteCommandeMinutes: 4,
      tempsAlerteCritiqueCommandeMinutes: 8,
    });

    component.onSubmit();

    expect(toastControllerMock.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger',
    }));
  });
});
