import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonTextarea,
  IonSpinner,
  ToastController,
  ModalController,
} from '@ionic/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, takeUntil } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  keyOutline,
  shieldCheckmarkOutline,
  cloudDoneOutline,
  cloudOfflineOutline,
  refreshOutline,
  documentAttachOutline,
  copyOutline,
  warningOutline,
  lockClosedOutline,
  checkmarkCircleOutline,
  trashOutline,
  appsOutline,
  receiptOutline,
  timeOutline,
} from 'ionicons/icons';
import { LicenseService } from '../../../core/services/license.service';
import { MonetizationService } from '../../../core/services/monetization.service';
import { FeatureFlagService } from '../../../core/services/feature-flag.service';
import { LicenseStatus, LicenseStatusInfo } from '../../../core/models/license.model';
import {
  CommissionSyncResult,
  LedgerVerificationResult,
  MonetizationDashboard,
  MonthlyCommissionProof,
} from '../../../core/models/monetization.model';
import { EstablishmentModule } from '../../../core/models/establishment-module.model';
import { selectCurrentUser } from '../../../core/store/auth.selectors';
import { StatCardComponent, StatCardColor } from '../../../core/components/ui/stat-card/stat-card.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';
import { ConfirmModalComponent, ConfirmModalResult } from '../../../core/components/ui/confirm-modal/confirm-modal.component';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';

/**
 * Administrative License Management page (/admin/license).
 * <p>
 * Allows administrators to inspect cryptographic license status, view the 2-day grace
 * countdown, activate offline JWT license keys (paste or file upload), trigger online
 * license synchronization, and inspect module entitlements.
 */
