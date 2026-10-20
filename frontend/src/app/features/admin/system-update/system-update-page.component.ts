import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  IonModal,
  IonProgressBar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cloudDownloadOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  warningOutline,
  serverOutline,
  hardwareChipOutline,
  discOutline,
  gitBranchOutline,
  sparklesOutline,
  archiveOutline,
  trashOutline,
  playForwardOutline,
  alertCircleOutline,
  documentTextOutline,
  checkmarkOutline,
  closeOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, interval, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectCurrentUser } from '../../../core/store/auth.selectors';
import { SystemUpdateService } from '../../../core/services/system-update.service';
import {
  SystemVersionInfo,
  SystemUpdateCheck,
  SystemUpdateStatus,
  SystemPreFlight,
  SystemSnapshot,
  UpdateChannel,
} from '../../../core/models/system-update.model';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { FilterChipComponent } from '../../../core/components/ui/filter-chip/filter-chip.component';
import { StatCardComponent } from '../../../core/components/ui/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../../core/components/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../core/components/ui/modal/modal.component';

/**
 * Administrative page component for Over-The-Air software updates,
 * version check, release notes inspection, live update progress, and rollback snapshot management.
 */
@Component({
  selector: 'app-system-update-page',
  templateUrl: './system-update-page.component.html',
  styleUrls: ['./system-update-page.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonIcon,
    IonModal,
    IonProgressBar,
    TranslocoPipe,
    ActionButtonComponent,
    FilterChipComponent,
    StatCardComponent,
    EmptyStateComponent,
    ModalComponent,
  ],
})
export class SystemUpdatePageComponent implements OnInit, OnDestroy {
  private readonly systemUpdateService = inject(SystemUpdateService);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastCtrl = inject(ToastController);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  // State Signals
  readonly versionInfo = signal<SystemVersionInfo | null>(null);
  readonly updateCheck = signal<SystemUpdateCheck | null>(null);
  readonly updateStatus = signal<SystemUpdateStatus | null>(null);
  readonly preFlight = signal<SystemPreFlight | null>(null);
  readonly snapshots = signal<SystemSnapshot[]>([]);
  readonly selectedChannel = signal<UpdateChannel>('STABLE');

  readonly isLoadingVersion = signal<boolean>(true);
  readonly isCheckingUpdate = signal<boolean>(false);
  readonly isTriggeringUpdate = signal<boolean>(false);
  readonly isRestoringSnapshot = signal<boolean>(false);
  readonly isDeletingSnapshot = signal<string | null>(null);

  // Modals visibility
  readonly isPreFlightModalOpen = signal<boolean>(false);
  readonly isUpdateModalOpen = signal<boolean>(false);
  readonly isRestoreModalOpen = signal<boolean>(false);
  readonly targetRestoreSnapshot = signal<SystemSnapshot | null>(null);

