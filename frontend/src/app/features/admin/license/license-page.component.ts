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
import { FeatureFlagService } from '../../../core/services/feature-flag.service';
import { LicenseStatus, LicenseStatusInfo } from '../../../core/models/license.model';
import { EstablishmentModule } from '../../../core/models/establishment-module.model';
import { selectCurrentUser } from '../../../core/store/auth.selectors';
import { StatCardComponent, StatCardColor } from '../../../core/components/ui/stat-card/stat-card.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { ConfirmModalComponent, ConfirmModalResult } from '../../../core/components/ui/confirm-modal/confirm-modal.component';

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
  ],
  templateUrl: './license-page.component.html',
  styleUrls: ['./license-page.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class LicensePageComponent implements OnInit, OnDestroy {
  @ViewChild('licenseFileInput') licenseFileInput?: ElementRef<HTMLInputElement>;

  private readonly licenseService = inject(LicenseService);
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
