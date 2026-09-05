import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonIcon,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  timeOutline,
  cashOutline,
  colorPaletteOutline,
  saveOutline,
  refreshOutline,
  sparklesOutline,
  moonOutline,
  sunnyOutline,
  desktopOutline,
  warningOutline,
  checkmarkCircleOutline,
  speedometerOutline,
  receiptOutline,
  alertCircleOutline,
  shieldCheckmarkOutline,
  chevronDownOutline,
  qrCodeOutline,
  wifiOutline,
  globeOutline,
  lockClosedOutline,
  rocketOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { EtablissementService } from '../../../core/services/etablissement.service';
import { EstablishmentConfig } from '../../../core/models/establishment-config.model';
import { AppSettingsService } from '../../../core/services/app-settings.service';
import { AppSettings, CurrencyPosition } from '../../../core/models/app-settings.model';
import { HasPendingChanges } from '../../../core/guards/pending-changes.guard';
import {
  ThemeService,
  CustomThemeColors,
  THEME_PRESETS,
  AppTheme,
  DEFAULT_FIGMA_PALETTE,
} from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { RoleBadgeComponent } from '../../../core/components/ui/role-badge/role-badge.component';
import { StatusBadgeComponent } from '../../../core/components/ui/status-badge/status-badge.component';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';
import { TicketReceiptComponent } from '../../factures/ticket-receipt/ticket-receipt.component';
import { Facture } from '../../factures/models/facture.model';

export type SettingsTab = 'legal' | 'timers' | 'currency' | 'theme' | 'qr';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Validates a 14-digit French SIRET number using the Luhn checksum algorithm.
 */
export function siretLuhnValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (!val) return null;
  const str = String(val).trim();
  if (!/^\d{14}$/.test(str)) {
    return { siretFormat: true };
  }
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = Number(str.charAt(i));
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  return sum % 10 === 0 ? null : { siretLuhn: true };
}

/**
 * Cross-field validator ensuring the strict threshold hierarchy: Warning < Urgent < Critical.
 */
export function thresholdPriorityValidator(group: AbstractControl): ValidationErrors | null {
  const warning = Number(group.get('tempsAlerteWarningMinutes')?.value) || 0;
  const urgent = Number(group.get('tempsAlerteCommandeMinutes')?.value) || 0;
  const critical = Number(group.get('tempsAlerteCritiqueCommandeMinutes')?.value) || 0;

  if (warning >= urgent || urgent >= critical) {
    return { thresholdPriorityInvalid: true };
  }
  return null;
}

export interface CadencePreset {
  nameKey: string;
  warning: number;
  urgent: number;
  critical: number;
}

export interface CurrencyPreset {
  code: string;
  symbol: string;
  position: CurrencyPosition;
}

/**
 * Unified application settings management component covering legal establishment info,
 * preparation cadences and alerts, currency symbols and formats, adaptive theming,
 * and Wi-Fi / QR code customer onboarding settings.
 */
@Component({
  selector: 'app-settings-page',
  templateUrl: './app-settings-page.component.html',
  styleUrls: ['./app-settings-page.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonIcon,
    TranslocoPipe,
    ActionButtonComponent,
    RoleBadgeComponent,
    StatusBadgeComponent,
    InputFieldComponent,
    SearchableSelectComponent,
    TicketReceiptComponent,
  ],
})
export class AppSettingsPageComponent implements OnInit, OnDestroy, HasPendingChanges {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly etablissementService = inject(EtablissementService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly onboardingService = inject(OnboardingService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  /** Demonstration invoice used to preview realistic thermal receipt in real time. */
  readonly demoFacture: Facture = {
    id: 1,
    tableId: 4,
    tableNumero: 4,
    numero: 'DEMO-0042',
    dateFacture: new Date().toISOString(),
    dateReglement: new Date().toISOString(),
    reglee: true,
    modePaiement: 'CARTE_BANCAIRE',
    serveurNom: 'Alex',
    total: 23.50,
    totalHT: 20.08,
    totalVAT: 3.42,
    totalTTC: 23.50,
    pourboire: 1.50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: 1,
        factureId: 1,
        commandeItemId: 101,
        description: 'Mojito Passion',
        quantite: 1,
        prixUnitaire: 9.50,
        total: 9.50,
        vatRate: '20%',
        priceHT: 7.92,
        vatAmount: 1.58,
      },
      {
        id: 2,
        factureId: 1,
        commandeItemId: 102,
        description: 'Planche Tapas Ibérique',
        quantite: 1,
        prixUnitaire: 14.00,
        total: 14.00,
        vatRate: '10%',
        priceHT: 12.73,
        vatAmount: 1.27,
      },
    ],
  };

