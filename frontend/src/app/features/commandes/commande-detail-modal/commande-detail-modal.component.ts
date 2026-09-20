import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  ModalController, AlertController, ToastController,
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonIcon, IonSpinner, IonFooter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline, banOutline, playOutline, checkmarkCircleOutline,
  checkmarkDoneOutline, timeOutline, personOutline,
  statsChartOutline, receiptOutline, gridOutline,
  cashOutline, chatbubbleEllipsesOutline, flashOutline,
  restaurantOutline, wineOutline, cardOutline, beerOutline,
  pencilOutline,
} from 'ionicons/icons';
import { DatePipe } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande, CommandeItem, CommandeStatut } from '../../../core/models/commande.model';
import { CancelOrderModalComponent } from '../../../core/components/ui/cancel-order-modal/cancel-order-modal.component';
import { groupCommandeItems } from '../../../core/utils/order-item-grouper';
import { EditCommandeModalComponent } from '../../dashboard-serveur/components/edit-commande-modal/edit-commande-modal.component';
import { TableDetailModalComponent } from '../../dashboard-serveur/components/table-detail-modal/table-detail-modal.component';
import { TableView } from '../../dashboard-serveur/models/table-view.model';
import { fastModalEnterAnimation, fastModalLeaveAnimation } from '../../../core/utils/modal-animation.utils';
import { StatusBadgeComponent } from '../../../core/components/ui/status-badge/status-badge.component';

/**
 * Modal component rendering full order details, metrics, items breakdown with unit prices,
 * and direct action controls (advancing status, cancellation with confirmation popup).
 */
@Component({
  selector: 'app-commande-detail-modal',
  templateUrl: './commande-detail-modal.component.html',
  styleUrls: ['./commande-detail-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonIcon, IonSpinner, IonFooter,
    DatePipe,
    TranslocoPipe,
    AppCurrencyPipe,
    StatusBadgeComponent,
  ],
})
export class CommandeDetailModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) commandeId!: number;
  @Input() commandeInput?: Commande;

  commande: Commande | null = null;
  isLoading = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
    private readonly commandeService: CommandeService,
    private readonly translocoService: TranslocoService,
  ) {
    addIcons({
      closeOutline, banOutline, playOutline, checkmarkCircleOutline,
      checkmarkDoneOutline, timeOutline, personOutline, gridOutline,
      statsChartOutline, receiptOutline, cashOutline, chatbubbleEllipsesOutline,
      flashOutline, restaurantOutline, wineOutline, cardOutline, beerOutline,
      pencilOutline,
    });
  }

  ngOnInit(): void {
    if (this.commandeInput) {
      this.commande = this.commandeInput;
    } else if (this.commandeId) {
      this.charger();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    this.isLoading = true;
    this.commandeService.getById(this.commandeId)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoading = false)))
      .subscribe({
        next: commande => (this.commande = commande),
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Commande introuvable',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
          this.dismiss();
        },
      });
  }

  /**
   * Groups identical items (same cocktail name, variante, and notes) and sums quantities.
   */
  get groupedItems(): CommandeItem[] {
    return groupCommandeItems(this.commande?.items) as CommandeItem[];
  }

  /**
   * Calculates the total number of article units across all items in the order.
   */
  get totalArticlesCount(): number {
    if (!this.commande?.items || this.commande.items.length === 0) return 0;
    return this.commande.items.reduce((sum, item) => sum + (item.quantite || 1), 0);
  }

  getItemLineTotal(item: CommandeItem): number {
    return (item.prixUnitaire || 0) * (item.quantite || 1);
  }

  getTotalCommande(cmd: Commande | null): number {
    if (!cmd) return 0;
    if (cmd.total && cmd.total > 0) return cmd.total;
    if (cmd.items && cmd.items.length > 0) {
      return cmd.items.reduce((sum, item) => sum + ((item.prixUnitaire || 0) * (item.quantite || 1)), 0);
    }
    return 0;
  }

  onToggleUrgent(): void {
    if (!this.commande) return;
    this.commandeService.toggleUrgent(this.commande.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (updated) => {
          this.commande = updated;
          const msgKey = updated.prioritaire ? 'COMMANDES.MESSAGES.MARKED_URGENT' : 'COMMANDES.MESSAGES.UNMARKED_URGENT';
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate(msgKey),
            duration: 2500,
            color: updated.prioritaire ? 'warning' : 'medium',
          });
          await toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate('COMMON.ERROR'),
            duration: 2500,
            color: 'danger',
          });
          await toast.present();
        }
      });
  }

  peutAnnuler(): boolean {
    return !!this.commande && !['LIVREE', 'REGLEE', 'ANNULEE'].includes(this.commande.statut);
  }

  /**
   * Whether the active order can be edited (only in pending or preparing states).
   */
  peutModifier(): boolean {
    return !!this.commande && (this.commande.statut === 'EN_ATTENTE' || this.commande.statut === 'EN_PREPARATION');
  }

  /**
   * Whether the order is linked to a physical table.
   */
  get hasTable(): boolean {
    return !!this.commande && (this.commande.tableId != null || this.commande.tableNumero != null);
  }

  /**
   * Opens the order line item editor modal.
   */
  async onModifierCommande(): Promise<void> {
    if (!this.commande) return;
    const modal = await this.modalCtrl.create({
      component: EditCommandeModalComponent,
      componentProps: {
        commande: this.commande,
        tableNumero: this.commande.tableNumero ?? this.commande.tableId ?? 0,
      },
      cssClass: 'edit-commande-modal-container',
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.updated) {
      this.charger();
    }
  }

  /**
   * Opens the full table detail modal when an order is tied to a physical table.
   */
  async onVoirTable(): Promise<void> {
    if (!this.commande || !this.hasTable) return;
    const tableId = this.commande.tableId ?? this.commande.tableNumero ?? 0;
    const table: TableView = {
      id: tableId,
      nom: this.commande.tableNumero ? `Table ${this.commande.tableNumero}` : `Table ${tableId}`,
      zone: '',
      capacite: 4,
      occupee: true,
      serveurNom: this.commande.serveurUsername,
      commandesActives: [],
    };
    const modal = await this.modalCtrl.create({
      component: TableDetailModalComponent,
      componentProps: { table },
      cssClass: 'table-detail-modal-container',
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });
    await modal.present();
  }

  onUpdateStatus(targetStatut: CommandeStatut): void {
    if (!this.commande) return;
    this.commandeService.changerStatut(this.commande.id, targetStatut)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async updated => {
          this.commande = updated;
          const toast = await this.toastCtrl.create({
            message: 'Statut de la commande mis à jour',
            duration: 2000,
            color: 'success',
          });
          toast.present();
          this.dismiss({ role: 'statusUpdated', commande: updated, targetStatut });
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du changement de statut',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  async onAnnuler(): Promise<void> {
    if (!this.commande) return;

    const modal = await this.modalCtrl.create({
      component: CancelOrderModalComponent,
      componentProps: {
        commande: this.commande,
      },
      cssClass: 'cancel-order-modal-dialog',
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' || data?.confirmed) {
      this.confirmAnnuler();
    }
  }

  private confirmAnnuler(): void {
    if (!this.commande) return;
    this.commandeService.annuler(this.commande.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async updated => {
          this.commande = updated;
          const toast = await this.toastCtrl.create({
            message: 'Commande annulée avec succès',
            duration: 2000,
            color: 'warning',
          });
          toast.present();
          this.dismiss({ role: 'cancelled', commande: updated });
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Impossible d\'annuler cette commande',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  dismiss(data?: any): void {
    this.modalCtrl.dismiss(data);
  }
}