  // User Permissions
  private readonly currentUser = toSignal(this.store.select(selectCurrentUser), { initialValue: null });
  readonly isAdmin = computed(() => this.currentUser()?.roles?.includes('ADMIN') ?? false);
  readonly isManager = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('ADMIN') || roles.includes('MANAGER');
  });

  // Formatted disk metrics
  readonly freeDiskGb = computed(() => {
    const bytes = this.versionInfo()?.freeDiskBytes ?? 0;
    return (bytes / (1024 * 1024 * 1024)).toFixed(1);
  });

  readonly totalDiskGb = computed(() => {
    const bytes = this.versionInfo()?.totalDiskBytes ?? 0;
    return (bytes / (1024 * 1024 * 1024)).toFixed(1);
  });

  constructor() {
    addIcons({
      arrowBackOutline,
      cloudDownloadOutline,
      refreshOutline,
      shieldCheckmarkOutline,
      warningOutline,
      serverOutline,
      hardwareChipOutline,
      discOutline,
      gitBranchOutline,
      sparklesOutline,
      archiveOutline,
      trashOutline,
      playForwardOutline,
      alertCircleOutline,
      documentTextOutline,
      checkmarkOutline,
      closeOutline,
    });
  }

  ngOnInit(): void {
    this.loadVersionInfo();
    this.loadSnapshots();
    this.checkForUpdates();
    this.checkLiveUpdateStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetches host platform and system runtime version information.
   */
  loadVersionInfo(): void {
    this.isLoadingVersion.set(true);
    this.systemUpdateService.getVersionInfo().pipe(takeUntil(this.destroy$)).subscribe({
      next: (info) => {
        this.versionInfo.set(info);
        this.isLoadingVersion.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingVersion.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Loads archived pre-update database and container snapshots.
   */
  loadSnapshots(): void {
    this.systemUpdateService.listSnapshots().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.snapshots.set(list);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  /**
   * Sets release channel and immediately checks for new software releases.
   *
   * @param channel Desired release channel
   */
  setChannel(channel: UpdateChannel): void {
    this.selectedChannel.set(channel);
    this.checkForUpdates();
  }

  /**
   * Queries GitHub Releases for newer versions on the selected channel.
   */
  checkForUpdates(): void {
    this.isCheckingUpdate.set(true);
    this.systemUpdateService.checkForUpdates(this.selectedChannel()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (check) => {
        this.updateCheck.set(check);
        this.isCheckingUpdate.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isCheckingUpdate.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Opens pre-flight checks modal before initiating the update.
   */
  openPreFlightModal(): void {
    this.systemUpdateService.getPreFlight().pipe(takeUntil(this.destroy$)).subscribe({
      next: (preflight) => {
        this.preFlight.set(preflight);
        this.isPreFlightModalOpen.set(true);
        this.cdr.markForCheck();
      },
      error: () => {
        void this.showToast('Impossible de vérifier les pré-requis système.', 'danger');
      },
    });
  }

  /**
   * Closes the pre-flight modal.
   */
  closePreFlightModal(): void {
    this.isPreFlightModalOpen.set(false);
    this.cdr.markForCheck();
  }

  /**
   * Initiates the OTA software update and opens the live progress modal with resilient polling.
   */
  confirmAndLaunchUpdate(): void {
    this.isPreFlightModalOpen.set(false);
    this.isTriggeringUpdate.set(true);
    this.isUpdateModalOpen.set(true);

    const targetVer = this.updateCheck()?.latestVersion;
    this.systemUpdateService.triggerUpdate({
      targetVersion: targetVer,
      channel: this.selectedChannel(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (status) => {
        this.updateStatus.set(status);
        this.isTriggeringUpdate.set(false);
        this.startUpdateStatusPolling();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isTriggeringUpdate.set(false);
        const apiError = err as { error?: { message?: string } } | null;
        void this.showToast(apiError?.error?.message || 'Échec de démarrage de la mise à jour.', 'danger');
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Starts resilient polling to monitor the background orchestrator execution.
   */
  startUpdateStatusPolling(): void {
    const pollDestroy$ = new Subject<void>();

    interval(2500).pipe(
      takeUntil(this.destroy$),
      takeUntil(pollDestroy$),
      switchMap(() => this.systemUpdateService.getUpdateStatus().pipe(
        catchError(() => of(null)) // gracefully tolerate 502/network drops during container restart
      ))
    ).subscribe((status) => {
      if (status) {
        this.updateStatus.set(status);
        this.cdr.markForCheck();

        if (status.status === 'SUCCESS' || status.status === 'FAILED_ROLLED_BACK') {
          pollDestroy$.next();
          pollDestroy$.complete();
          this.loadSnapshots();
        }
      }
    });
  }

  /**
   * Checks whether an update was already in progress when the page opened.
   */
  checkLiveUpdateStatus(): void {
    this.systemUpdateService.getUpdateStatus().pipe(takeUntil(this.destroy$)).subscribe({
      next: (status) => {
        if (status?.status === 'RUNNING') {
          this.updateStatus.set(status);
          this.isUpdateModalOpen.set(true);
          this.startUpdateStatusPolling();
          this.cdr.markForCheck();
        }
      },
      error: () => {},
    });
  }

  /**
   * Closes the live update modal.
   */
  closeUpdateModal(): void {
    this.isUpdateModalOpen.set(false);
    this.cdr.markForCheck();
  }

  /**
   * Reloads the application window after a successful update.
   */
  reloadApplication(): void {
    window.location.reload();
  }

  /**
   * Opens the confirmation modal to restore a snapshot.
   *
   * @param snapshot Snapshot to restore
   */
  openRestoreModal(snapshot: SystemSnapshot): void {
    this.targetRestoreSnapshot.set(snapshot);
    this.isRestoreModalOpen.set(true);
    this.cdr.markForCheck();
  }

  /**
   * Closes the restore modal.
   */
  closeRestoreModal(): void {
    this.isRestoreModalOpen.set(false);
    this.targetRestoreSnapshot.set(null);
    this.cdr.markForCheck();
  }

  /**
   * Confirms and triggers disaster recovery snapshot restoration.
   */
  confirmRestoreSnapshot(): void {
    const snapshot = this.targetRestoreSnapshot();
    if (!snapshot) return;

    this.isRestoringSnapshot.set(true);
    this.systemUpdateService.restoreSnapshot(snapshot.snapshotId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isRestoringSnapshot.set(false);
        this.closeRestoreModal();
        void this.showToast('Restauration du snapshot initiée.', 'success');
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isRestoringSnapshot.set(false);
        const apiError = err as { error?: { message?: string } } | null;
        void this.showToast(apiError?.error?.message || 'Échec de restauration du snapshot.', 'danger');
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Permanently removes a backup snapshot.
   *
   * @param snapshot Snapshot to delete
   */
  deleteSnapshot(snapshot: SystemSnapshot): void {
    this.isDeletingSnapshot.set(snapshot.snapshotId);
    this.systemUpdateService.deleteSnapshot(snapshot.snapshotId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isDeletingSnapshot.set(null);
        this.loadSnapshots();
        void this.showToast('Snapshot supprimé.', 'success');
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isDeletingSnapshot.set(null);
        const apiError = err as { error?: { message?: string } } | null;
        void this.showToast(apiError?.error?.message || 'Échec de suppression du snapshot.', 'danger');
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Formats byte values into human-readable string (MB / GB).
   *
   * @param bytes Number of bytes
   * @returns Formatted string
   */
  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 Mo';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return (mb / 1024).toFixed(2) + ' Go';
    }
    return mb.toFixed(1) + ' Mo';
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