@Component({
  selector: 'app-license-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonIcon,
    IonTextarea,
    IonSpinner,
    TranslocoPipe,
    StatCardComponent,
    ActionButtonComponent,
    SearchableSelectComponent,
    AppCurrencyPipe,
  ],
  templateUrl: './license-page.component.html',
  styleUrls: ['./license-page.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class LicensePageComponent implements OnInit, OnDestroy {
  @ViewChild('licenseFileInput') licenseFileInput?: ElementRef<HTMLInputElement>;

  private readonly licenseService = inject(LicenseService);
  private readonly monetizationService = inject(MonetizationService, { optional: true });
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly transloco = inject(TranslocoService);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);
  private readonly store = inject(Store, { optional: true });
  private readonly destroy$ = new Subject<void>();

  /** All modular capabilities defined by OpenBar. */
  readonly allModules: EstablishmentModule[] = Object.values(EstablishmentModule);

  /** Loaded detailed license snapshot. */
  readonly license = signal<LicenseStatusInfo | null>(null);

  /** Loaded dual-tier TPE monetization dashboard snapshot. */
  readonly monetizationDashboard = signal<MonetizationDashboard | null>(null);

  /** Selected YYYY-MM billing period for commission inspection and Z-report export. */
  selectedPeriod = this.resolveCurrentYearMonth();

  /** Selectable recent billing period options for SearchableSelect. */
  readonly periodOptions: SearchableOption<string>[] = this.buildRecentPeriodOptions();

  /** Latest explicit SHA-256 ledger integrity verification report. */
  readonly verificationResult = signal<LedgerVerificationResult | null>(null);

  /** Last exported monthly offline Z-report proof bundle. */
  readonly lastExportedProof = signal<MonthlyCommissionProof | null>(null);

  /** In-flight flags for monetization operations. */
  readonly isMonetizationLoading = signal<boolean>(false);
  readonly isVerifyingLedger = signal<boolean>(false);
  readonly isExportingProof = signal<boolean>(false);
  readonly isSyncingCommissions = signal<boolean>(false);
  readonly commissionSyncFeedback = signal<string | null>(null);

  /** Loading flag for initial fetch. */
  readonly isLoading = signal<boolean>(true);

  /** In-flight flag for offline activation. */
  readonly isActivating = signal<boolean>(false);

  /** In-flight flag for online sync. */
  readonly isSyncing = signal<boolean>(false);

  /** In-flight flag for license deactivation. */
  readonly isDeactivating = signal<boolean>(false);

  /** Whether the authenticated user holds the ADMIN role. */
  readonly isAdmin = signal<boolean>(false);

  /** Offline JWT input bound to textarea. */
  offlineTokenInput = '';

  /** Inline error banner for activation failures. */
  readonly activationError = signal<string | null>(null);

  /** Last sync feedback message. */
  readonly syncFeedback = signal<string | null>(null);

  /** Semantic color mapped to the active license status. */
  readonly statusColor = computed<StatCardColor>(() => {
    const status = this.license()?.status;
    return this.resolveStatusColor(status);
  });

  /** Ionic badge color mapped to the active license status. */
  readonly statusBadgeColor = computed<string>(() => {
    const status = this.license()?.status;
    if (status === 'VALID' || status === 'COMMUNITY') return 'success';
    if (status === 'GRACE_PERIOD') return 'warning';
    if (status === 'EXPIRED' || status === 'INVALID') return 'danger';
    return 'medium';
  });

  /** Countdown value shown in the expiration KPI card. */
  readonly validityStatValue = computed<string>(() => {
    const info = this.license();
    if (!info) return '—';
    if (info.status === 'GRACE_PERIOD') {
      return `${info.graceHoursRemaining}h`;
    }
    if (info.status === 'VALID') {
      return `${info.daysRemaining}j`;
    }
    if (info.status === 'COMMUNITY') {
      return '∞';
    }
    return '0';
  });

  constructor() {
    addIcons({
      keyOutline,
      shieldCheckmarkOutline,
      cloudDoneOutline,
      cloudOfflineOutline,
      refreshOutline,
      documentAttachOutline,
      copyOutline,
      warningOutline,
      lockClosedOutline,
      checkmarkCircleOutline,
      trashOutline,
      appsOutline,
      receiptOutline,
      timeOutline,
    });
  }

  /** @inheritdoc */
  ngOnInit(): void {
    this.observeUserRole();
    this.loadLicenseStatus();
    this.loadMonetizationDashboard();
  }

  /** @inheritdoc */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Fetches the detailed administrative license status from the backend. */
  loadLicenseStatus(): void {
    this.isLoading.set(true);
    this.licenseService
      .getFullStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: info => {
          this.license.set(info);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          void this.showToast('LICENSE.ERRORS.LOAD_FAILED', 'danger');
        },
      });
  }

  /** Opens the hidden file selector to load a .lic / .jwt / .txt license file. */
  triggerFilePicker(): void {
    this.licenseFileInput?.nativeElement.click();
  }

  /** Reads a selected text/JWT license file into the offline token textarea. */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    const text = (await file.text()).trim();
    this.offlineTokenInput = text;
    this.activationError.set(null);
    input.value = '';
  }

  /** Validates and activates the entered offline JWT license token. */
  activateOffline(): void {
    const trimmed = this.offlineTokenInput.trim();
    if (!this.isValidJwtShape(trimmed)) {
      this.activationError.set(this.transloco.translate('LICENSE.ERRORS.INVALID_JWT_FORMAT'));
      return;
    }

    this.activationError.set(null);
    this.isActivating.set(true);
    this.licenseService
      .activateOfflineLicense(trimmed)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          this.license.set(updated);
          this.offlineTokenInput = '';
          this.isActivating.set(false);
          this.featureFlagService.loadModules().subscribe();
          void this.showToast('LICENSE.TOASTS.ACTIVATED', 'success');
        },
        error: err => {
          this.isActivating.set(false);
          const msg = err?.error?.message || this.transloco.translate('LICENSE.ERRORS.ACTIVATION_FAILED');
          this.activationError.set(msg);
          void this.showToast('LICENSE.ERRORS.ACTIVATION_FAILED', 'danger');
        },
      });
  }

  /** Triggers an immediate online license synchronization request. */
  syncOnline(): void {
    this.isSyncing.set(true);
    this.syncFeedback.set(null);
    this.licenseService
      .syncOnline()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.isSyncing.set(false);
          if (res?.license) {
            this.license.set(res.license);
          }
          this.syncFeedback.set(res?.message || null);
          this.featureFlagService.loadModules().subscribe();
          const tone = res?.reachable ? 'success' : 'warning';
          void this.showToast(
            res?.synced ? 'LICENSE.TOASTS.SYNCED' : 'LICENSE.TOASTS.SYNC_CHECKED',
            tone
          );
        },
        error: () => {
          this.isSyncing.set(false);
          void this.showToast('LICENSE.ERRORS.SYNC_FAILED', 'danger');
        },
      });
  }

  /** Prompts for confirmation before clearing the stored commercial license token. */
  async confirmDeactivate(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ConfirmModalComponent,
      componentProps: {
        title: this.transloco.translate('LICENSE.DEACTIVATE_MODAL.TITLE'),
        message: this.transloco.translate('LICENSE.DEACTIVATE_MODAL.MESSAGE'),
        icon: 'trash-outline',
        tone: 'danger',
        confirmBtnText: this.transloco.translate('LICENSE.DEACTIVATE_MODAL.CONFIRM'),
      },
    });
    await modal.present();
    const { data } = await modal.onDidDismiss<ConfirmModalResult>();
    if (data?.confirmed) {
      this.executeDeactivate();
    }
  }

  /** Copies the venue establishment ID (SIRET) to the system clipboard. */
  async copyVenueId(): Promise<void> {
    const id = this.license()?.venueEstablishmentId;
    if (!id) {
      return;
    }
    try {
      await navigator.clipboard.writeText(id);
      void this.showToast('LICENSE.TOASTS.ID_COPIED', 'info');
    } catch {
      void this.showToast('LICENSE.ERRORS.COPY_FAILED', 'warning');
    }
  }

  /** Checks whether a specific module is unlocked by the current license. */
  isModuleIncluded(module: EstablishmentModule): boolean {
    const info = this.license();
    if (!info) return false;
    if (info.allModulesLicensed) return true;
    const list = info.licensedModules || [];
    return list.includes('*') || list.includes('ALL') || list.includes(module);
  }

  /** Returns the localized translation key for a license status code. */
  getStatusLabelKey(status?: LicenseStatus | null): string {
    if (!status) return 'LICENSE.STATUS.UNKNOWN';
    return `LICENSE.STATUS.${status}`;
  }

  /** Loads the dual-tier TPE monetization and commission ledger dashboard for the selected month. */
  loadMonetizationDashboard(period: string = this.selectedPeriod): void {
    if (!this.monetizationService) {
      return;
    }
    this.isMonetizationLoading.set(true);
    this.monetizationService
      .getDashboard(period)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.monetizationDashboard.set(data);
          this.verificationResult.set(data?.integrity ?? null);
          this.isMonetizationLoading.set(false);
        },
        error: () => {
          this.isMonetizationLoading.set(false);
        },
      });
  }

  /** Handles billing period dropdown change. */
  onPeriodChange(period: string | null): void {
    if (!period) return;
    this.selectedPeriod = period;
    this.loadMonetizationDashboard(period);
  }

  /** Executes a SHA-256 chain verification audit across the local card commission ledger. */
  verifyLedgerIntegrity(): void {
    if (!this.monetizationService) return;
    this.isVerifyingLedger.set(true);
    this.monetizationService
      .verifyIntegrity()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.verificationResult.set(res);
          this.isVerifyingLedger.set(false);
          void this.showToast(
            res?.valid ? 'MONETIZATION.TOASTS.CHAIN_VALID' : 'MONETIZATION.TOASTS.CHAIN_BROKEN',
            res?.valid ? 'success' : 'danger'
          );
        },
        error: () => {
          this.isVerifyingLedger.set(false);
          void this.showToast('MONETIZATION.ERRORS.VERIFY_FAILED', 'danger');
        },
      });
  }

  /** Downloads the signed monthly Z-report & card commission proof as a JSON file for openbar.fr. */
  downloadMonthlyProof(): void {
    if (!this.monetizationService) return;
    this.isExportingProof.set(true);
    this.monetizationService
      .exportMonthlyProof(this.selectedPeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: proof => {
          this.lastExportedProof.set(proof);
          this.isExportingProof.set(false);
          this.triggerJsonFileDownload(proof);
          this.loadMonetizationDashboard(this.selectedPeriod);
          void this.showToast('MONETIZATION.TOASTS.PROOF_EXPORTED', 'success');
        },
        error: () => {
          this.isExportingProof.set(false);
          void this.showToast('MONETIZATION.ERRORS.EXPORT_FAILED', 'danger');
        },
      });
  }

  /** Copies the compact Base64url monthly proof token for manual portal renewal. */
  async copyProofToken(): Promise<void> {
    if (!this.monetizationService) return;
    const cached = this.lastExportedProof();
    if (cached?.compactProofToken) {
      await this.writeClipboard(cached.compactProofToken, 'MONETIZATION.TOASTS.TOKEN_COPIED');
      return;
    }
    this.monetizationService
      .exportMonthlyProof(this.selectedPeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async proof => {
          this.lastExportedProof.set(proof);
          await this.writeClipboard(proof.compactProofToken, 'MONETIZATION.TOASTS.TOKEN_COPIED');
        },
        error: () => {
          void this.showToast('MONETIZATION.ERRORS.EXPORT_FAILED', 'danger');
        },
      });
  }

  /** Synchronizes Option 1 card volume receipts online with the central Stripe Billing service. */
  syncCommissionOnline(): void {
    if (!this.monetizationService) return;
    this.isSyncingCommissions.set(true);
    this.commissionSyncFeedback.set(null);
    this.monetizationService
      .syncOnline(this.selectedPeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: CommissionSyncResult) => {
          this.isSyncingCommissions.set(false);
          this.commissionSyncFeedback.set(res?.message || null);
          this.loadMonetizationDashboard(this.selectedPeriod);
          void this.showToast(
            res?.onlineReachable ? 'MONETIZATION.TOASTS.SYNC_SUCCESS' : 'MONETIZATION.TOASTS.SYNC_OFFLINE',
            res?.onlineReachable ? 'success' : 'warning'
          );
        },
        error: () => {
          this.isSyncingCommissions.set(false);
          void this.showToast('MONETIZATION.ERRORS.SYNC_FAILED', 'danger');
        },
      });
  }

  /** Formats rate basis points + fixed cents into a concise display string (e.g. 1.20% + 0.10€). */
  formatTierRate(rateBps: number, fixedCents: number): string {
    const pct = (rateBps / 100).toFixed(2);
    const fixed = (fixedCents / 100).toFixed(2);
    return `${pct}% + ${fixed}€`;
  }

  /** Truncates a 64-char SHA-256 hash for compact display. */
  shortenHash(hash?: string | null): string {
    if (!hash || hash.length < 16) return hash || '—';
    return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
  }

  private triggerJsonFileDownload(proof: MonthlyCommissionProof): void {
    try {
      const json = JSON.stringify(proof, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `openbar-commission-proof-${proof.billingPeriod}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      // Ignore in headless/non-DOM unit test environments
    }
  }

  private async writeClipboard(text: string, toastKey: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      void this.showToast(toastKey, 'info');
    } catch {
      void this.showToast('LICENSE.ERRORS.COPY_FAILED', 'warning');
    }
  }

  private resolveCurrentYearMonth(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }

  private buildRecentPeriodOptions(): SearchableOption<string>[] {
    const options: SearchableOption<string>[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      options.push({
        value: val,
        label: val,
        badge: i === 0 ? 'LIVE' : undefined,
        badgeType: i === 0 ? 'primary' : 'neutral',
      });
    }
    return options;
  }

  private executeDeactivate(): void {
    this.isDeactivating.set(true);
    this.licenseService
      .deactivateLicense()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          this.license.set(updated);
          this.isDeactivating.set(false);
          this.featureFlagService.loadModules().subscribe();
          void this.showToast('LICENSE.TOASTS.DEACTIVATED', 'info');
        },
        error: () => {
          this.isDeactivating.set(false);
          void this.showToast('LICENSE.ERRORS.DEACTIVATE_FAILED', 'danger');
        },
      });
  }

  private observeUserRole(): void {
    if (!this.store) {
      return;
    }
    this.store
      .select(selectCurrentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isAdmin.set(Boolean(user?.roles?.includes('ADMIN')));
      });
  }

  private isValidJwtShape(token: string): boolean {
    if (!token) return false;
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  private resolveStatusColor(status?: LicenseStatus): StatCardColor {
    if (status === 'VALID' || status === 'COMMUNITY') return 'success';
    if (status === 'GRACE_PERIOD') return 'warning';
    if (status === 'EXPIRED' || status === 'INVALID') return 'danger';
    return 'primary';
  }

  private async showToast(key: string, color: 'success' | 'danger' | 'warning' | 'info'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.transloco.translate(key),
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
