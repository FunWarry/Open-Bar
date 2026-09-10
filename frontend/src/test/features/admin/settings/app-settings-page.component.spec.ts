import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastController, AlertController, ModalController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AppSettingsPageComponent } from '../../../../app/features/admin/settings/app-settings-page.component';
import { LegalComponent } from '../../../../app/features/legal/legal.component';
import { EtablissementService } from '../../../../app/core/services/etablissement.service';
import { EstablishmentConfig } from '../../../../app/core/models/establishment-config.model';
import { AppSettingsService } from '../../../../app/core/services/app-settings.service';
import { AppSettings } from '../../../../app/core/models/app-settings.model';
import { ThemeService, DEFAULT_FIGMA_PALETTE, THEME_PRESETS } from '../../../../app/core/services/theme.service';
import { PrinterService } from '../../../../app/core/services/printer.service';
import { AppUpdateService } from '../../../../app/core/services/app-update.service';

import { AuthService } from '../../../../app/core/services/auth.service';
import { OnboardingService } from '../../../../app/core/services/onboarding.service';
import { FeatureFlagService } from '../../../../app/core/services/feature-flag.service';
import { ESTABLISHMENT_PRESETS } from '../../../../app/core/models/establishment-module.model';

describe('AppSettingsPageComponent', () => {
  let component: AppSettingsPageComponent;
  let fixture: ComponentFixture<AppSettingsPageComponent>;
  let etabServiceSpy: jasmine.SpyObj<EtablissementService>;
  let appSettingsServiceSpy: jasmine.SpyObj<AppSettingsService>;
  let featureFlagServiceSpy: jasmine.SpyObj<FeatureFlagService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;
  let printerServiceSpy: jasmine.SpyObj<PrinterService>;
  let appUpdateServiceSpy: jasmine.SpyObj<AppUpdateService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let onboardingServiceSpy: jasmine.SpyObj<OnboardingService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockEtab: EstablishmentConfig = {
    id: 1,
    legalName: 'OpenBar SARL',
    legalForm: 'SARL',
    capitalSocial: 10000,
    siret: '73282932000074',
    tvaNumber: 'FR12123456789',
    rcsCity: 'Paris',
    rcsNumber: 'B 123 456 789',
    codeApe: '5630Z',
    address: '12 Rue du Bar, 75001 Paris',
    phone: '+33123456789',
    email: 'contact@openbar.local',
    paymentTerms: 'Paiement immédiat à réception',
    discountPolicy: 'Aucun escompte pour paiement anticipé',
    latePaymentRate: 0.12,
    timeZone: 'Europe/Paris',
    ticketFormat: '80mm',
  };

  const mockAppSettings: AppSettings = {
    id: 1,
    primaryColor: '#6c7fe8',
    primaryColorStrong: '#5a68d6',
    logoUrl: null,
    establishmentName: 'OpenBar SARL',
    defaultTheme: 'DARK',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyPosition: 'AFTER',
    tempsAlerteWarningMinutes: 3,
    tempsAlerteCommandeMinutes: 5,
    tempsAlerteCritiqueCommandeMinutes: 10,
    directPrintingEnabled: true,
    printerPort: 9100,
    barPrinterIp: '192.168.1.101',
    kitchenPrinterIp: '192.168.1.102',
    cashDeskPrinterIp: '192.168.1.103',
    updatedAt: null,
  };

  beforeEach(async () => {
    etabServiceSpy = jasmine.createSpyObj('EtablissementService', ['getConfig', 'updateConfig', 'getTimeZones']);
    etabServiceSpy.getConfig.and.returnValue(of(mockEtab));
    etabServiceSpy.updateConfig.and.returnValue(of(mockEtab));
    etabServiceSpy.getTimeZones.and.returnValue(of(['Europe/Paris', 'UTC', 'America/New_York']));

    appSettingsServiceSpy = jasmine.createSpyObj('AppSettingsService', ['getSettings', 'updateSettings', 'applyTokens']);
    appSettingsServiceSpy.getSettings.and.returnValue(of(mockAppSettings));
    appSettingsServiceSpy.updateSettings.and.returnValue(of(mockAppSettings));

    printerServiceSpy = jasmine.createSpyObj('PrinterService', [
      'getStatus',
      'testPrintRole',
      'testConnection',
      'openCashDrawer',
    ]);
    printerServiceSpy.testPrintRole.and.returnValue(of({
      role: 'BAR',
      ip: '192.168.1.101',
      port: 9100,
      success: true,
      message: 'OK',
      durationMs: 15,
    }));
    printerServiceSpy.openCashDrawer.and.returnValue(of({
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      success: true,
      message: 'Cash drawer opened',
      durationMs: 10,
    }));

    appUpdateServiceSpy = jasmine.createSpyObj('AppUpdateService', ['checkNewerRelease', 'presentUpdateModal'], {
      currentVersion: '1.0.0',
    });
    appUpdateServiceSpy.checkNewerRelease.and.resolveTo({
      hasUpdate: false,
      currentVersion: '1.0.0',
      latestRelease: null,
    });
    appUpdateServiceSpy.presentUpdateModal.and.resolveTo(null);

    themeServiceSpy = jasmine.createSpyObj('ThemeService', [
      'setTheme',
      'setCustomColors',
      'applyPreset',
      'resetToDefaultColors',
      'generatePaletteFromPrimary',
    ], {
      currentTheme: 'dark',
      currentCustomColors: { ...DEFAULT_FIGMA_PALETTE },
    });
    themeServiceSpy.generatePaletteFromPrimary.and.returnValue({
      ...DEFAULT_FIGMA_PALETTE,
      primary: '#FF0055',
    });

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrlSpy.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));
    
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    authServiceSpy = jasmine.createSpyObj('AuthService', ['getStoredUser']);
    authServiceSpy.getStoredUser.and.returnValue({ id: 1, roles: ['ROLE_ADMIN'] } as any);

    onboardingServiceSpy = jasmine.createSpyObj('OnboardingService', ['resetOnboarding']);

    featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', [
      'loadModules',
      'updateModules',
      'isModuleEnabled',
    ], {
      modules: () => ({
        cuisineKds: true,
        happyHour: true,
        employeeManagement: true,
        floorPlan: true,
        qrClientOrdering: true,
        stockTracking: true,
      }),
      happyHourEnabled: () => true,
      qrClientOrderingEnabled: () => true,
    });
    featureFlagServiceSpy.loadModules.and.returnValue(of({
      cuisineKds: true,
      happyHour: true,
      employeeManagement: true,
      floorPlan: true,
      qrClientOrdering: true,
      stockTracking: true,
    }));
    featureFlagServiceSpy.updateModules.and.callFake((val: any) => of(val));

    await TestBed.configureTestingModule({
      imports: [
        AppSettingsPageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {},
            en: {},
          },
          translocoConfig: {
            availableLangs: ['fr', 'en'],
            defaultLang: 'fr',
          },
        }),
      ],
      providers: [
        { provide: EtablissementService, useValue: etabServiceSpy },
        { provide: AppSettingsService, useValue: appSettingsServiceSpy },
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy },
        { provide: PrinterService, useValue: printerServiceSpy },
        { provide: AppUpdateService, useValue: appUpdateServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: OnboardingService, useValue: onboardingServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ tab: 'timers' }),
            snapshot: { queryParams: { tab: 'timers' } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSettingsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load settings for all tabs on init', () => {
    expect(component).toBeTruthy();
    expect(etabServiceSpy.getConfig).toHaveBeenCalled();
    expect(appSettingsServiceSpy.getSettings).toHaveBeenCalled();
    expect(etabServiceSpy.getTimeZones).toHaveBeenCalled();
    expect(component.activeTab).toBe('timers');
    expect(component.hasUnsavedChanges()).toBeFalse();
  });

  it('should switch tabs and navigate with query parameter', () => {
    component.selectTab('legal');
    expect(component.activeTab).toBe('legal');
    expect(routerSpy.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { tab: 'legal' },
    }));
  });

  it('should apply cadence presets and mark form dirty', () => {
    const fastPreset = component.cadencePresets[0];
    component.applyCadencePreset(fastPreset);

    expect(component.appSettingsForm.get('tempsAlerteWarningMinutes')?.value).toBe(fastPreset.warning);
    expect(component.appSettingsForm.get('tempsAlerteCommandeMinutes')?.value).toBe(fastPreset.urgent);
    expect(component.appSettingsForm.get('tempsAlerteCritiqueCommandeMinutes')?.value).toBe(fastPreset.critical);
    expect(component.hasUnsavedChanges()).toBeTrue();
  });

  it('should adjust threshold values within 1-120 limits', () => {
    component.appSettingsForm.patchValue({ tempsAlerteWarningMinutes: 5 });
    component.adjustThreshold('tempsAlerteWarningMinutes', 2);
    expect(component.appSettingsForm.get('tempsAlerteWarningMinutes')?.value).toBe(7);

    component.adjustThreshold('tempsAlerteWarningMinutes', -10);
    expect(component.appSettingsForm.get('tempsAlerteWarningMinutes')?.value).toBe(1);
  });

  it('should apply currency preset and change position', () => {
    const usdPreset = component.currencyPresets[1]; // USD
    component.applyCurrencyPreset(usdPreset);

    expect(component.appSettingsForm.get('currencyCode')?.value).toBe('USD');
    expect(component.appSettingsForm.get('currencySymbol')?.value).toBe('$');
    expect(component.appSettingsForm.get('currencyPosition')?.value).toBe('BEFORE');
    expect(component.hasUnsavedChanges()).toBeTrue();

    component.setCurrencyPosition('AFTER');
    expect(component.appSettingsForm.get('currencyPosition')?.value).toBe('AFTER');
  });

  it('should format sample price correctly according to currency settings', () => {
    component.appSettingsForm.patchValue({ currencySymbol: '€', currencyPosition: 'AFTER' });
    const formattedEur = component.formatSamplePrice(12.5);
    expect(formattedEur).toContain('12,50');
    expect(formattedEur).toContain('€');

    component.appSettingsForm.patchValue({ currencySymbol: '$', currencyPosition: 'BEFORE' });
    const formattedUsd = component.formatSamplePrice(12.5);
    expect(formattedUsd).toContain('$');
    expect(formattedUsd).toContain('12,50');
  });

  it('should apply theme mode and invoke ThemeService', () => {
    component.onSetThemeMode('light');
    expect(component.activeTheme).toBe('light');
    expect(themeServiceSpy.setTheme).toHaveBeenCalledWith('light');
    expect(component.appSettingsForm.get('defaultTheme')?.value).toBe('LIGHT');
    expect(component.hasUnsavedChanges()).toBeTrue();

    component.onSetThemeMode('dark');
    expect(component.activeTheme).toBe('dark');
    expect(themeServiceSpy.setTheme).toHaveBeenCalledWith('dark');
    expect(component.appSettingsForm.get('defaultTheme')?.value).toBe('DARK');
  });

  it('should apply theme presets and update ThemeService in real time', () => {
    const presetKey = 'emerald';
    component.onApplyPreset(presetKey);

    expect(themeServiceSpy.applyPreset).toHaveBeenCalledWith('emerald');
    expect(component.colorForm.dirty).toBeTrue();
    expect(component.hasUnsavedChanges()).toBeTrue();
  });

  it('should auto-generate palette from primary color and update ThemeService', () => {
    component.colorForm.patchValue({ primary: '#FF0055' });
    component.onAutoGeneratePalette();

    expect(themeServiceSpy.generatePaletteFromPrimary).toHaveBeenCalledWith('#FF0055');
    expect(themeServiceSpy.setCustomColors).toHaveBeenCalled();
    expect(component.hasUnsavedChanges()).toBeTrue();
  });

  it('should reset colors to Figma defaults', () => {
    component.onResetToDefaultTheme();

    expect(themeServiceSpy.resetToDefaultColors).toHaveBeenCalled();
    expect(component.hasUnsavedChanges()).toBeTrue();
  });

  it('should compute simulated ticket status dynamically based on elapsed minutes', () => {
    component.appSettingsForm.patchValue({
      tempsAlerteWarningMinutes: 3,
      tempsAlerteCommandeMinutes: 5,
      tempsAlerteCritiqueCommandeMinutes: 10,
    });

    component.simulatedWaitMinutes = 2;
    expect(component.simulatedStatus.colorClass).toBe('status-normal');

    component.simulatedWaitMinutes = 4;
    expect(component.simulatedStatus.colorClass).toBe('status-warning');

    component.simulatedWaitMinutes = 7;
    expect(component.simulatedStatus.colorClass).toBe('status-urgent');

    component.simulatedWaitMinutes = 12;
    expect(component.simulatedStatus.colorClass).toBe('status-critical');
  });

  it('should discard modifications and restore pristine state', () => {
    component.etabForm.patchValue({ legalName: 'Modified Name' });
    component.etabForm.markAsDirty();
    component.colorForm.patchValue({ primary: '#123456' });
    component.colorForm.markAsDirty();
    expect(component.hasUnsavedChanges()).toBeTrue();

    component.discardChanges();
    expect(component.etabForm.get('legalName')?.value).toBe('OpenBar SARL');
    expect(themeServiceSpy.setCustomColors).toHaveBeenCalledWith(component.initialColors);
    expect(component.hasUnsavedChanges()).toBeFalse();
  });

  it('should save all forms concurrently and present success toast', fakeAsync(() => {
    component.etabForm.patchValue({ legalName: 'OpenBar Le Marais' });
    component.etabForm.markAsDirty();

    component.saveAll();
    tick();

    expect(etabServiceSpy.updateConfig).toHaveBeenCalled();
    expect(appSettingsServiceSpy.updateSettings).toHaveBeenCalled();
    expect(themeServiceSpy.setCustomColors).toHaveBeenCalled();
    expect(component.isSaving).toBeFalse();
    expect(component.hasUnsavedChanges()).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should display error toast if saving fails', fakeAsync(() => {
    etabServiceSpy.updateConfig.and.returnValue(throwError(() => new Error('Save failed')));
    component.etabForm.patchValue({ legalName: 'OpenBar Error' });
    component.etabForm.markAsDirty();

    component.saveAll();
    tick();

    expect(component.isSaving).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should prevent window unload when hasUnsavedChanges is true', () => {
    component.etabForm.patchValue({ legalName: 'Dirty Value' });
    component.etabForm.markAsDirty();

    const beforeUnloadEvent = new Event('beforeunload') as any;
    spyOn(beforeUnloadEvent, 'preventDefault');

    component.onBeforeUnload(beforeUnloadEvent);
    expect(beforeUnloadEvent.preventDefault).toHaveBeenCalled();
  });

  it('should initialize and provide country and language in currentEtabConfig', () => {
    expect(component.etabForm.get('country')?.value).toBe('France');
    expect(component.etabForm.get('language')?.value).toBe('fr');
    expect(component.currentEtabConfig.country).toBe('France');
    expect(component.currentEtabConfig.language).toBe('fr');

    component.etabForm.patchValue({ country: 'Canada', language: 'en' });
    expect(component.currentEtabConfig.country).toBe('Canada');
    expect(component.currentEtabConfig.language).toBe('en');
  });

  it('should auto-cascade thresholds when increasing warning past urgent and critical', () => {
    component.appSettingsForm.patchValue({
      tempsAlerteWarningMinutes: 3,
      tempsAlerteCommandeMinutes: 5,
      tempsAlerteCritiqueCommandeMinutes: 10,
    });

    component.onThresholdChange('warning', 8);
    expect(component.appSettingsForm.get('tempsAlerteWarningMinutes')?.value).toBe(8);
    expect(component.appSettingsForm.get('tempsAlerteCommandeMinutes')?.value).toBe(9);
    expect(component.appSettingsForm.get('tempsAlerteCritiqueCommandeMinutes')?.value).toBe(10);

    component.onThresholdChange('warning', 15);
    expect(component.appSettingsForm.get('tempsAlerteWarningMinutes')?.value).toBe(15);
    expect(component.appSettingsForm.get('tempsAlerteCommandeMinutes')?.value).toBe(16);
    expect(component.appSettingsForm.get('tempsAlerteCritiqueCommandeMinutes')?.value).toBe(17);
  });

  it('should auto-cascade thresholds when decreasing critical below urgent and warning', () => {
    component.appSettingsForm.patchValue({
      tempsAlerteWarningMinutes: 5,
      tempsAlerteCommandeMinutes: 8,
      tempsAlerteCritiqueCommandeMinutes: 15,
    });

    component.onThresholdChange('critical', 6);
    expect(component.appSettingsForm.get('tempsAlerteCritiqueCommandeMinutes')?.value).toBe(6);
    expect(component.appSettingsForm.get('tempsAlerteCommandeMinutes')?.value).toBe(5);
    expect(component.appSettingsForm.get('tempsAlerteWarningMinutes')?.value).toBe(4);
  });

  it('should auto-cascade thresholds when adjusting urgent', () => {
    component.appSettingsForm.patchValue({
      tempsAlerteWarningMinutes: 4,
      tempsAlerteCommandeMinutes: 6,
      tempsAlerteCritiqueCommandeMinutes: 10,
    });

    component.onThresholdChange('urgent', 3);
    expect(component.appSettingsForm.get('tempsAlerteWarningMinutes')?.value).toBe(2);
    expect(component.appSettingsForm.get('tempsAlerteCommandeMinutes')?.value).toBe(3);

    component.onThresholdChange('urgent', 12);
    expect(component.appSettingsForm.get('tempsAlerteCommandeMinutes')?.value).toBe(12);
    expect(component.appSettingsForm.get('tempsAlerteCritiqueCommandeMinutes')?.value).toBe(13);
  });

  it('should adjust thresholds via stepper buttons while respecting priority bounds', () => {
    component.appSettingsForm.patchValue({
      tempsAlerteWarningMinutes: 4,
      tempsAlerteCommandeMinutes: 5,
      tempsAlerteCritiqueCommandeMinutes: 6,
    });

    component.adjustThreshold('tempsAlerteWarningMinutes', 1);
    expect(component.appSettingsForm.get('tempsAlerteWarningMinutes')?.value).toBe(5);
    expect(component.appSettingsForm.get('tempsAlerteCommandeMinutes')?.value).toBe(6);
    expect(component.appSettingsForm.get('tempsAlerteCritiqueCommandeMinutes')?.value).toBe(7);
  });

  it('should compute colored linear-gradient slider track backgrounds correctly', () => {
    const warningBg = component.getSliderTrackBackground('warning', 15, 1, 30);
    expect(warningBg).toContain('linear-gradient');
    expect(warningBg).toContain('#f59e0b');

    const urgentBg = component.getSliderTrackBackground('urgent', 20, 2, 45);
    expect(urgentBg).toContain('#ef4444');

    const criticalBg = component.getSliderTrackBackground('critical', 30, 3, 60);
    expect(criticalBg).toContain('#e11d48');

    const simBg = component.getSliderTrackBackground('simulation', 10, 0, 20);
    expect(simBg).toContain('50.00%');
  });

  it('should expose searchable select options for language, ticket format, and timezones', () => {
    expect(component.languageOptions.length).toBeGreaterThanOrEqual(2);
    expect(component.languageOptions.some((o) => o.value === 'fr')).toBeTrue();
    expect(component.languageOptions.some((o) => o.value === 'en')).toBeTrue();

    expect(component.ticketFormatOptions).toHaveSize(2);
    expect(component.ticketFormatOptions.some((o) => o.value === '80mm')).toBeTrue();
    expect(component.ticketFormatOptions.some((o) => o.value === '58mm')).toBeTrue();

    expect(component.timeZoneOptions.length).toBeGreaterThanOrEqual(5);
    expect(component.timeZoneOptions.some((o) => o.value === 'SYSTEM')).toBeTrue();
    expect(component.timeZoneOptions.some((o) => o.value === 'Europe/Paris')).toBeTrue();
  });

  it('should expose searchable select options for Wi-Fi security and allow selecting QR tab', () => {
    expect(component.wifiSecurityOptions.length).toBeGreaterThanOrEqual(3);
    expect(component.wifiSecurityOptions.some((o) => o.value === 'WPA')).toBeTrue();

    component.selectTab('qr');
    expect(component.activeTab).toBe('qr');
    expect(routerSpy.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { tab: 'qr' }
    }));
  });

  it('should patch and save QR and Wi-Fi settings in saveAll()', fakeAsync(() => {
    component.appSettingsForm.patchValue({
      clientBaseUrl: 'https://bar.lan',
      wifiSsid: 'Bar-Guest',
      wifiPassword: 'guestpassword',
      wifiSecurity: 'WPA',
      wifiEnabled: true
    });

    component.saveAll();
    tick();

    expect(appSettingsServiceSpy.updateSettings).toHaveBeenCalledWith(jasmine.objectContaining({
      clientBaseUrl: 'https://bar.lan',
      wifiSsid: 'Bar-Guest',
      wifiPassword: 'guestpassword',
      wifiSecurity: 'WPA',
      wifiEnabled: true
    }));
  }));

  it('should reset onboarding and navigate to /onboarding', () => {
    component.restartOnboarding();
    expect(onboardingServiceSpy.resetOnboarding).toHaveBeenCalledWith('1');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/onboarding']);
  });

  it('should reset onboarding using user role when user id is absent', () => {
    authServiceSpy.getStoredUser.and.returnValue({ roles: ['ROLE_MANAGER'] } as any);
    component.restartOnboarding();
    expect(onboardingServiceSpy.resetOnboarding).toHaveBeenCalledWith('ROLE_MANAGER');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/onboarding']);
  });

  it('should reset onboarding with ADMIN fallback when stored user is null', () => {
    authServiceSpy.getStoredUser.and.returnValue(null);
    component.restartOnboarding();
    expect(onboardingServiceSpy.resetOnboarding).toHaveBeenCalledWith('ADMIN');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/onboarding']);
  });

  it('should apply VAT presets correctly to the form', () => {
    component.applyVatPreset(21);
    expect(component.appSettingsForm.get('defaultVatRate')?.value).toBe(21);

    component.applyVatPreset(0);
    expect(component.appSettingsForm.get('defaultVatRate')?.value).toBe(0);
  });

  it('should compute simulated selling price HT, margin amount, percentage and badge', () => {
    component.appSettingsForm.patchValue({
      defaultVatRate: 20,
      targetGrossMarginPercentage: 70,
      warningGrossMarginPercentage: 50,
    });

    const simOptimal = component.simulateMargin(12, 2);
    expect(simOptimal.prixHT).toBe(10);
    expect(simOptimal.margeBrute).toBe(8);
    expect(simOptimal.margePct).toBe(80);
    expect(component.getMarginBadgeClass(simOptimal.margePct)).toBe('badge-optimal');

    const simWarning = component.simulateMargin(12, 4.5);
    expect(simWarning.margePct).toBe(55);
    expect(component.getMarginBadgeClass(simWarning.margePct)).toBe('badge-warning');

    const simCritical = component.simulateMargin(12, 6);
    expect(simCritical.margePct).toBe(40);
    expect(component.getMarginBadgeClass(simCritical.margePct)).toBe('badge-critical');
  });

  it('should validate warningGrossMarginPercentage is lower than targetGrossMarginPercentage', () => {
    component.appSettingsForm.patchValue({
      targetGrossMarginPercentage: 50,
      warningGrossMarginPercentage: 60,
    });
    expect(component.appSettingsForm.errors?.['marginPriorityInvalid']).toBeTrue();

    component.appSettingsForm.patchValue({
      targetGrossMarginPercentage: 70,
      warningGrossMarginPercentage: 50,
    });
    expect(component.appSettingsForm.errors?.['marginPriorityInvalid']).toBeUndefined();
  });

  it('should initialize printer form controls with settings values', () => {
    expect(component.appSettingsForm.get('directPrintingEnabled')?.value).toBeTrue();
    expect(component.appSettingsForm.get('printerPort')?.value).toBe(9100);
    expect(component.appSettingsForm.get('barPrinterIp')?.value).toBe('192.168.1.101');
    expect(component.appSettingsForm.get('kitchenPrinterIp')?.value).toBe('192.168.1.102');
    expect(component.appSettingsForm.get('cashDeskPrinterIp')?.value).toBe('192.168.1.103');
  });

  it('should switch active tab to printers', () => {
    component.activeTab = 'printers';
    expect(component.activeTab).toBe('printers');
  });

  it('should call printerService.testPrintRole and show success toast when testing a printer', fakeAsync(() => {
    component.testPrint('BAR');
    tick();
    expect(printerServiceSpy.testPrintRole).toHaveBeenCalledWith('BAR');
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should call printerService.openCashDrawer and show toast when testing cash drawer', fakeAsync(() => {
    component.testCashDrawer();
    tick();
    expect(printerServiceSpy.openCashDrawer).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should handle error gracefully when test print fails', fakeAsync(() => {
    printerServiceSpy.testPrintRole.and.returnValue(throwError(() => new Error('Socket timeout')));
    component.testPrint('KITCHEN');
    tick();
    expect(printerServiceSpy.testPrintRole).toHaveBeenCalledWith('KITCHEN');
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should show warning toast when test print returns success false', fakeAsync(() => {
    printerServiceSpy.testPrintRole.and.returnValue(of({
      role: 'BAR',
      ip: '192.168.1.101',
      port: 9100,
      success: false,
      message: 'Unreachable',
      durationMs: 15,
    }));
    component.testPrint('BAR');
    tick();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should not call printerService.testPrintRole if IP is empty', () => {
    component.appSettingsForm.patchValue({ barPrinterIp: '' });
    component.testPrint('BAR');
    expect(printerServiceSpy.testPrintRole).not.toHaveBeenCalled();
  });

  it('should show warning toast when cash drawer returns success false', fakeAsync(() => {
    printerServiceSpy.openCashDrawer.and.returnValue(of({
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      success: false,
      message: 'Failed',
      durationMs: 15,
    }));
    component.testCashDrawer();
    tick();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should handle error when cash drawer throws exception', fakeAsync(() => {
    printerServiceSpy.openCashDrawer.and.returnValue(throwError(() => new Error('Connection refused')));
    component.testCashDrawer();
    tick();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should not call openCashDrawer if cashDeskPrinterIp is empty', () => {
    component.appSettingsForm.patchValue({ cashDeskPrinterIp: '' });
    component.testCashDrawer();
    expect(printerServiceSpy.openCashDrawer).not.toHaveBeenCalled();
  });

  describe('System Updates', () => {
    it('should check for updates and report system is up to date', async () => {
      appUpdateServiceSpy.checkNewerRelease.and.resolveTo({
        hasUpdate: false,
        currentVersion: '1.0.0',
        latestRelease: null,
      });

      await component.checkForUpdates();

      expect(appUpdateServiceSpy.checkNewerRelease).toHaveBeenCalled();
      expect(component.updateCheckSuccess).toBeTrue();
      expect(component.updateCheckMessage).toBeTruthy();
      expect(appUpdateServiceSpy.presentUpdateModal).not.toHaveBeenCalled();
    });

    it('should display update available message and open modal when update is found', async () => {
      const mockRelease = {
        version: '1.2.0',
        tagName: 'v1.2.0',
        title: 'v1.2.0',
        releaseNotes: 'Changelog',
        publishedAt: '2026-09-06T10:00:00Z',
        htmlUrl: 'https://github.com/FunWarry/Open-Bar',
      };

      appUpdateServiceSpy.checkNewerRelease.and.resolveTo({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestRelease: mockRelease,
      });

      await component.checkForUpdates();

      expect(appUpdateServiceSpy.checkNewerRelease).toHaveBeenCalled();
      expect(component.updateCheckSuccess).toBeTrue();
      expect(appUpdateServiceSpy.presentUpdateModal).toHaveBeenCalledWith(mockRelease);
    });

    it('should handle check update failures gracefully', async () => {
      appUpdateServiceSpy.checkNewerRelease.and.rejectWith(new Error('Network error'));

      await component.checkForUpdates();

      expect(component.updateCheckSuccess).toBeFalse();
      expect(component.updateCheckMessage).toBeTruthy();
    });
  });

  describe('Modules Configuration Tab', () => {
    it('should select modules tab and initialize modules form', () => {
      component.selectTab('modules');
      expect(component.activeTab).toBe('modules');
      expect(component.modulesForm).toBeTruthy();
      expect(component.modulesForm.get('cuisineKds')?.value).toBeTrue();
    });

    it('should apply modules presets correctly', () => {
      component.applyModulesPreset('BAR');
      expect(component.modulesForm.get('cuisineKds')?.value).toBeFalse();
      expect(component.modulesForm.get('happyHour')?.value).toBeTrue();
      expect(component.modulesForm.dirty).toBeTrue();

      component.applyModulesPreset('FOOD_TRUCK');
      expect(component.modulesForm.get('floorPlan')?.value).toBeFalse();
      expect(component.modulesForm.get('happyHour')?.value).toBeFalse();

      component.applyModulesPreset('RESTAURANT');
      expect(component.modulesForm.get('cuisineKds')?.value).toBeTrue();
      expect(component.modulesForm.get('floorPlan')?.value).toBeTrue();

      component.applyModulesPreset('NIGHTCLUB');
      expect(component.modulesForm.get('cuisineKds')?.value).toBeFalse();
      expect(component.modulesForm.get('happyHour')?.value).toBeTrue();
    });

    it('should save modules independently via saveModules()', () => {
      component.applyModulesPreset('FOOD_TRUCK');
      component.saveModules();

      expect(featureFlagServiceSpy.updateModules).toHaveBeenCalled();
      expect(component.modulesForm.pristine).toBeTrue();
    });

    it('should handle saveModules() error gracefully', () => {
      featureFlagServiceSpy.updateModules.and.returnValue(throwError(() => new Error('Save error')));
      component.applyModulesPreset('FOOD_TRUCK');
      component.saveModules();

      expect(component.isSaving).toBeFalse();
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    });

    it('should include modules in saveAll() when modulesForm is dirty', () => {
      component.applyModulesPreset('FOOD_TRUCK');
      component.saveAll();

      expect(featureFlagServiceSpy.updateModules).toHaveBeenCalled();
      expect(component.modulesForm.pristine).toBeTrue();
    });

    it('should reset modules when discardChanges() is called', () => {
      component.initialModulesValue = {
        cuisineKds: true,
        happyHour: true,
        employeeManagement: true,
        floorPlan: true,
        qrClientOrdering: true,
        stockTracking: true,
      };
      component.applyModulesPreset('FOOD_TRUCK');
      expect(component.modulesForm.dirty).toBeTrue();

      component.discardChanges();
      expect(component.modulesForm.get('cuisineKds')?.value).toBeTrue();
      expect(component.modulesForm.pristine).toBeTrue();
    });

    it('should compute activeModulesCount correctly', () => {
      component.modulesForm.patchValue({
        cuisineKds: true,
        happyHour: true,
        employeeManagement: false,
        floorPlan: false,
        qrClientOrdering: true,
        stockTracking: true,
      });
      expect(component.activeModulesCount).toBe(4);

      component.modulesForm.patchValue({
        cuisineKds: false,
        happyHour: false,
        employeeManagement: false,
        floorPlan: false,
        qrClientOrdering: false,
        stockTracking: false,
      });
      expect(component.activeModulesCount).toBe(0);
    });

    it('should determine isModuleControlActive accurately', () => {
      component.modulesForm.patchValue({ cuisineKds: true, floorPlan: false });
      expect(component.isModuleControlActive('cuisineKds')).toBeTrue();
      expect(component.isModuleControlActive('floorPlan')).toBeFalse();
      expect(component.isModuleControlActive('nonExistentKey')).toBeFalse();
    });

    it('should identify matching preset with isModulePresetActive()', () => {
      component.applyModulesPreset('BAR');
      expect(component.isModulePresetActive('BAR')).toBeTrue();
      expect(component.isModulePresetActive('RESTAURANT')).toBeFalse();
      expect(component.isModulePresetActive('FOOD_TRUCK')).toBeFalse();
      expect(component.isModulePresetActive('NIGHTCLUB')).toBeFalse();

      component.applyModulesPreset('FOOD_TRUCK');
      expect(component.isModulePresetActive('FOOD_TRUCK')).toBeTrue();
      expect(component.isModulePresetActive('BAR')).toBeFalse();

      component.applyModulesPreset('RESTAURANT');
      expect(component.isModulePresetActive('RESTAURANT')).toBeTrue();

      component.applyModulesPreset('NIGHTCLUB');
      expect(component.isModulePresetActive('NIGHTCLUB')).toBeTrue();

      // Custom configuration does not match any known preset
      component.modulesForm.patchValue({ cuisineKds: true, stockTracking: false });
      expect(component.isModulePresetActive('BAR')).toBeFalse();
      expect(component.isModulePresetActive('NIGHTCLUB')).toBeFalse();
    });

    it('should reset modules form with resetModules()', () => {
      component.initialModulesValue = {
        cuisineKds: false,
        happyHour: false,
        employeeManagement: false,
        floorPlan: false,
        qrClientOrdering: false,
        stockTracking: false,
      };
      component.applyModulesPreset('RESTAURANT');
      expect(component.modulesForm.dirty).toBeTrue();

      component.resetModules();
      expect(component.modulesForm.get('cuisineKds')?.value).toBeFalse();
      expect(component.modulesForm.pristine).toBeTrue();
    });
  });

  describe('Legal & Licensing', () => {
    it('should open legal modal when openLegalModal is called', async () => {
      await component.openLegalModal('license');
      expect(modalCtrlSpy.create).toHaveBeenCalledWith({
        component: LegalComponent,
        componentProps: {
          initialTab: 'license',
          isModal: true,
        },
      });
    });

    it('should open legal modal with default terms tab when tab is omitted', async () => {
      await component.openLegalModal();
      expect(modalCtrlSpy.create).toHaveBeenCalledWith({
        component: LegalComponent,
        componentProps: {
          initialTab: 'terms',
          isModal: true,
        },
      });
    });
  });

  describe('Cash Register Denominations', () => {
    it('should initialize with default EUR denominations when none configured', () => {
      expect(component.configuredDenominations().length).toBeGreaterThan(10);
      expect(component.bills()).toHaveSize(7); // 500, 200, 100, 50, 20, 10, 5
      expect(component.coins()).toHaveSize(8); // 2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01
      expect(component.billsCount).toBe(7);
      expect(component.coinsCount).toBe(8);
    });

    it('should update denominations when currency preset is applied', () => {
      const usdPreset = { code: 'USD', symbol: '$', position: 'BEFORE' as const };
      component.applyCurrencyPreset(usdPreset);

      expect(component.appSettingsForm.get('currencyCode')?.value).toBe('USD');
      expect(component.appSettingsForm.get('currencySymbol')?.value).toBe('$');
      expect(component.configuredDenominations().some(d => d.key === '100usd')).toBeTrue();
      expect(component.configuredDenominations().some(d => d.label === '$ 100')).toBeTrue();
      expect(component.appSettingsForm.dirty).toBeTrue();
    });

    it('should remove a denomination correctly', () => {
      const initialCount = component.configuredDenominations().length;
      component.removeDenomination('500e');

      expect(component.configuredDenominations()).toHaveSize(initialCount - 1);
      expect(component.configuredDenominations().some(d => d.key === '500e')).toBeFalse();
      expect(component.appSettingsForm.dirty).toBeTrue();
    });

    it('should add a custom denomination and keep list sorted by value descending', () => {
      component.newDenomType = 'bill';
      component.newDenomValue = 250;
      component.addCustomDenomination();

      const denoms = component.configuredDenominations();
      const added = denoms.find(d => d.value === 250);
      expect(added).toBeTruthy();
      expect(added?.type).toBe('bill');
      expect(component.newDenomValue).toBeNull();
      expect(component.appSettingsForm.dirty).toBeTrue();

      // Verify descending order
      for (let i = 0; i < denoms.length - 1; i++) {
        expect(denoms[i].value).toBeGreaterThanOrEqual(denoms[i + 1].value);
      }
    });

    it('should prevent adding duplicate denomination', () => {
      component.newDenomType = 'bill';
      component.newDenomValue = 50; // Already in EUR denominations
      const countBefore = component.configuredDenominations().length;

      component.addCustomDenomination();
      expect(component.configuredDenominations()).toHaveSize(countBefore);
      expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'warning' }));
    });

    it('should reset denominations to defaults for current currency', () => {
      component.removeDenomination('500e');
      component.removeDenomination('200e');
      expect(component.configuredDenominations().some(d => d.key === '500e')).toBeFalse();

      component.resetDenominationsToDefault();
      expect(component.configuredDenominations().some(d => d.key === '500e')).toBeTrue();
      expect(component.configuredDenominations().some(d => d.key === '200e')).toBeTrue();
      expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'info' }));
    });

    it('should ignore adding custom denomination when value is null, zero or negative', () => {
      const initialCount = component.configuredDenominations().length;

      component.newDenomValue = null;
      component.addCustomDenomination();
      expect(component.configuredDenominations()).toHaveSize(initialCount);

      component.newDenomValue = 0;
      component.addCustomDenomination();
      expect(component.configuredDenominations()).toHaveSize(initialCount);

      component.newDenomValue = -10;
      component.addCustomDenomination();
      expect(component.configuredDenominations()).toHaveSize(initialCount);
    });

    it('should correctly resolve and parse existing cashDenominationsJson from settings', () => {
      const customDenoms = [
        { key: 'custom_bill', label: '15 €', value: 15, type: 'bill' as const }
      ];
      const resolved = (component as any).resolveDenominations({
        currencyCode: 'EUR',
        currencySymbol: '€',
        currencyPosition: 'AFTER',
        cashDenominationsJson: JSON.stringify(customDenoms)
      });
      expect(resolved).toEqual(customDenoms);
    });

    it('should fall back to defaults when cashDenominationsJson is invalid JSON in resolveDenominations', () => {
      const resolved = (component as any).resolveDenominations({
        currencyCode: 'EUR',
        currencySymbol: '€',
        currencyPosition: 'AFTER',
        cashDenominationsJson: 'INVALID_JSON'
      });
      expect(resolved.length).toBeGreaterThan(10);
      expect(resolved[0].key).toBe('500e');
    });

    it('should reset denominations to initial value when discardChanges is called', () => {
      component.removeDenomination('500e');
      expect(component.configuredDenominations().some(d => d.key === '500e')).toBeFalse();

      component.discardChanges();
      expect(component.configuredDenominations().some(d => d.key === '500e')).toBeTrue();
    });

    it('should serialize cashDenominationsJson into payload when saveAll is called', () => {
      component.saveAll();

      expect(appSettingsServiceSpy.updateSettings).toHaveBeenCalledWith(
        jasmine.objectContaining({
          cashDenominationsJson: jasmine.any(String),
        })
      );
      const callArg = appSettingsServiceSpy.updateSettings.calls.mostRecent().args[0];
      const parsed = JSON.parse(callArg.cashDenominationsJson!);
      expect(Array.isArray(parsed)).toBeTrue();
      expect(parsed.length).toBeGreaterThan(0);
    });
  });
});