  activeTab: SettingsTab = 'legal';
  isLoading = true;
  isSaving = false;

  // Forms
  etabForm!: FormGroup;
  appSettingsForm!: FormGroup;
  colorForm!: FormGroup;

  // Initial loaded states for reset
  initialEtabValue: Partial<EstablishmentConfig> = {};
  initialAppSettingsValue: Partial<AppSettings> = {};
  initialThemeMode: AppTheme = 'dark';
  initialColors: CustomThemeColors = { ...DEFAULT_FIGMA_PALETTE };

  // Active theme mode
  activeTheme: AppTheme = 'dark';

  // Presets from ThemeService
  presets = Object.entries(THEME_PRESETS).map(([key, val]) => ({
    key,
    name: val.name,
    colors: val.colors,
  }));

  // Timezones list (legacy fallback)
  timeZones: string[] = ['Europe/Paris', 'UTC', 'Europe/London', 'America/New_York'];

  // Searchable Select Options
  readonly languageOptions: SearchableOption<string>[] = [
    { value: 'fr', label: 'Français (FR)', badge: 'FR', badgeType: 'primary' },
    { value: 'en', label: 'English (EN)', badge: 'EN', badgeType: 'neutral' },
  ];

  readonly ticketFormatOptions: SearchableOption<'80mm' | '58mm'>[] = [
    { value: '80mm', label: 'Format standard 80mm', subLabel: '80mm — Thermique large', badge: '80mm', badgeType: 'primary' },
    { value: '58mm', label: 'Format compact 58mm', subLabel: '58mm — Thermique étroit', badge: '58mm', badgeType: 'neutral' },
  ];

  readonly timeZoneOptions: SearchableOption<string>[] = [
    { value: 'SYSTEM', label: 'SYSTEM (Système / Auto)', subLabel: 'Fuseau horaire de l\'appareil hôte', badge: 'Auto', badgeType: 'primary' },
    { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1 / UTC+2)', subLabel: 'France, Belgique, Espagne' },
    { value: 'Europe/London', label: 'Europe/London (UTC+0 / UTC+1)', subLabel: 'Royaume-Uni, Irlande' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (UTC+1 / UTC+2)', subLabel: 'Allemagne, Suisse, Italie' },
    { value: 'Europe/Brussels', label: 'Europe/Brussels (UTC+1 / UTC+2)', subLabel: 'Belgique' },
    { value: 'Europe/Zurich', label: 'Europe/Zurich (UTC+1 / UTC+2)', subLabel: 'Suisse' },
    { value: 'America/New_York', label: 'America/New_York (UTC-5 / UTC-4)', subLabel: 'États-Unis Est, Canada' },
    { value: 'America/Chicago', label: 'America/Chicago (UTC-6 / UTC-5)', subLabel: 'États-Unis Centre' },
    { value: 'America/Denver', label: 'America/Denver (UTC-7 / UTC-6)', subLabel: 'États-Unis Montagne' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8 / UTC-7)', subLabel: 'États-Unis Pacifique' },
    { value: 'America/Toronto', label: 'America/Toronto (UTC-5 / UTC-4)', subLabel: 'Canada Est' },
    { value: 'America/Montreal', label: 'America/Montreal (UTC-5 / UTC-4)', subLabel: 'Canada Québec' },
    { value: 'America/Vancouver', label: 'America/Vancouver (UTC-8 / UTC-7)', subLabel: 'Canada Ouest' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)', subLabel: 'Japon' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)', subLabel: 'Émirats Arabes Unis' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+10 / UTC+11)', subLabel: 'Australie Est' },
    { value: 'UTC', label: 'UTC', subLabel: 'Temps Universel Coordonné' },
  ];

  // Simulated elapsed wait time for ticket preview
  simulatedWaitMinutes = 4;

  // Cadence Presets
  readonly cadencePresets: CadencePreset[] = [
    { nameKey: 'SETTINGS.PRESET_FAST', warning: 2, urgent: 4, critical: 7 },
    { nameKey: 'SETTINGS.PRESET_STANDARD', warning: 3, urgent: 5, critical: 10 },
    { nameKey: 'SETTINGS.PRESET_LOUNGE', warning: 5, urgent: 8, critical: 15 },
  ];

