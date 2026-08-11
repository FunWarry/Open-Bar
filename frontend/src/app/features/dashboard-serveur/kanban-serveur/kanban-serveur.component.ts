import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  IonIcon, IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, banOutline, timeOutline, flameOutline, funnelOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { DashboardServeurService } from '../services/dashboard-serveur.service';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';
import { NotificationService } from '../../../core/services/notification.service';
import { Commande, CommandeStatut } from '../../../core/models/commande.model';
import { TableView } from '../models/table-view.model';
import { groupCommandeItems } from '../../../core/utils/order-item-grouper';

/** Represents a single kanban column with its status and ordered list of commands. */
interface Colonne {
  /** Backend status key for this column. */
  statut: CommandeStatut;
  /** Transloco i18n key for the column label. */
  labelKey: string;
  /** CSS status class suffix. */
  statusClass: string;
  /** Ionic color token for the badge. */
  color: string;
  /** Commands displayed in this column after applying the table filter. */
  commandes: Commande[];
}

@Component({
  selector: 'app-kanban-serveur',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    IonIcon, IonSpinner,
  ],
  templateUrl: './kanban-serveur.component.html',
  styleUrls: ['./kanban-serveur.component.scss'],
})
export class KanbanServeurComponent implements OnInit, OnDestroy {
  /** Kanban columns ordered by workflow step. */
  readonly colonnes: Colonne[] = [
    { statut: 'EN_ATTENTE',     labelKey: 'COMMANDES.STATUTS.EN_ATTENTE',    statusClass: 'waiting',     color: 'warning', commandes: [] },
    { statut: 'EN_PREPARATION', labelKey: 'COMMANDES.STATUTS.EN_PREPARATION', statusClass: 'inprogress',  color: 'primary', commandes: [] },
    { statut: 'PRET',           labelKey: 'COMMANDES.STATUTS.PRET',           statusClass: 'ready',       color: 'success', commandes: [] },
    { statut: 'LIVREE',         labelKey: 'COMMANDES.STATUTS.LIVREE',         statusClass: 'served',      color: 'medium',  commandes: [] },
  ];

  /** List of tables for the filter dropdown. */
  tables: TableView[] = [];

  /** Currently selected table ID for filtering (null = all tables). */
  filtreTableId: number | null = null;

  /** Whether data is being loaded from the API. */
  isLoading = false;

  private readonly allCommandes: Map<CommandeStatut, Commande[]> = new Map();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly service: DashboardServeurService,
    private readonly toastCtrl: ToastController,
    private readonly notificationService: NotificationService,
    private readonly transloco: TranslocoService,
  ) {
    addIcons({ checkmarkOutline, banOutline, timeOutline, flameOutline, funnelOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.charger();

    this.notificationService.onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        if (notif.type === 'commande' || notif.type === 'statut') {
          this.charger();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all orders grouped by status and the table list.
   * @param refreshEvent - Optional refresher event to complete after loading.
   */
  charger(refreshEvent?: any) {
    this.isLoading = true;
    forkJoin({
      enAttente: this.service.getCommandesParStatut('EN_ATTENTE'),
      enPrepa:   this.service.getCommandesParStatut('EN_PREPARATION'),
      pret:      this.service.getCommandesParStatut('PRET'),
      livree:    this.service.getCommandesParStatut('LIVREE'),
      tables:    this.service.getAllTables(),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) safeCompleteRefresher(refreshEvent);
        }),
      )
      .subscribe({
        next: ({ enAttente, enPrepa, pret, livree, tables }) => {
          this.allCommandes.set('EN_ATTENTE',    enAttente);
          this.allCommandes.set('EN_PREPARATION', enPrepa);
          this.allCommandes.set('PRET',          pret);
          this.allCommandes.set('LIVREE',        livree);
          this.tables = tables;
          this.appliquerFiltre();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('COMMANDES.MESSAGES.UPDATE_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  /**
   * Updates the table filter and refreshes column contents.
   * @param tableId - Table ID to filter by, or null for all tables.
   */
  onFiltreChange(tableId: number | null) {
    this.filtreTableId = tableId;
    this.appliquerFiltre();
  }

  /** Returns the total number of active (non-delivered) orders. */
  get totalActif(): number {
    return (this.allCommandes.get('EN_ATTENTE')?.length ?? 0)
      + (this.allCommandes.get('EN_PREPARATION')?.length ?? 0)
      + (this.allCommandes.get('PRET')?.length ?? 0);
  }

  private appliquerFiltre() {
    this.colonnes.forEach(col => {
      const all = this.allCommandes.get(col.statut) ?? [];
      col.commandes = this.filtreTableId
        ? all.filter(c => c.tableId === this.filtreTableId)
        : all;
    });
  }

  /**
   * Marks an order as delivered.
   * @param commandeId - ID of the order to mark delivered.
   */
  async marquerLivree(commandeId: number) {
    this.service.changerStatutCommande(commandeId, 'LIVREE')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.charger();
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('COMMANDES.MESSAGES.STATUS_UPDATED'),
            duration: 2000,
            color: 'success',
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('COMMANDES.MESSAGES.UPDATE_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  /**
   * Cancels an order.
   * @param commandeId - ID of the order to cancel.
   */
  async annuler(commandeId: number) {
    this.service.annulerCommande(commandeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.charger();
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('COMMANDES.MESSAGES.CANCELLED_SUCCESS'),
            duration: 2000,
            color: 'medium',
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('COMMANDES.MESSAGES.CANCELLED_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  /**
   * Returns the elapsed wait time in minutes for an occupied table.
   * @param cmd - The command to compute wait time for.
   */
  getWaitMinutes(cmd: Commande): number {
    if (!cmd.dateCommande) return 0;
    const ordered = new Date(cmd.dateCommande).getTime();
    const diff = Math.floor((Date.now() - ordered) / 60000);
    return Math.max(0, diff);
  }

  formatWaitTime(cmd: Commande): string {
    const min = this.getWaitMinutes(cmd);
    if (min >= 120) {
      const hours = Math.floor(min / 60);
      return `+${hours}h`;
    }
    return `${min} min`;
  }

  /** Whether a command has been waiting too long (> 20 min). */
  isLate(cmd: Commande): boolean {
    return this.getWaitMinutes(cmd) > 20;
  }

  onRefresh(event: any) { this.charger(event); }

  trackById(_: number, cmd: Commande): number { return cmd.id; }

  /**
   * Groups and returns the items of a command for display.
   * @param items - Raw command items array.
   */
  groupItems(items: any[]): any[] { return groupCommandeItems(items ?? []); }

  /**
   * Returns the display name of a table by its ID.
   * @param tableId - ID of the table to look up.
   */
  getTableNom(tableId: number | null): string {
    if (!tableId) return '';
    return this.tables.find(t => t.id === tableId)?.nom ?? `#${tableId}`;
  }
}
