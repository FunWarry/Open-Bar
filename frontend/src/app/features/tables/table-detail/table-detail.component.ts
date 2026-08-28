import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import { takeUntil, finalize, catchError } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonBadge, IonIcon, IonSpinner,
  ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack, create, eye, trashOutline, closeOutline,
  restaurantOutline, peopleOutline, locationOutline,
  timeOutline, receiptOutline, layersOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import { AsyncPipe, DatePipe, CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { TableService } from '../../../core/services/table.service';
import { CommandeService } from '../../../core/services/commande.service';
import { TableBar } from '../../../core/models/table.model';
import { Commande } from '../../../core/models/commande.model';
import { ConfirmDeleteModalComponent } from '../../../core/components/ui/confirm-delete-modal/confirm-delete-modal.component';

/**
 * Modal component for viewing detailed information about a table in OpenBar,
 * including table metadata, live occupancy state, active pending orders,
 * and fast actions (Edit, Delete with unified confirmation modal).
 */
@Component({
  selector: 'app-table-detail',
  templateUrl: './table-detail.component.html',
  styleUrls: ['./table-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonBadge, IonIcon, IonSpinner,
    AsyncPipe, DatePipe, AppCurrencyPipe,
    TranslocoPipe
  ]
})
export class TableDetailComponent implements OnInit, OnDestroy {
  /** Optional table identifier passed via modal componentProps. */
  @Input() tableId?: number;

  /** Optional pre-loaded table object passed via modal componentProps. */
  @Input() table: TableBar | null = null;

  commandes: Commande[] = [];
  isLoading = false;
  isDeleting = false;
  isAdmin$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly tableService: TableService,
    private readonly commandeService: CommandeService,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
    private readonly transloco: TranslocoService
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({
      arrowBack, create, eye, trashOutline, closeOutline,
      restaurantOutline, peopleOutline, locationOutline,
      timeOutline, receiptOutline, layersOutline, checkmarkCircleOutline
    });
  }

  ngOnInit(): void {
    const idParam = this.route?.snapshot?.paramMap?.get('id');
    const targetId = this.tableId ?? (idParam ? +idParam : (this.table?.id ?? null));

    if (!targetId) return;

    this.loadTableData(targetId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTableData(id: number): void {
    this.isLoading = true;
    forkJoin({
      table: this.table ? of(this.table) : this.tableService.getById(id),
      commandes: this.commandeService.getByTable(id).pipe(
        catchError(() => of([] as Commande[]))
      )
    })
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ table, commandes }) => {
          this.table = table;
          this.commandes = (commandes || []).filter(
            c => c.statut !== 'REGLEE' && c.statut !== 'ANNULEE'
          );
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: String(this.transloco.translate('ERRORS.SERVER') || 'Erreur lors du chargement'),
            duration: 3000,
            color: 'danger'
          });
          toast.present();
          this.onClose();
        }
      });
  }

  getStatutColor(statut: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'warning',
      EN_PREPARATION: 'tertiary',
      PRET: 'success',
      LIVREE: 'medium',
      ANNULEE: 'danger'
    };
    return map[statut] ?? 'primary';
  }

  /** Closes the modal or navigates back if routed. */
  async onClose(): Promise<void> {
    try {
      const topModal = await this.modalCtrl.getTop();
      if (topModal) {
        await this.modalCtrl.dismiss();
        return;
      }
    } catch {
      // Fallback to router
    }
    this.router.navigate(['/tables']);
  }

  /** Dismisses modal with an edit signal to trigger the edit modal. */
  async onEdit(): Promise<void> {
    try {
      const topModal = await this.modalCtrl.getTop();
      if (topModal) {
        await this.modalCtrl.dismiss({ action: 'edit', table: this.table });
        return;
      }
    } catch {
      // Fallback
    }
    this.router.navigate(['/tables', this.table?.id, 'edit']);
  }

  /**
   * Opens the unified ConfirmDeleteModalComponent with table context.
   */
  async onDelete(): Promise<void> {
    if (!this.table) return;

    const tableNumero = this.table.numero;
    const tableId = this.table.id;

    const modal = await this.modalCtrl.create({
      component: ConfirmDeleteModalComponent,
      cssClass: 'confirm-delete-modal-dialog',
      componentProps: {
        title: this.transloco.translate('TABLES.DELETE_CONFIRM_TITLE', { number: tableNumero }),
        itemName: `Table ${tableNumero}`,
        warningMessage: this.transloco.translate('TABLES.DELETE_CONFIRM_MSG', { number: tableNumero }),
        metaTags: [
          { icon: 'restaurant-outline', text: `Table ${tableNumero}` },
          { icon: 'location-outline', text: this.table.zone || '-' },
          { icon: 'people-outline', text: `${this.table.capacite} places` }
        ],
        detailsSummary: [
          { label: this.transloco.translate('TABLES.NUMBER'), value: `#${tableNumero}` },
          { label: this.transloco.translate('TABLES.ZONE'), value: this.table.zone || '-' },
          { label: this.transloco.translate('TABLES.CAPACITY'), value: `${this.table.capacite} personnes` },
          {
            label: this.transloco.translate('TABLES.STATUS'),
            value: this.table.occupee
              ? this.transloco.translate('TABLES.OCCUPIED')
              : this.transloco.translate('TABLES.FREE')
          }
        ],
        cannotDeleteReason: this.commandes.length > 0
          ? this.transloco.translate('TABLES.DELETE_ACTIVE_ORDERS_ERROR')
          : null,
        confirmBtnText: this.transloco.translate('TABLES.DELETE_BTN')
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.confirmed) {
      this.executeDeletion(tableId);
    }
  }

  private executeDeletion(tableId: number): void {
    this.isDeleting = true;
    this.tableService.delete(tableId)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('TABLES.DELETE_SUCCESS'),
            duration: 2500,
            color: 'success'
          });
          toast.present();
          try {
            const topModal = await this.modalCtrl.getTop();
            if (topModal) {
              await this.modalCtrl.dismiss({ action: 'deleted', tableId });
              return;
            }
          } catch {
            // Fallback
          }
          this.router.navigate(['/tables']);
        },
        error: async (err) => {
          const errMsg = err?.error?.message || this.transloco.translate('TABLES.DELETE_ERROR');
          const toast = await this.toastCtrl.create({
            message: errMsg,
            duration: 3500,
            color: 'danger'
          });
          toast.present();
        }
      });
  }

  onViewCommande(c: Commande): void {
    this.onClose().then(() => {
      this.router.navigate(['/commandes', c.id]);
    });
  }

  trackById(_: number, item: any): any {
    return item.id ?? _;
  }
}
