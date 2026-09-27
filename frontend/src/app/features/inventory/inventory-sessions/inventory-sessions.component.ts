import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
  clipboardOutline,
  addOutline,
  searchOutline,
  calendarOutline,
  personOutline,
  locationOutline,
  layersOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  downloadOutline,
  documentTextOutline,
  closeOutline,
  refreshOutline,
  trendingUpOutline,
  trendingDownOutline,
  eyeOutline,
  createOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { InventoryAuditService } from '../../../core/services/inventory-audit.service';
import {
  InventoryAuditSession,
  InventoryAuditStatus,
  CreateInventoryAuditSessionRequest,
} from '../../../core/models/inventory-audit.model';
import { INGREDIENT_CATEGORY_CONFIG } from '../../../core/models/ingredient.model';
import { SearchBarComponent } from '../../../core/components/ui/search-bar/search-bar.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { EmptyStateComponent } from '../../../core/components/ui/empty-state/empty-state.component';
import { StatCardComponent } from '../../../core/components/ui/stat-card/stat-card.component';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

/**
 * Filter status types for inventory audit session listing.
 */
export type AuditStatusFilter = 'ALL' | 'DRAFT' | 'IN_PROGRESS' | 'FINALIZED' | 'CANCELLED';

/**
 * Overview component listing physical inventory audit sessions.
 * Provides real-time filtering, creation modal, financial shrinkage KPI summaries,
 * and direct PDF/CSV reporting actions.
 */
@Component({
  selector: 'app-inventory-sessions',
  templateUrl: './inventory-sessions.component.html',
  styleUrls: ['./inventory-sessions.component.scss'],
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
    EmptyStateComponent,
    StatCardComponent,
  ],
})
export class InventorySessionsComponent implements OnInit, OnDestroy {
  private readonly auditService = inject(InventoryAuditService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  // State signals
  readonly sessions = signal<InventoryAuditSession[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isCreating = signal<boolean>(false);
  readonly activeFilter = signal<AuditStatusFilter>('ALL');
  readonly searchQuery = signal<string>('');
  readonly isCreateModalOpen = signal<boolean>(false);

  // Creation form
  createForm!: FormGroup;

  // Storage location options
  readonly storageLocationOptions = [
    { value: '', labelKey: 'INVENTORY.FIELD_LOCATION_ALL' },
    { value: 'Main Bar', labelKey: 'INVENTORY.LOCATION_MAIN_BAR' },
    { value: 'Arrière-bar', labelKey: 'INVENTORY.LOCATION_BACK_BAR' },
    { value: 'Cave à vins & Spiritueux', labelKey: 'INVENTORY.LOCATION_CELLAR' },
    { value: 'Chambre froide fûts', labelKey: 'INVENTORY.LOCATION_KEG_ROOM' },
  ];

  // Category filter options
  readonly categoryOptions = [
    { value: '', labelKey: 'INVENTORY.FIELD_CATEGORY_ALL' },
    ...INGREDIENT_CATEGORY_CONFIG.map(c => ({ value: c.key, labelKey: c.labelKey })),
  ];

  // Filtered sessions
  readonly filteredSessions = computed(() => {
    const list = this.sessions();
    const filter = this.activeFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter(s => {
      const matchesFilter = filter === 'ALL' || s.status === filter;
      if (!matchesFilter) return false;

      if (!query) return true;
      const titleMatch = s.title?.toLowerCase().includes(query);
      const refMatch = s.referenceCode?.toLowerCase().includes(query);
      const notesMatch = s.notes?.toLowerCase().includes(query);
      return Boolean(titleMatch || refMatch || notesMatch);
    });
  });

  // KPI Metrics
  readonly totalAuditsCount = computed(() => this.sessions().length);
  readonly activeSessionsCount = computed(() =>
    this.sessions().filter(s => s.status === 'IN_PROGRESS' || s.status === 'DRAFT').length
  );
  readonly totalNetVarianceHt = computed(() => {
    return this.sessions()
      .filter(s => s.status === 'FINALIZED')
      .reduce((sum, s) => sum + (s.totalVarianceValueHt ?? 0), 0);
  });
  readonly totalShrinkageLossHt = computed(() => {
    return this.sessions()
      .filter(s => s.status === 'FINALIZED')
      .reduce((sum, s) => sum + (s.totalVarianceValueHt < 0 ? Math.abs(s.totalVarianceValueHt) : 0), 0);
  });

  constructor() {
    addIcons({
      clipboardOutline,
      addOutline,
      searchOutline,
      calendarOutline,
      personOutline,
      locationOutline,
      layersOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      downloadOutline,
      documentTextOutline,
      closeOutline,
      refreshOutline,
      trendingUpOutline,
      trendingDownOutline,
      eyeOutline,
      createOutline,
      chevronForwardOutline,
    });
    this.initForm();
  }

  ngOnInit(): void {
    this.loadSessions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.createForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      storageLocationScope: [''],
      categoryFilter: [''],
      notes: ['', [Validators.maxLength(1000)]],
    });
  }

