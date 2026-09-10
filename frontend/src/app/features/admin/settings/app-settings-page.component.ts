import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
  signal,
  computed,
} from '@angular/core';

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
  IonBadge,
  IonButton,
  IonToggle,
  ToastController,
  AlertController,
  ModalController,
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
  cloudDownloadOutline,
  moonOutline,
  sunnyOutline,
  desktopOutline,
  warningOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
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
  pricetagOutline,
  printOutline,
  hardwareChipOutline,
  appsOutline,
  restaurantOutline,
  beerOutline,
  peopleOutline,
  gridOutline,
  nutritionOutline,
  documentTextOutline,
  briefcaseOutline,
  addCircleOutline,
  closeOutline,
} from 'ionicons/icons';
import { HappyHourConfigComponent } from './components/happy-hour-config/happy-hour-config.component';
import { LegalComponent, LegalTab } from '../../legal/legal.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { EtablissementService } from '../../../core/services/etablissement.service';
import { EstablishmentConfig } from '../../../core/models/establishment-config.model';
import { AppSettingsService } from '../../../core/services/app-settings.service';
import { AppSettings, CurrencyPosition } from '../../../core/models/app-settings.model';
import {
  CashDenomination,
  DEFAULT_EUR_DENOMINATIONS,
  getDefaultDenominationsForCurrency,
} from '../../../core/models/cash-denomination.model';
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
import { PrinterService } from '../../../core/services/printer.service';
import { AppUpdateService } from '../../../core/services/app-update.service';
import { PrinterRole } from '../../../core/models/printer.model';
import {
  EstablishmentModules,
  ESTABLISHMENT_PRESETS,
  EstablishmentPresetType,
} from '../../../core/models/establishment-module.model';
import { FeatureFlagService } from '../../../core/services/feature-flag.service';
/**
 * Active configuration tab on the admin settings page.
 */

export type SettingsTab = 'legal' | 'modules' | 'timers' | 'currency' | 'theme' | 'qr' | 'pricing' | 'printers';

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

/**
 * Cross-field validator ensuring Warning Gross Margin < Target Gross Margin.
 */
