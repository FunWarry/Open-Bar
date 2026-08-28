import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastController, AlertController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AppSettingsPageComponent } from '../../../../app/features/admin/settings/app-settings-page.component';
import { EtablissementService } from '../../../../app/core/services/etablissement.service';
import { EstablishmentConfig } from '../../../../app/core/models/establishment-config.model';
import { AppSettingsService } from '../../../../app/core/services/app-settings.service';
import { AppSettings } from '../../../../app/core/models/app-settings.model';
import { ThemeService, DEFAULT_FIGMA_PALETTE, THEME_PRESETS } from '../../../../app/core/services/theme.service';

describe('AppSettingsPageComponent', () => {
  let component: AppSettingsPageComponent;
  let fixture: ComponentFixture<AppSettingsPageComponent>;
  let etabServiceSpy: jasmine.SpyObj<EtablissementService>;
  let appSettingsServiceSpy: jasmine.SpyObj<AppSettingsService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
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
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

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
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
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
});
