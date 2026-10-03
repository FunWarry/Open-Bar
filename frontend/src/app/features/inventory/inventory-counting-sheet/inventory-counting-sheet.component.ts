import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  IonContent,
  IonBadge,
  IonIcon,
  IonProgressBar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonModal,
  IonGrid,
  IonRow,
  IonCol,
  ToastController,
  AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  clipboardOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  downloadOutline,
  documentTextOutline,
  closeOutline,
  refreshOutline,
  trendingUpOutline,
  trendingDownOutline,
  searchOutline,
  filterOutline,
  saveOutline,
  wineOutline,
  beerOutline,
  sparklesOutline,
  warningOutline,
  lockClosedOutline,
  trashOutline,
} from 'ionicons/icons';
import { AppSettingsService } from '../../../core/services/app-settings.service';
import { InventoryAuditService } from '../../../core/services/inventory-audit.service';
import {
  InventoryAuditSession,
  InventoryAuditItem,
  InventoryAuditLocationCount,
  InventoryVarianceSummary,
  UpdateInventoryAuditItemCountRequest,
} from '../../../core/models/inventory-audit.model';
import { SearchBarComponent } from '../../../core/components/ui/search-bar/search-bar.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { StatCardComponent } from '../../../core/components/ui/stat-card/stat-card.component';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

export type CountingSheetTab = 'counting' | 'report';

interface ItemCountState {
  fullContainers: number;
  partialQuantity: number;
  notes: string;
  isDirty: boolean;
  isSaving: boolean;
}

/**
 * Detailed counting sheet and variance reporting component for a specific audit session.
 * Features hybrid bottle gauging widget, multi-location scoping, real-time variance calculation,
 * shrinkage loss matrix, and stock adjustment finalization.
 */