export function marginThresholdPriorityValidator(group: AbstractControl): ValidationErrors | null {
  const warning = Number(group.get('warningGrossMarginPercentage')?.value);
  const target = Number(group.get('targetGrossMarginPercentage')?.value);

  if (!Number.isNaN(warning) && !Number.isNaN(target) && warning >= target) {
    return { marginPriorityInvalid: true };
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

export interface VatPreset {
  country: string;
  rate: number;
  label: string;
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
    IonBadge,
    IonButton,
    IonToggle,
    TranslocoPipe,
    ActionButtonComponent,
    RoleBadgeComponent,
    StatusBadgeComponent,
    InputFieldComponent,
    SearchableSelectComponent,
    TicketReceiptComponent,
    HappyHourConfigComponent
],
})
export class AppSettingsPageComponent implements OnInit, OnDestroy, HasPendingChanges {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly etablissementService = inject(EtablissementService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly onboardingService = inject(OnboardingService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly modalCtrl = inject(ModalController);
  private readonly translocoService = inject(TranslocoService);
  private readonly printerService = inject(PrinterService);
  private readonly appUpdateService = inject(AppUpdateService);
  private readonly destroy$ = new Subject<void>();

  readonly happyHourEnabled = this.featureFlagService.happyHourEnabled;
  readonly qrClientOrderingEnabled = this.featureFlagService.qrClientOrderingEnabled;

  currentAppVersion = this.appUpdateService.currentVersion;
  isCheckingUpdates = false;
  updateCheckMessage: string | null = null;
  updateCheckSuccess = true;

  isTestingPrinter: Record<string, boolean> = {};

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
  modulesForm!: FormGroup;

  // Initial loaded states for reset
  initialEtabValue: Partial<EstablishmentConfig> = {};
  initialAppSettingsValue: Partial<AppSettings> = {};
  initialModulesValue: EstablishmentModules = {
    cuisineKds: true,
    happyHour: true,
    employeeManagement: true,
    floorPlan: true,
    qrClientOrdering: true,
    stockTracking: true,
  };
  initialThemeMode: AppTheme = 'dark';
  initialColors: CustomThemeColors = { ...DEFAULT_FIGMA_PALETTE };

  // Configured cash register denominations
  configuredDenominations = signal<CashDenomination[]>([...DEFAULT_EUR_DENOMINATIONS]);
  readonly bills = computed(() => this.configuredDenominations().filter(d => d.type === 'bill'));
  readonly coins = computed(() => this.configuredDenominations().filter(d => d.type === 'coin'));
  get billsCount(): number {
    return this.bills().length;
  }
  get coinsCount(): number {
    return this.coins().length;
  }

  newDenomType: 'bill' | 'coin' = 'bill';
  newDenomValue: number | null = null;

  readonly modulePresets: { type: Exclude<EstablishmentPresetType, 'CUSTOM'>; labelKey: string; icon: string; descKey: string }[] = [
    { type: 'BAR', labelKey: 'SETTINGS.MODULES_PRESET_BAR', icon: 'beer-outline', descKey: 'SETTINGS.MODULES_PRESET_BAR_DESC' },
    { type: 'RESTAURANT', labelKey: 'SETTINGS.MODULES_PRESET_RESTAURANT', icon: 'restaurant-outline', descKey: 'SETTINGS.MODULES_PRESET_RESTAURANT_DESC' },
    { type: 'FOOD_TRUCK', labelKey: 'SETTINGS.MODULES_PRESET_FOOD_TRUCK', icon: 'rocket-outline', descKey: 'SETTINGS.MODULES_PRESET_FOOD_TRUCK_DESC' },
    { type: 'NIGHTCLUB', labelKey: 'SETTINGS.MODULES_PRESET_NIGHTCLUB', icon: 'sparkles-outline', descKey: 'SETTINGS.MODULES_PRESET_NIGHTCLUB_DESC' },
  ];

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

  readonly vatPresets: VatPreset[] = [
    { country: 'FR', rate: 20.0, label: 'France (20%)' },
    { country: 'BE/ES', rate: 21.0, label: 'Belgique / Espagne (21%)' },
    { country: 'DE', rate: 19.0, label: 'Allemagne (19%)' },
    { country: 'CH', rate: 8.1, label: 'Suisse (8.1%)' },
    { country: 'US', rate: 0.0, label: 'Exempt / Hors-TVA (0%)' },
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
      checkmarkOutline,
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
      pricetagOutline,
      printOutline,
      hardwareChipOutline,
      cloudDownloadOutline,
      appsOutline,
      restaurantOutline,
      beerOutline,
      peopleOutline,
      gridOutline,
      nutritionOutline,
      documentTextOutline,
      briefcaseOutline,
      addCircleOutline,
      closeOutline,
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

    const validTabs = new Set<SettingsTab>(['legal', 'modules', 'timers', 'currency', 'theme', 'qr', 'pricing', 'printers']);

    if (this.route?.data) {
      this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
        if (data?.['defaultTab']) {
          const defTab = data['defaultTab'] as SettingsTab;
          if (!validTabs.has(defTab) ||
              (defTab === 'pricing' && !this.happyHourEnabled()) ||
              (defTab === 'qr' && !this.qrClientOrderingEnabled())) {
            this.router.navigate(['/404']);
            return;
          }
          this.activeTab = defTab;
        }
      });
    }

    if (this.route?.queryParams) {
      this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params?.['tab']) {
          const tab = params['tab'] as SettingsTab;
          if (!validTabs.has(tab) ||
              (tab === 'pricing' && !this.happyHourEnabled()) ||
              (tab === 'qr' && !this.qrClientOrderingEnabled())) {
            this.router.navigate(['/404']);
            return;
          }
          this.activeTab = tab;
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
        this.colorForm?.dirty ||
        this.modulesForm?.dirty) ??
      false
    );
  }

  selectTab(tab: SettingsTab): void {
    if (tab === 'pricing' && !this.happyHourEnabled()) {
      this.router.navigate(['/404']);
      return;
    }
    if (tab === 'qr' && !this.qrClientOrderingEnabled()) {
      this.router.navigate(['/404']);
      return;
    }
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  private initForms(): void {
    this.modulesForm = this.fb.group({
      cuisineKds: [true],
      happyHour: [true],
      employeeManagement: [true],
      floorPlan: [true],
      qrClientOrdering: [true],
      stockTracking: [true],
    });

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
      cashDenominationsJson: [''],
      defaultVatRate: [20.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      targetGrossMarginPercentage: [70.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      warningGrossMarginPercentage: [50.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      defaultTheme: ['DARK', [Validators.required]],
      primaryColor: ['#6c7fe8', [Validators.required]],
      primaryColorStrong: ['#5a68d6'],
      clientBaseUrl: [''],
      wifiSsid: ['', [Validators.maxLength(100)]],
      wifiPassword: ['', [Validators.maxLength(100)]],
      wifiSecurity: ['WPA', [Validators.required]],
      wifiEnabled: [false],
      tableSessionValidationEnabled: [false],
      barPrinterIp: ['', [Validators.pattern(/^(\d{1,3}\.){3}\d{1,3}$/)]],
      kitchenPrinterIp: ['', [Validators.pattern(/^(\d{1,3}\.){3}\d{1,3}$/)]],
      cashDeskPrinterIp: ['', [Validators.pattern(/^(\d{1,3}\.){3}\d{1,3}$/)]],
      printerPort: [9100, [Validators.min(1), Validators.max(65535)]],
      directPrintingEnabled: [false],
    }, { validators: [thresholdPriorityValidator, marginThresholdPriorityValidator] });

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
      modules: this.featureFlagService.loadModules().pipe(catchError(() => of(this.featureFlagService.modules()))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ etab, appSettings, timezones, modules }) => {
          if (timezones && timezones.length > 0) {
            this.timeZones = timezones;
          }

          if (etab && Object.keys(etab).length > 0) {
            const normalizedEtab = this.normalizeEtabConfig(etab);
            this.initialEtabValue = { ...normalizedEtab };
            this.etabForm.patchValue(normalizedEtab);
            this.etabForm.markAsPristine();
          }

          if (appSettings && Object.keys(appSettings).length > 0) {
            this.initialAppSettingsValue = { ...appSettings };
            this.appSettingsForm.patchValue(appSettings);
            this.appSettingsForm.markAsPristine();

            if (appSettings.primaryColor) {
              this.colorForm.patchValue({ primary: appSettings.primaryColor }, { emitEvent: false });
            }

            this.configuredDenominations.set(this.resolveDenominations(appSettings));
          } else {
            this.configuredDenominations.set([...DEFAULT_EUR_DENOMINATIONS]);
          }

          if (modules) {
            this.initialModulesValue = { ...modules };
            this.modulesForm.patchValue(modules);
            this.modulesForm.markAsPristine();
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

  /**
   * Validates and normalizes establishment legal configuration fields with sensible defaults.
   */
  private normalizeEtabConfig(etab: EstablishmentConfig): EstablishmentConfig {
    const normalized = { ...etab };
    if (!normalized.siret || !/^\d{14}$/.test(normalized.siret) || siretLuhnValidator({ value: normalized.siret } as AbstractControl) !== null) {
      normalized.siret = '73282932000074';
    }
    if (!normalized.country) {
      normalized.country = 'France';
    }
    if (!normalized.language) {
      normalized.language = 'fr';
    }
    return normalized;
  }

  /**
   * Resolves configured cash register denominations from serialized JSON or currency defaults.
   */
  private resolveDenominations(settings?: Partial<AppSettings> | null): CashDenomination[] {
    if (settings?.cashDenominationsJson) {
      try {
        const parsed = JSON.parse(settings.cashDenominationsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback to currency defaults on invalid JSON
      }
    }
    return getDefaultDenominationsForCurrency(
      settings?.currencyCode || 'EUR',
      settings?.currencySymbol || '€',
      settings?.currencyPosition || 'AFTER'
    );
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

  // --- Currency Presets & Cash Denominations ---
  applyCurrencyPreset(preset: CurrencyPreset): void {
    this.appSettingsForm.patchValue({
      currencyCode: preset.code,
      currencySymbol: preset.symbol,
      currencyPosition: preset.position,
    });
    const defaults = getDefaultDenominationsForCurrency(preset.code, preset.symbol, preset.position);
    this.configuredDenominations.set(defaults);
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

  /**
   * Removes a denomination from the current active cash counting list.
   *
   * @param key Unique key of the denomination to remove
   */
  removeDenomination(key: string): void {
    const updated = this.configuredDenominations().filter(d => d.key !== key);
    this.configuredDenominations.set(updated);
    this.appSettingsForm.markAsDirty();
  }

  /**
   * Adds a user-defined custom banknote or coin denomination to the active currency list.
   */
  addCustomDenomination(): void {
    if (this.newDenomValue === null || this.newDenomValue === undefined || this.newDenomValue <= 0) {
      return;
    }
    const val = Number(Number(this.newDenomValue).toFixed(2));
    const symbol = this.appSettingsForm.get('currencySymbol')?.value || '€';
    const pos = this.appSettingsForm.get('currencyPosition')?.value || 'AFTER';
    const label = pos === 'BEFORE' ? `${symbol} ${val}` : `${val} ${symbol}`;
    const key = `${this.newDenomType}_${val.toString().replace('.', '_')}`;

    const current = this.configuredDenominations();
    if (current.some(d => d.key === key || (d.value === val && d.type === this.newDenomType))) {
      this.showToast(this.translocoService.translate('SETTINGS.DENOMINATION_EXISTS'), 'warning');
      return;
    }

    const updated: CashDenomination[] = [
      ...current,
      {
        key,
        label,
        value: val,
        type: this.newDenomType,
      },
    ];
    updated.sort((a, b) => b.value - a.value);
    this.configuredDenominations.set(updated);
    this.newDenomValue = null;
    this.appSettingsForm.markAsDirty();
  }

  /**
   * Resets the active denomination list to the official default banknotes and coins for the selected currency.
   */
  resetDenominationsToDefault(): void {
    const code = this.appSettingsForm.get('currencyCode')?.value || 'EUR';
    const symbol = this.appSettingsForm.get('currencySymbol')?.value || '€';
    const position = this.appSettingsForm.get('currencyPosition')?.value || 'AFTER';
    this.configuredDenominations.set(getDefaultDenominationsForCurrency(code, symbol, position));
    this.appSettingsForm.markAsDirty();
    this.showToast(this.translocoService.translate('SETTINGS.DENOMINATIONS_RESET_SUCCESS'), 'info');
  }

  // --- VAT & Margin Helpers ---
  applyVatPreset(rate: number): void {
    this.appSettingsForm.patchValue({ defaultVatRate: rate });
    this.appSettingsForm.markAsDirty();
  }

  get effectiveVatRate(): number {
    const val = Number(this.appSettingsForm?.get('defaultVatRate')?.value);
    return Number.isNaN(val) ? 20.0 : val;
  }

  get effectiveTargetMargin(): number {
    const val = Number(this.appSettingsForm?.get('targetGrossMarginPercentage')?.value);
    return Number.isNaN(val) ? 70.0 : val;
  }

  get effectiveWarningMargin(): number {
    const val = Number(this.appSettingsForm?.get('warningGrossMarginPercentage')?.value);
    return Number.isNaN(val) ? 50.0 : val;
  }

  getMarginBadgeClass(marginPercentage: number): string {
    if (marginPercentage >= this.effectiveTargetMargin) {
      return 'badge-optimal';
    }
    if (marginPercentage >= this.effectiveWarningMargin) {
      return 'badge-warning';
    }
    return 'badge-critical';
  }

  simulateMargin(prixTTC: number, coutRevient: number): { prixHT: number; margeBrute: number; margePct: number } {
    const vatFactor = 1 + (this.effectiveVatRate / 100);
    const prixHT = Number((prixTTC / vatFactor).toFixed(2));
    const margeBrute = Number((prixHT - coutRevient).toFixed(2));
    const margePct = prixHT > 0 ? Number(((margeBrute / prixHT) * 100).toFixed(1)) : 0;
    return { prixHT, margeBrute, margePct };
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
      this.configuredDenominations.set(this.resolveDenominations(this.initialAppSettingsValue));
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
    if (this.initialModulesValue && this.modulesForm) {
      this.modulesForm.patchValue(this.initialModulesValue);
      this.modulesForm.markAsPristine();
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
      cashDenominationsJson: JSON.stringify(this.configuredDenominations()),
    };

    const updatePayload: Record<string, any> = {
      etab: this.etablissementService.updateConfig(etabPayload),
      appSettings: this.appSettingsService.updateSettings(appSettingsPayload),
    };

    if (this.modulesForm?.dirty) {
      updatePayload['modules'] = this.featureFlagService.updateModules(this.modulesForm.value);
    }

    forkJoin(updatePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isSaving = false;
          this.initialEtabValue = { ...res.etab };
          this.initialAppSettingsValue = { ...res.appSettings };
          this.initialColors = { ...colors };
          this.initialThemeMode = this.activeTheme;

          if (res.modules) {
            this.initialModulesValue = { ...res.modules };
            this.modulesForm.patchValue(res.modules);
            this.modulesForm.markAsPristine();
          }

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
   * Persists establishment modular capability switches via the REST API.
   */
  saveModules(): void {
    if (this.modulesForm.invalid) return;
    this.isSaving = true;
    this.featureFlagService
      .updateModules(this.modulesForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.initialModulesValue = { ...updated };
          this.modulesForm.patchValue(updated);
          this.modulesForm.markAsPristine();
          this.showToast(this.translocoService.translate('SETTINGS.MODULES_SAVE_SUCCESS'), 'success');
        },
        error: () => {
          this.isSaving = false;
          this.showToast(this.translocoService.translate('SETTINGS.MODULES_SAVE_ERROR'), 'danger');
        },
      });
  }

  /**
   * Resets modular capability form switches to their last confirmed saved state.
   */
  resetModules(): void {
    this.modulesForm.patchValue(this.initialModulesValue);
    this.modulesForm.markAsPristine();
  }

  /**
   * Applies an establishment activity preset (e.g. BAR, RESTAURANT, FOOD_TRUCK, NIGHTCLUB).
   *
   * @param preset Preset key
   */
  applyModulesPreset(preset: Exclude<EstablishmentPresetType, 'CUSTOM'>): void {
    const presetValues = ESTABLISHMENT_PRESETS[preset];
    if (presetValues) {
      this.modulesForm.patchValue(presetValues);
      this.modulesForm.markAsDirty();
    }
  }

  /**
   * Checks whether the current modular capability toggles match an establishment preset.
   *
   * @param preset Preset key (BAR, RESTAURANT, FOOD_TRUCK, NIGHTCLUB)
   * @returns True if active form values match the preset definition
   */
  isModulePresetActive(preset: Exclude<EstablishmentPresetType, 'CUSTOM'>): boolean {
    if (!this.modulesForm) {
      return false;
    }
    const current = this.modulesForm.value;
    const target = ESTABLISHMENT_PRESETS[preset];
    if (!target) {
      return false;
    }
    return (
      !!current.cuisineKds === target.cuisineKds &&
      !!current.happyHour === target.happyHour &&
      !!current.employeeManagement === target.employeeManagement &&
      !!current.floorPlan === target.floorPlan &&
      !!current.qrClientOrdering === target.qrClientOrdering &&
      !!current.stockTracking === target.stockTracking
    );
  }

  /**
   * Total count of available modular capabilities.
   */
  readonly totalModulesCount = 6;

  /**
   * Computes the number of currently active modules in modulesForm.
   *
   * @returns Active modules count between 0 and 6
   */
  get activeModulesCount(): number {
    if (!this.modulesForm) {
      return 0;
    }
    const val = this.modulesForm.value;
    return Object.values(val).filter(Boolean).length;
  }

  /**
   * Checks whether a specific module control is enabled in modulesForm.
   *
   * @param key Control key name in modulesForm
   * @returns True if active
   */
  isModuleControlActive(key: string): boolean {
    return !!this.modulesForm?.get(key)?.value;
  }

  /**
   * Dispatches a diagnostic test print to the configured printer for the given role.
   *
   * @param role Printer role (BAR, KITCHEN, CASH_DESK)
   */
  testPrint(role: PrinterRole): void {
    const controlMap: Record<PrinterRole, string> = {
      BAR: 'barPrinterIp',
      KITCHEN: 'kitchenPrinterIp',
      CASH_DESK: 'cashDeskPrinterIp',
    };
    const ipControlName = controlMap[role];
    if (!this.appSettingsForm.get(ipControlName)?.value) {
      return;
    }
    this.isTestingPrinter[role] = true;
    this.printerService.testPrintRole(role)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isTestingPrinter[role] = false;
          if (res.success) {
            this.showToast(
              this.translocoService.translate('SETTINGS.PRINTER_TEST_SUCCESS', { role: res.role, ip: res.ip || '' }),
              'success'
            );
          } else {
            this.showToast(
              this.translocoService.translate('SETTINGS.PRINTER_TEST_FAILED', { role: res.role, error: res.message }),
              'danger'
            );
          }
        },
        error: (err) => {
          this.isTestingPrinter[role] = false;
          this.showToast(
            this.translocoService.translate('SETTINGS.PRINTER_TEST_FAILED', { role, error: err?.message || 'Error' }),
            'danger'
          );
        },
      });
  }

  /**
   * Pulses the cash drawer kick command to test the cash drawer latch release.
   */
  testCashDrawer(): void {
    if (!this.appSettingsForm.get('cashDeskPrinterIp')?.value) {
      return;
    }
    this.isTestingPrinter['drawer'] = true;
    this.printerService.openCashDrawer()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isTestingPrinter['drawer'] = false;
          if (res.success) {
            this.showToast(this.translocoService.translate('SETTINGS.DRAWER_TEST_SUCCESS'), 'success');
          } else {
            this.showToast(
              this.translocoService.translate('SETTINGS.DRAWER_TEST_FAILED', { error: res.message }),
              'danger'
            );
          }
        },
        error: (err) => {
          this.isTestingPrinter['drawer'] = false;
          this.showToast(
            this.translocoService.translate('SETTINGS.DRAWER_TEST_FAILED', { error: err?.message || 'Error' }),
            'danger'
          );
        },
      });
  }

  /**
   * Manually checks for newer official releases and displays the update dialog if found.
   */
  async checkForUpdates(): Promise<void> {
    if (this.isCheckingUpdates) {
      return;
    }
    this.isCheckingUpdates = true;
    this.updateCheckMessage = null;

    try {
      const result = await this.appUpdateService.checkNewerRelease();
      if (result.hasUpdate && result.latestRelease) {
        this.updateCheckSuccess = true;
        this.updateCheckMessage = this.translocoService.translate('APP_SETTINGS_UPDATES.UPDATE_AVAILABLE', {
          version: result.latestRelease.version,
        });
        await this.appUpdateService.presentUpdateModal(result.latestRelease);
      } else {
        this.updateCheckSuccess = true;
        this.updateCheckMessage = this.translocoService.translate('APP_SETTINGS_UPDATES.UP_TO_DATE', {
          version: this.currentAppVersion,
        });
      }
    } catch {
      this.updateCheckSuccess = false;
      this.updateCheckMessage = this.translocoService.translate('APP_SETTINGS_UPDATES.CHECK_FAILED');
    } finally {
      this.isCheckingUpdates = false;
    }
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

  /**
   * Opens the legal viewer modal with terms of service, license, compliance, or commercial offers.
   *
   * @param tab Target legal tab to display ('terms' | 'license' | 'compliance' | 'commercial')
   */
  async openLegalModal(tab: LegalTab = 'terms'): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: LegalComponent,
      componentProps: {
        initialTab: tab,
        isModal: true,
      },
    });
    await modal.present();
  }
}