  // Currency Presets
  readonly currencyPresets: CurrencyPreset[] = [
    { code: 'EUR', symbol: '€', position: 'AFTER' },
    { code: 'USD', symbol: '$', position: 'BEFORE' },
    { code: 'GBP', symbol: '£', position: 'BEFORE' },
    { code: 'CHF', symbol: 'CHF', position: 'AFTER' },
    { code: 'CAD', symbol: '$', position: 'BEFORE' },
    { code: 'JPY', symbol: '¥', position: 'BEFORE' },
    { code: 'AUD', symbol: '$', position: 'BEFORE' },
  ];

  readonly wifiSecurityOptions: SearchableOption<string>[] = [
    { value: 'WPA', label: 'WPA / WPA2 / WPA3 (Standard)', subLabel: 'Recommandé pour la majorité des réseaux Wi-Fi', badge: 'WPA', badgeType: 'primary' },
    { value: 'WEP', label: 'WEP (Ancien protocole)', subLabel: 'Réseaux Wi-Fi historiques', badge: 'WEP', badgeType: 'warning' },
    { value: 'nopass', label: 'Réseau Ouvert (Sans mot de passe)', subLabel: 'Aucun mot de passe requis', badge: 'Open', badgeType: 'neutral' },
  ];

  constructor() {
    addIcons({
      businessOutline,
      timeOutline,
      cashOutline,
      colorPaletteOutline,
      saveOutline,
      refreshOutline,
      sparklesOutline,
      moonOutline,
      sunnyOutline,
      desktopOutline,
      warningOutline,
      checkmarkCircleOutline,
      speedometerOutline,
      receiptOutline,
      alertCircleOutline,
      shieldCheckmarkOutline,
      chevronDownOutline,
      qrCodeOutline,
      wifiOutline,
      globeOutline,
      lockClosedOutline,
      rocketOutline,
    });
    this.initForms();
  }

  /**
   * Real-time establishment configuration derived from form controls for live receipt preview.
   */
  get currentEtabConfig(): EstablishmentConfig {
    return {
      legalName: this.etabForm?.get('legalName')?.value || 'OpenBar SARL',
      legalForm: this.etabForm?.get('legalForm')?.value || 'SARL',
      capitalSocial: this.etabForm?.get('capitalSocial')?.value || 10000,
      siret: this.etabForm?.get('siret')?.value || '73282932000074',
      tvaNumber: this.etabForm?.get('tvaNumber')?.value || 'FR12123456789',
      rcsCity: this.etabForm?.get('rcsCity')?.value || 'Paris',
      rcsNumber: this.etabForm?.get('rcsNumber')?.value || 'B 123 456 789',
      codeApe: this.etabForm?.get('codeApe')?.value || '5630Z',
      address: this.etabForm?.get('address')?.value || '12 Rue du Bar, 75001 Paris',
      country: this.etabForm?.get('country')?.value || 'France',
      language: this.etabForm?.get('language')?.value || 'fr',
      phone: this.etabForm?.get('phone')?.value || '+33123456789',
      email: this.etabForm?.get('email')?.value || 'contact@openbar.local',
      paymentTerms: this.etabForm?.get('paymentTerms')?.value || 'Paiement immédiat à réception',
      discountPolicy: this.etabForm?.get('discountPolicy')?.value || 'Aucun escompte pour paiement anticipé',
      latePaymentRate: this.etabForm?.get('latePaymentRate')?.value || 0.12,
      ticketFormat: this.etabForm?.get('ticketFormat')?.value || '80mm',
      timeZone: this.etabForm?.get('timeZone')?.value || 'SYSTEM',
    };
  }

  setTicketFormat(format: '80mm' | '58mm'): void {
    this.etabForm.patchValue({ ticketFormat: format });
    this.etabForm.markAsDirty();
  }

