import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, LowerCasePipe } from '@angular/common';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonRefresher, IonRefresherContent,
  IonSelect, IonSelectOption,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonBadge, IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, banOutline, refreshOutline } from 'ionicons/icons';
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
  /** Ionic color token for the badge. */
  color: string;
  /** Commands displayed in this column. */
  commandes: Commande[];
}

@Component({
  selector: 'app-kanban-serveur',
  standalone: true,
  imports: [
    CommonModule,
    LowerCasePipe,
    TranslocoModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonContent, IonRefresher, IonRefresherContent,
    IonSelect, IonSelectOption,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonBadge, IonSpinner,
  ],
  templateUrl: './kanban-serveur.component.html',
  styleUrls: ['./kanban-serveur.component.scss'],
})
export class KanbanServeurComponent implements OnInit, OnDestroy {
  /** Kanban columns ordered by workflow step. */
  readonly colonnes: Colonne[] = [
    { statut: 'EN_ATTENTE',     labelKey: 'COMMANDES.STATUTS.EN_ATTENTE',    color: 'warning', commandes: [] },
    { statut: 'EN_PREPARATION', labelKey: 'COMMANDES.STATUTS.EN_PREPARATION', color: 'primary', commandes: [] },
    { statut: 'PRET',           labelKey: 'COMMANDES.STATUTS.PRET',           color: 'success', commandes: [] },
    { statut: 'LIVREE',         labelKey: 'COMMANDES.STATUTS.LIVREE',         color: 'medium',  commandes: [] },
  ];

  tables: TableView[] = [];
  filtreTableId: number | null = null;
  isLoading = false;

  private readonly allCommandes: Map<CommandeStatut, Commande[]> = new Map();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly service: DashboardServeurService,
    private readonly toastCtrl: ToastController,
    private readonly notificationService: NotificationService,
    private readonly transloco: TranslocoService,
  ) {
    addIcons({ checkmarkOutline, banOutline, refreshOutline });
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

  charger(refreshEvent?: any) {
    this.isLoading = true;
    forkJoin({
      enAttente:    this.service.getCommandesParStatut('EN_ATTENTE'),
      enPrepa:      this.service.getCommandesParStatut('EN_PREPARATION'),
      pret:         this.service.getCommandesParStatut('PRET'),
      livree:       this.service.getCommandesParStatut('LIVREE'),
      tables:       this.service.getAllTables(),
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

  onFiltreChange(tableId: number | null) {
    this.filtreTableId = tableId;
    this.appliquerFiltre();
  }

  private appliquerFiltre() {
    this.colonnes.forEach(col => {
      const all = this.allCommandes.get(col.statut) ?? [];
      col.commandes = this.filtreTableId
        ? all.filter(c => c.tableId === this.filtreTableId)
        : all;
    });
  }

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

  onRefresh(event: any) { this.charger(event); }
  trackById(_: number, cmd: Commande): number { return cmd.id; }
  groupItems(items: any[]): any[] { return groupCommandeItems(items); }
}