@Component({
  selector: 'app-inventory-counting-sheet',
  templateUrl: './inventory-counting-sheet.component.html',
  styleUrls: ['./inventory-counting-sheet.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslocoPipe,
    IonContent,
    IonBadge,
    IonIcon,
    IonProgressBar,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonModal,
    IonGrid,
    IonRow,
    IonCol,
    SearchBarComponent,
    ActionButtonComponent,
    StatCardComponent,
  ],
})
export class InventoryCountingSheetComponent implements OnInit, OnDestroy {
  private readonly auditService = inject(InventoryAuditService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  sessionId!: number;

  // State signals
  readonly session = signal<InventoryAuditSession | null>(null);
  readonly summary = signal<InventoryVarianceSummary | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isFinalizing = signal<boolean>(false);
  readonly activeTab = signal<CountingSheetTab>('counting');
  readonly selectedLocation = signal<string>('Bar Principal');
  readonly searchQuery = signal<string>('');
  readonly showDiscrepanciesOnly = signal<boolean>(false);
  readonly isFinalizeModalOpen = signal<boolean>(false);

  // Storage location tabs
  readonly storageLocations = computed(() => {
    return this.appSettingsService.getStorageLocations().map(loc => ({
      key: loc,
      label: loc,
    }));
  });

  // Quick bottle gauging fractions
  readonly bottleFractions = [
    { fraction: 0, labelKey: 'INVENTORY.FRACTION_EMPTY', percentage: '0%' },
    { fraction: 0.25, labelKey: 'INVENTORY.FRACTION_QUARTER', percentage: '25%' },
    { fraction: 0.5, labelKey: 'INVENTORY.FRACTION_HALF', percentage: '50%' },
    { fraction: 0.75, labelKey: 'INVENTORY.FRACTION_THREE_QUARTER', percentage: '75%' },
    { fraction: 1, labelKey: 'INVENTORY.FRACTION_FULL', percentage: '100%' },
  ];

  // In-memory edit state for items per location: itemId -> ItemCountState
  itemStates = new Map<number, ItemCountState>();

  // Filtered items list for the counting sheet
  readonly filteredItems = computed(() => {
    const s = this.session();
    if (!s?.items) return [];

    const query = this.searchQuery().trim().toLowerCase();
    const discrepanciesOnly = this.showDiscrepanciesOnly();

    return s.items.filter((item: InventoryAuditItem) => {
      if (discrepanciesOnly && (item.varianceQuantity === 0 || item.varianceQuantity === null)) {
        return false;
      }
      if (!query) return true;

      const nomMatch = item.ingredientNom?.toLowerCase().includes(query);
      const catMatch = item.ingredientCategory?.toLowerCase().includes(query);
      return Boolean(nomMatch || catMatch);
    });
  });

  // Discrepancy items for variance report
  readonly reportItems = computed(() => {
    const s = this.session();
    if (!s?.items) return [];

    const discrepanciesOnly = this.showDiscrepanciesOnly();
    const query = this.searchQuery().trim().toLowerCase();

    return s.items.filter((item: InventoryAuditItem) => {
      if (discrepanciesOnly && (item.varianceQuantity === 0 || item.varianceQuantity === null)) {
        return false;
      }
      if (!query) return true;
      const nomMatch = item.ingredientNom?.toLowerCase().includes(query);
      const catMatch = item.ingredientCategory?.toLowerCase().includes(query);
      return Boolean(nomMatch || catMatch);
    });
  });

  constructor() {
    addIcons({
      arrowBackOutline,
      clipboardOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      downloadOutline,
      documentTextOutline,
      closeOutline,
      refreshOutline,
      trendingUpOutline,
      trendingDownOutline,
      searchOutline,
      filterOutline,
      saveOutline,
      wineOutline,
      beerOutline,
      sparklesOutline,
      warningOutline,
      lockClosedOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || Number.isNaN(Number(idParam))) {
      void this.router.navigate(['/inventory']);
      return;
    }
    this.sessionId = Number(idParam);
    this.loadSessionData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads session details and financial variance summary.
   */
  loadSessionData(event?: CustomEvent): void {
    this.isLoading.set(true);
    this.auditService
      .getSessionById(this.sessionId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading.set(false);
          safeCompleteRefresher(event);
        })
      )
      .subscribe({
        next: (session: InventoryAuditSession) => {
          this.session.set(session);
          if (session.storageLocationScope && session.storageLocationScope !== 'ALL') {
            this.selectedLocation.set(session.storageLocationScope);
          } else if (!this.storageLocations().some(l => l.key === this.selectedLocation())) {
            this.selectedLocation.set(this.storageLocations()[0]?.key || 'Bar Principal');
          }
          this.syncItemStates(session);
          if (session.status === 'FINALIZED') {
            this.activeTab.set('report');
          }
          this.loadSummary();
        },
        error: async (err: { error?: { message?: string } }) => {
          const toast = await this.toastCtrl.create({
            message: err.error?.message || "Erreur lors du chargement de l'inventaire.",
            duration: 3500,
            color: 'danger',
            position: 'top',
          });
          await toast.present();
          await this.router.navigate(['/inventory']);
        },
      });
  }

  private loadSummary(): void {
    this.auditService
      .getVarianceSummary(this.sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sum: InventoryVarianceSummary) => this.summary.set(sum),
        error: () => {
          // Non-blocking fallback
        },
      });
  }

  /**
   * Synchronizes local editing state with session location counts.
   */
  private syncItemStates(session: InventoryAuditSession): void {
    const currentLoc = this.selectedLocation();
    this.itemStates.clear();

    for (const item of (session.items ?? [])) {
      const locCount = item.locationCounts?.find((lc: InventoryAuditLocationCount) => lc.storageLocation === currentLoc);
      this.itemStates.set(item.id, {
        fullContainers: locCount?.fullContainersCount ?? 0,
        partialQuantity: locCount?.partialQuantity ?? 0,
        notes: locCount?.notes ?? '',
        isDirty: false,
        isSaving: false,
      });
    }
  }

  selectTab(tab: CountingSheetTab): void {
    this.activeTab.set(tab);
  }

  selectLocation(loc: string): void {
    this.selectedLocation.set(loc);
    const s = this.session();
    if (s) {
      this.syncItemStates(s);
    }
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  toggleDiscrepanciesOnly(): void {
    this.showDiscrepanciesOnly.update(v => !v);
  }

  goBack(): void {
    void this.router.navigate(['/inventory']);
  }

  getItemState(itemId: number): ItemCountState {
    let state = this.itemStates.get(itemId);
    if (!state) {
      state = {
        fullContainers: 0,
        partialQuantity: 0,
        notes: '',
        isDirty: false,
        isSaving: false,
      };
      this.itemStates.set(itemId, state);
    }
    return state;
  }

  updateFullContainers(itemId: number, value: number): void {
    const state = this.getItemState(itemId);
    state.fullContainers = Math.max(0, value);
    state.isDirty = true;
  }

  updatePartialQuantity(itemId: number, value: number): void {
    const state = this.getItemState(itemId);
    state.partialQuantity = Math.max(0, value);
    state.isDirty = true;
  }

  applyFraction(item: InventoryAuditItem, fraction: number): void {
    const state = this.getItemState(item.id);
    const packagingCapacity = item.packagingCapacity && item.packagingCapacity > 0 ? item.packagingCapacity : 1;
    state.partialQuantity = Math.round(fraction * packagingCapacity * 1000) / 1000;
    state.isDirty = true;
    this.saveCount(item);
  }

  /**
   * Computes total counted physical stock for this item in current location.
   */
  computeItemLocationCount(item: InventoryAuditItem): number {
    const state = this.getItemState(item.id);
    const capacity = item.packagingCapacity && item.packagingCapacity > 0 ? item.packagingCapacity : 1;
    return state.fullContainers * capacity + state.partialQuantity;
  }

  /**
   * Saves count for a single audit item in the active storage location.
   */
  saveCount(item: InventoryAuditItem): void {
    const s = this.session();
    if (!s || s.status === 'FINALIZED' || s.status === 'CANCELLED') return;

    const state = this.getItemState(item.id);
    state.isSaving = true;

    const req: UpdateInventoryAuditItemCountRequest = {
      storageLocation: this.selectedLocation(),
      fullContainersCount: state.fullContainers,
      partialQuantity: state.partialQuantity,
      notes: state.notes || undefined,
    };

    this.auditService
      .updateItemCount(this.sessionId, item.id, req)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          state.isSaving = false;
        })
      )
      .subscribe({
        next: (updatedItem: InventoryAuditItem) => {
          state.isDirty = false;
          // Update item in local session
          if (s.items) {
            const index = s.items.findIndex((i: InventoryAuditItem) => i.id === item.id);
            if (index !== -1) {
              s.items[index] = updatedItem;
              this.session.set({ ...s });
            }
          }
          this.loadSummary();
        },
        error: async (err: { error?: { message?: string } }) => {
          const toast = await this.toastCtrl.create({
            message: err.error?.message || "Erreur lors de l'enregistrement du comptage.",
            duration: 3000,
            color: 'danger',
            position: 'top',
          });
          await toast.present();
        },
      });
  }

  openFinalizeModal(): void {
    this.isFinalizeModalOpen.set(true);
  }

  closeFinalizeModal(): void {
    this.isFinalizeModalOpen.set(false);
  }

  /**
   * Confirms audit finalization, reconciles stock balances and creates compensating movements.
   */
  confirmFinalize(): void {
    this.isFinalizing.set(true);
    this.auditService
      .finalizeSession(this.sessionId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isFinalizing.set(false);
          this.closeFinalizeModal();
        })
      )
      .subscribe({
        next: async (finalized: InventoryAuditSession) => {
          this.session.set(finalized);
          this.activeTab.set('report');
          this.loadSummary();

          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('INVENTORY.FINALIZE_SUCCESS'),
            duration: 4000,
            color: 'success',
            position: 'top',
          });
          await toast.present();
        },
        error: async (err: { error?: { message?: string } }) => {
          const toast = await this.toastCtrl.create({
            message: err.error?.message || "Erreur lors de la clôture de l'inventaire.",
            duration: 4000,
            color: 'danger',
            position: 'top',
          });
          await toast.present();
        },
      });
  }

  async cancelAudit(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.transloco.translate('INVENTORY.CANCEL_CONFIRM_TITLE'),
      message: this.transloco.translate('INVENTORY.CANCEL_CONFIRM_MSG'),
      buttons: [
        { text: this.transloco.translate('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.transloco.translate('INVENTORY.BTN_CANCEL_AUDIT'),
          role: 'destructive',
          handler: () => {
            this.auditService.cancelSession(this.sessionId).subscribe({
              next: async (cancelled: InventoryAuditSession) => {
                this.session.set(cancelled);
                const toast = await this.toastCtrl.create({
                  message: this.transloco.translate('INVENTORY.CANCEL_SUCCESS'),
                  duration: 3000,
                  color: 'warning',
                  position: 'top',
                });
                await toast.present();
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  exportPdf(): void {
    this.auditService.downloadPdf(this.sessionId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Inventaire_${this.session()?.referenceCode || this.sessionId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Erreur lors de la génération du PDF.',
          duration: 3000,
          color: 'danger',
          position: 'top',
        });
        await toast.present();
      },
    });
  }

  exportCsv(): void {
    this.auditService.downloadCsv(this.sessionId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Inventaire_${this.session()?.referenceCode || this.sessionId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: "Erreur lors de l'export CSV.",
          duration: 3000,
          color: 'danger',
          position: 'top',
        });
        await toast.present();
      },
    });
  }

  getProgress(): number {
    const s = this.session();
    if (!s?.totalItemsCount || s.totalItemsCount === 0) return 0;
    return Math.min(1, (s.countedItemsCount ?? 0) / s.totalItemsCount);
  }
}