  ngOnInit(): void {
    this.activeTheme = this.themeService.currentTheme;
    this.initialThemeMode = this.activeTheme;
    this.initialColors = { ...this.themeService.currentCustomColors };

    if (this.route?.data) {
      this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
        if (data?.['defaultTab'] && ['legal', 'timers', 'currency', 'theme', 'qr'].includes(data['defaultTab'])) {
          this.activeTab = data['defaultTab'] as SettingsTab;
        }
      });
    }

    if (this.route?.queryParams) {
      this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params?.['tab'] && ['legal', 'timers', 'currency', 'theme', 'qr'].includes(params['tab'])) {
          this.activeTab = params['tab'] as SettingsTab;
        }
      });
    }

    this.loadAllSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Browser beforeunload listener to warn user if closing or refreshing with unsaved changes.
   */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  /**
   * Evaluates if any form has unsaved modifications.
   */
  hasUnsavedChanges(): boolean {
    if (this.isLoading) return false;
    return (
      (this.etabForm?.dirty ||
        this.appSettingsForm?.dirty ||
        this.colorForm?.dirty) ??
      false
    );
  }

  selectTab(tab: SettingsTab): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  private initForms(): void {
    this.etabForm = this.fb.group({
      legalName: ['', [Validators.required, Validators.maxLength(255)]],
      legalForm: ['SARL', [Validators.maxLength(50)]],
      capitalSocial: [10000.0, [Validators.min(0)]],
      siret: ['', [Validators.required, Validators.pattern(/^\d{14}$/), siretLuhnValidator]],
      tvaNumber: ['', [Validators.required, Validators.pattern(/^FR[0-9A-Z]{2}\d{9}$/)]],
      rcsCity: ['Paris', [Validators.maxLength(100)]],
      rcsNumber: ['B 123 456 789', [Validators.maxLength(50)]],
      codeApe: ['5630Z', [Validators.pattern(/^\d{4}[A-Z]$/)]],
      address: ['', [Validators.required, Validators.maxLength(500)]],
      country: ['France', [Validators.maxLength(100)]],
      language: ['fr', [Validators.required]],
      phone: ['', [Validators.maxLength(50)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      paymentTerms: ['Paiement immédiat à réception', [Validators.maxLength(255)]],
      discountPolicy: ['Aucun escompte pour paiement anticipé', [Validators.maxLength(255)]],
      latePaymentRate: [0.12, [Validators.min(0)]],
      ticketFormat: ['80mm'],
      timeZone: ['SYSTEM'],
    });

    this.appSettingsForm = this.fb.group({
      establishmentName: ['OpenBar'],
      tempsAlerteWarningMinutes: [3, [Validators.required, Validators.min(1), Validators.max(120)]],
      tempsAlerteCommandeMinutes: [5, [Validators.required, Validators.min(1), Validators.max(120)]],
      tempsAlerteCritiqueCommandeMinutes: [10, [Validators.required, Validators.min(1), Validators.max(120)]],
      currencyCode: ['EUR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      currencySymbol: ['€', [Validators.required]],
      currencyPosition: ['AFTER', [Validators.required]],
      defaultTheme: ['DARK', [Validators.required]],
      primaryColor: ['#6c7fe8', [Validators.required]],
      primaryColorStrong: ['#5a68d6'],
      clientBaseUrl: [''],
      wifiSsid: ['', [Validators.maxLength(100)]],
      wifiPassword: ['', [Validators.maxLength(100)]],
      wifiSecurity: ['WPA', [Validators.required]],
      wifiEnabled: [false],
    }, { validators: thresholdPriorityValidator });

    const currentColors = this.themeService.currentCustomColors;
    this.colorForm = this.fb.group({
      primary: [currentColors.primary, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      bgDark: [currentColors.bgDark, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      surfaceDark: [currentColors.surfaceDark, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      bgLight: [currentColors.bgLight, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      surfaceLight: [currentColors.surfaceLight, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      roleAdmin: [currentColors.roleAdmin, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      roleManager: [currentColors.roleManager, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      roleServeur: [currentColors.roleServeur, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      roleBarman: [currentColors.roleBarman, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
    });

    // Real-time live update: whenever colorForm changes, directly update document CSS tokens & app preview
    this.colorForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(values => {
        if (this.colorForm.valid) {
          this.themeService.setCustomColors(values as CustomThemeColors);
          this.appSettingsForm.patchValue(
            {
              primaryColor: values.primary,
              primaryColorStrong: this.darkenHex(values.primary, 15),
            },
            { emitEvent: false }
          );
        }
      });
  }

  private loadAllSettings(): void {
    this.isLoading = true;

    forkJoin({
      etab: this.etablissementService.getConfig().pipe(catchError(() => of({} as EstablishmentConfig))),
      appSettings: this.appSettingsService.getSettings().pipe(catchError(() => of({} as AppSettings))),
      timezones: this.etablissementService.getTimeZones().pipe(catchError(() => of(['Europe/Paris', 'UTC']))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ etab, appSettings, timezones }) => {
          if (timezones && timezones.length > 0) {
            this.timeZones = timezones;
          }

          if (etab && Object.keys(etab).length > 0) {
            if (!etab.siret || !/^\d{14}$/.test(etab.siret) || siretLuhnValidator({ value: etab.siret } as AbstractControl) !== null) {
              etab = { ...etab, siret: '73282932000074' };
            }
            if (!etab.country) {
              etab = { ...etab, country: 'France' };
            }
            if (!etab.language) {
              etab = { ...etab, language: 'fr' };
            }
            this.initialEtabValue = { ...etab };
            this.etabForm.patchValue(etab);
            this.etabForm.markAsPristine();
          }

          if (appSettings && Object.keys(appSettings).length > 0) {
            this.initialAppSettingsValue = { ...appSettings };
            this.appSettingsForm.patchValue(appSettings);
            this.appSettingsForm.markAsPristine();

            // Sync colorForm primary with appSettings if exists
            if (appSettings.primaryColor) {
              this.colorForm.patchValue({ primary: appSettings.primaryColor }, { emitEvent: false });
            }
          }

          this.initialColors = { ...this.themeService.currentCustomColors };
          this.colorForm.markAsPristine();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  // --- Cadence Presets ---
  applyCadencePreset(preset: CadencePreset): void {
    this.appSettingsForm.patchValue({
      tempsAlerteWarningMinutes: preset.warning,
      tempsAlerteCommandeMinutes: preset.urgent,
      tempsAlerteCritiqueCommandeMinutes: preset.critical,
    });
    this.appSettingsForm.markAsDirty();
  }

  /**
   * Enforces alert threshold hierarchy: Warning < Urgent < Critical.
   * Auto-cascades adjacent thresholds when user adjusts any level.
   *
   * @param tier The tier that was modified ('warning' | 'urgent' | 'critical')
   * @param value The new value for this tier
   */
  onThresholdChange(tier: 'warning' | 'urgent' | 'critical', value: number | string): void {
    const val = Math.round(Number(value));
    if (Number.isNaN(val)) return;

    const warning = Number(this.appSettingsForm.get('tempsAlerteWarningMinutes')?.value) || 1;
    const urgent = Number(this.appSettingsForm.get('tempsAlerteCommandeMinutes')?.value) || 2;
    const critical = Number(this.appSettingsForm.get('tempsAlerteCritiqueCommandeMinutes')?.value) || 3;

    const updated = this.calculateCascadedThresholds(tier, val, warning, urgent, critical);

    this.appSettingsForm.patchValue({
      tempsAlerteWarningMinutes: updated.warning,
      tempsAlerteCommandeMinutes: updated.urgent,
      tempsAlerteCritiqueCommandeMinutes: updated.critical,
    });
    this.appSettingsForm.markAsDirty();
  }

  private calculateCascadedThresholds(
    tier: 'warning' | 'urgent' | 'critical',
    val: number,
    w: number,
    u: number,
    c: number
  ): { warning: number; urgent: number; critical: number } {
    if (tier === 'warning') {
      const warning = Math.max(1, Math.min(30, val));
      const urgent = u <= warning ? warning + 1 : u;
      const critical = c <= urgent ? urgent + 1 : c;
      return { warning, urgent, critical };
    }
    if (tier === 'urgent') {
      const urgent = Math.max(2, Math.min(45, val));
      const warning = w >= urgent ? Math.max(1, urgent - 1) : w;
      const critical = c <= urgent ? urgent + 1 : c;
      return { warning, urgent, critical };
    }
    const critical = Math.max(3, Math.min(60, val));
    const urgent = u >= critical ? Math.max(2, critical - 1) : u;
    const warning = w >= urgent ? Math.max(1, urgent - 1) : w;
    return { warning, urgent, critical };
  }

  /**
   * Adjusts a threshold using stepper buttons (+ / -) while maintaining strict hierarchy.
   */
  adjustThreshold(controlName: string, delta: number): void {
    const ctrl = this.appSettingsForm.get(controlName);
    if (!ctrl) return;
    const current = Number(ctrl.value) || 0;
    const updated = current + delta;

    if (controlName === 'tempsAlerteWarningMinutes') {
      this.onThresholdChange('warning', updated);
    } else if (controlName === 'tempsAlerteCommandeMinutes') {
      this.onThresholdChange('urgent', updated);
    } else if (controlName === 'tempsAlerteCritiqueCommandeMinutes') {
      this.onThresholdChange('critical', updated);
    }
  }

  /**
   * Generates a CSS linear-gradient string that fills the slider track up to the thumb position.
   *
   * @param tier The alert level or simulation mode
   * @param value Current slider value
   * @param min Minimum range value
   * @param max Maximum range value
   */
  getSliderTrackBackground(
    tier: 'warning' | 'urgent' | 'critical' | 'simulation',
    value: number | null | undefined,
    min: number,
    max: number
  ): string {
    const val = Number(value);
    const safeVal = Number.isNaN(val) ? min : val;
    const clamped = Math.max(min, Math.min(max, safeVal));
    const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0;
    const formattedPct = `${pct.toFixed(2)}%`;

    const { startColor, endColor } = this.getSliderTierColors(tier);
    const trackBg = 'var(--background-surface-1, #0f111e)';
    return `linear-gradient(to right, ${startColor} 0%, ${endColor} ${formattedPct}, ${trackBg} ${formattedPct}, ${trackBg} 100%)`;
  }

  private getSliderTierColors(tier: 'warning' | 'urgent' | 'critical' | 'simulation'): { startColor: string; endColor: string } {
    switch (tier) {
      case 'warning':
        return { startColor: '#f59e0b', endColor: '#fbbf24' };
      case 'urgent':
        return { startColor: '#ef4444', endColor: '#f87171' };
      case 'critical':
        return { startColor: '#e11d48', endColor: '#fb7185' };
      case 'simulation':
      default:
        return { startColor: '#6366f1', endColor: '#818cf8' };
    }
  }

  // --- Currency Presets ---
  applyCurrencyPreset(preset: CurrencyPreset): void {
    this.appSettingsForm.patchValue({
      currencyCode: preset.code,
      currencySymbol: preset.symbol,
      currencyPosition: preset.position,
    });
    this.appSettingsForm.markAsDirty();
  }

  setCurrencyPosition(position: CurrencyPosition): void {
    this.appSettingsForm.patchValue({ currencyPosition: position });
    this.appSettingsForm.markAsDirty();
  }

  formatSamplePrice(amount: number): string {
    const symbol = this.appSettingsForm.get('currencySymbol')?.value || '€';
    const pos = this.appSettingsForm.get('currencyPosition')?.value || 'AFTER';
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return pos === 'BEFORE' ? `${symbol} ${formatted}` : `${formatted} ${symbol}`;
  }

  // --- Theme Controls & Real-Time Studio ---
  onSetThemeMode(mode: AppTheme): void {
    this.activeTheme = mode;
    this.themeService.setTheme(mode);
    this.appSettingsForm.patchValue({
      defaultTheme: mode === 'light' ? 'LIGHT' : 'DARK',
    });
    this.colorForm.markAsDirty();
  }

  onApplyPreset(key: string): void {
    const preset = THEME_PRESETS[key];
    if (preset) {
      this.colorForm.patchValue(preset.colors);
      this.themeService.applyPreset(key);
      this.colorForm.markAsDirty();
    }
  }

  isPresetActive(key: string): boolean {
    const preset = THEME_PRESETS[key];
    if (!preset) return false;
    const formPrimary = this.colorForm?.get('primary')?.value;
    return formPrimary?.toUpperCase() === preset.colors.primary.toUpperCase();
  }

  onAutoGeneratePalette(): void {
    const currentPrimary = this.colorForm.get('primary')?.value || '#6C7FE8';
    if (HEX_COLOR_PATTERN.test(currentPrimary)) {
      const generated = this.themeService.generatePaletteFromPrimary(currentPrimary);
      this.colorForm.patchValue(generated);
      this.themeService.setCustomColors(generated);
      this.colorForm.markAsDirty();
      this.showToast('Palette générée automatiquement avec succès !', 'success');
    }
  }

  onResetToDefaultTheme(): void {
    this.themeService.resetToDefaultColors();
    const defaults = this.themeService.currentCustomColors;
    this.colorForm.patchValue(defaults);
    this.colorForm.markAsDirty();
    this.showToast('Couleurs réinitialisées aux valeurs Figma par défaut.', 'info');
  }

  private darkenHex(hex: string, percent: number): string {
    const clean = (hex || '#6c7fe8').replace('#', '');
    const num = Number.parseInt(clean, 16);
    let r = (num >> 16) - Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00ff) - Math.round(255 * (percent / 100));
    let b = (num & 0x0000ff) - Math.round(255 * (percent / 100));
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // --- Live Ticket Simulation Status ---
  get simulatedStatus(): { label: string; colorClass: string; badgeClass: string } {
    const warning = Number(this.appSettingsForm.get('tempsAlerteWarningMinutes')?.value) || 3;
    const urgent = Number(this.appSettingsForm.get('tempsAlerteCommandeMinutes')?.value) || 5;
    const critical = Number(this.appSettingsForm.get('tempsAlerteCritiqueCommandeMinutes')?.value) || 10;

    const wait = this.simulatedWaitMinutes;
    if (wait >= critical) {
      return {
        label: `Critique (≥ ${critical} min)`,
        colorClass: 'status-critical',
        badgeClass: 'badge-critical',
      };
    }
    if (wait >= urgent) {
      return {
        label: `Urgent (≥ ${urgent} min)`,
        colorClass: 'status-urgent',
        badgeClass: 'badge-urgent',
      };
    }
    if (wait >= warning) {
      return {
        label: `Avertissement (≥ ${warning} min)`,
        colorClass: 'status-warning',
        badgeClass: 'badge-warning',
      };
    }
    return {
      label: `Normal (< ${warning} min)`,
      colorClass: 'status-normal',
      badgeClass: 'badge-normal',
    };
  }

  // --- Actions: Discard & Save All ---
  discardChanges(): void {
    if (this.initialEtabValue) {
      this.etabForm.patchValue(this.initialEtabValue);
      this.etabForm.markAsPristine();
    }
    if (this.initialAppSettingsValue) {
      this.appSettingsForm.patchValue(this.initialAppSettingsValue);
      this.appSettingsForm.markAsPristine();
    }
    if (this.initialColors) {
      this.colorForm.patchValue(this.initialColors);
      this.themeService.setCustomColors(this.initialColors);
      this.colorForm.markAsPristine();
    }
    if (this.initialThemeMode) {
      this.activeTheme = this.initialThemeMode;
      this.themeService.setTheme(this.initialThemeMode);
    }
  }

  saveAll(): void {
    if (this.etabForm.invalid) {
      this.activeTab = 'legal';
      this.etabForm.markAllAsTouched();
      this.showToast('Veuillez corriger les erreurs dans les informations légales.', 'danger');
      return;
    }

    if (this.appSettingsForm.invalid || this.colorForm.invalid) {
      this.appSettingsForm.markAllAsTouched();
      this.colorForm.markAllAsTouched();
      this.showToast('Veuillez vérifier les paramètres d\'alertes, devise ou couleurs.', 'danger');
      return;
    }

    this.isSaving = true;

    // Apply & persist in ThemeService
    const colors = this.colorForm.value as CustomThemeColors;
    this.themeService.setCustomColors(colors);

    const etabPayload = this.etabForm.value;
    const appSettingsPayload = {
      ...this.appSettingsForm.value,
      primaryColor: colors.primary,
      primaryColorStrong: this.darkenHex(colors.primary, 15),
      establishmentName: etabPayload.legalName || this.appSettingsForm.value.establishmentName || 'OpenBar',
    };

    forkJoin({
      etab: this.etablissementService.updateConfig(etabPayload),
      appSettings: this.appSettingsService.updateSettings(appSettingsPayload),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ etab, appSettings }) => {
          this.isSaving = false;
          this.initialEtabValue = { ...etab };
          this.initialAppSettingsValue = { ...appSettings };
          this.initialColors = { ...colors };
          this.initialThemeMode = this.activeTheme;

          this.etabForm.markAsPristine();
          this.appSettingsForm.markAsPristine();
          this.colorForm.markAsPristine();

          this.showToast(this.translocoService.translate('SETTINGS.SAVE_SUCCESS'), 'success');
        },
        error: () => {
          this.isSaving = false;
          this.showToast(this.translocoService.translate('SETTINGS.SAVE_ERROR'), 'danger');
        },
      });
  }

  /**
   * Resets the onboarding progression flag for the current authenticated user and redirects to /onboarding.
   */
  restartOnboarding(): void {
    const user = this.authService.getStoredUser();
    const userKey = user?.id ? String(user.id) : (user?.roles?.[0] || 'ADMIN');
    this.onboardingService.resetOnboarding(userKey);
    this.router.navigate(['/onboarding']);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'info'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