  /**
   * Loads all inventory audit sessions from backend.
   */
  loadSessions(event?: CustomEvent): void {
    this.isLoading.set(true);
    this.auditService
      .getAllSessions()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading.set(false);
          safeCompleteRefresher(event);
        })
      )
      .subscribe({
        next: (data: InventoryAuditSession[]) => {
          this.sessions.set(data);
        },
        error: async (err: { error?: { message?: string } }) => {
          const toast = await this.toastCtrl.create({
            message: err.error?.message || 'Erreur lors du chargement des inventaires.',
            duration: 3500,
            color: 'danger',
            position: 'top',
          });
          await toast.present();
        },
      });
  }

  setFilter(filter: AuditStatusFilter): void {
    this.activeFilter.set(filter);
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  openCreateModal(): void {
    this.createForm.reset({
      title: `Inventaire ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
      storageLocationScope: '',
      categoryFilter: '',
      notes: '',
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  /**
   * Submits new audit session creation.
   */
  submitCreate(): void {
    if (this.createForm.invalid || this.isCreating()) return;

    this.isCreating.set(true);
    const formVal = this.createForm.value;
    const request: CreateInventoryAuditSessionRequest = {
      title: formVal.title.trim(),
      storageLocationScope: formVal.storageLocationScope || undefined,
      categoryScope: formVal.categoryFilter || undefined,
      notes: formVal.notes?.trim() || undefined,
    };

    this.auditService
      .createSession(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isCreating.set(false))
      )
      .subscribe({
        next: (created: InventoryAuditSession) => {
          this.closeCreateModal();
          this.router.navigate(['/inventory', created.id]);
        },
        error: async (err: { error?: { message?: string } }) => {
          const toast = await this.toastCtrl.create({
            message: err.error?.message || "Erreur lors de l'initialisation de l'inventaire.",
            duration: 4000,
            color: 'danger',
            position: 'top',
          });
          await toast.present();
        },
      });
  }

  /**
   * Navigates to the counting sheet or report of a session.
   */
  openSession(session: InventoryAuditSession): void {
    this.router.navigate(['/inventory', session.id]);
  }

  /**
   * Exports PDF report for finalized session.
   */
  exportPdf(session: InventoryAuditSession, event: MouseEvent): void {
    event.stopPropagation();
    this.auditService.downloadPdf(session.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Inventaire_${session.referenceCode}.pdf`;
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

  /**
   * Exports RFC-4180 CSV matrix for session.
   */
  exportCsv(session: InventoryAuditSession, event: MouseEvent): void {
    event.stopPropagation();
    this.auditService.downloadCsv(session.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Inventaire_${session.referenceCode}.csv`;
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

  /**
   * Computes progress percentage of counted items.
   */
  getProgress(session: InventoryAuditSession): number {
    if (!session.totalItemsCount || session.totalItemsCount === 0) return 0;
    return Math.min(1, (session.countedItemsCount ?? 0) / session.totalItemsCount);
  }

  getStatusBadgeColor(status: InventoryAuditStatus): string {
    switch (status) {
      case 'FINALIZED':
        return 'success';
      case 'IN_PROGRESS':
        return 'primary';
      case 'DRAFT':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'medium';
    }
  }
}
