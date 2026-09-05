import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonBadge, IonIcon, IonSpinner, IonFooter,
  ModalController, ToastController, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, addCircleOutline, banOutline,
  timeOutline, checkmarkCircleOutline, swapHorizontalOutline,
  cardOutline, pencilOutline, peopleOutline, personOutline,
  restaurantOutline, receiptOutline, flameOutline, flashOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TableView } from '../../models/table-view.model';
import { TableAppel } from '../../../../core/models/table-appel.model';
import { TableAppelService } from '../../../../core/services/table-appel.service';
import { Commande, CommandeItem } from '../../../../core/models/commande.model';
import { DashboardServeurService } from '../../services/dashboard-serveur.service';
import { CommandeService } from '../../../../core/services/commande.service';
import { TransfertModalComponent } from '../transfert-modal/transfert-modal.component';
import { EditCommandeModalComponent } from '../edit-commande-modal/edit-commande-modal.component';
import { CancelOrderModalComponent } from '../../../../core/components/ui/cancel-order-modal/cancel-order-modal.component';
import { fastModalEnterAnimation, fastModalLeaveAnimation } from '../../../../core/utils/modal-animation.utils';

/**
 * Redesigned modal displaying active orders for a specific table with rich card layouts,
 * status badges, item breakdowns, bill summary, and actions for modification, transfer, and cancellation.
 */
@Component({
  selector: 'app-table-detail-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonBadge, IonIcon, IonSpinner, IonFooter,
    TranslocoPipe,
  ],
  templateUrl: './table-detail-modal.component.html',
  styleUrls: ['./table-detail-modal.component.scss'],
})
export class TableDetailModalComponent implements OnInit {
  @Input() table!: TableView;
  commandes: Commande[] = [];
  activeAppels: TableAppel[] = [];
  isLoading = false;

  private readonly modalCtrl = inject(ModalController);
  private readonly router = inject(Router);
  private readonly service = inject(DashboardServeurService);
  private readonly commandeService = inject(CommandeService);
  private readonly tableAppelService = inject(TableAppelService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translocoService = inject(TranslocoService);

  constructor() {
    addIcons({
      closeOutline,
      addCircleOutline,
      banOutline,
      timeOutline,
      checkmarkCircleOutline,
      swapHorizontalOutline,
      cardOutline,
      pencilOutline,
      peopleOutline,
      personOutline,
      restaurantOutline,
      receiptOutline,
      flameOutline,
      flashOutline,
    });
  }

  ngOnInit(): void {
    this.chargerCommandes();
    this.chargerAppels();
  }

  chargerAppels(): void {
    this.tableAppelService.getAppelsActifsPourTable(this.table.id).subscribe({
      next: (appels) => {
        this.activeAppels = (appels ?? []).filter(a => a.statut === 'EN_ATTENTE');
      }
    });
  }

  acquitterAppel(appelId: number): void {
    this.tableAppelService.acquitterAppel(this.table.id, appelId).subscribe({
      next: async () => {
        this.activeAppels = this.activeAppels.filter(a => a.id !== appelId);
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate('SERVEUR.ALERTS.ACKNOWLEDGE_SUCCESS'),
          duration: 2500,
          color: 'success',
        });
        await toast.present();
      },
    });
  }

  chargerCommandes(): void {
    this.isLoading = true;
    this.service.getCommandesByTable(this.table.id)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (commandes: Commande[]) => {
          this.commandes = (commandes ?? []).filter(
            c => c.statut !== 'REGLEE' && c.statut !== 'ANNULEE',
          );
          if (this.commandes.length > 0) {
            this.table.occupee = true;
          }
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate('TABLE_MODAL.LOAD_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          await toast.present();
        },
      });
  }

  /**
   * Opens the edit order modal allowing servers to adjust items, quantities, variants, and notes.
   *
   * @param commande Order entity to edit
   */
  async modifierCommande(commande: Commande): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EditCommandeModalComponent,
      componentProps: {
        commande,
        tableNumero: this.table.id,
      },
      cssClass: 'edit-commande-modal-container',
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data?.updated) {
      this.chargerCommandes();
    }
  }

  /**
   * Opens the transfer modal to move a specific order to another table.
   *
   * @param commandeId Unique identifier of the order to transfer.
   */
  async transferer(commandeId: number): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TransfertModalComponent,
      componentProps: {
        currentTableId: this.table.id,
        commandeId,
      },
      cssClass: 'transfert-modal-container',
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data?.targetTableId) {
      this.service.transfererCommande(commandeId, data.targetTableId).subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate('TABLE_MODAL.TRANSFER_SUCCESS', { id: commandeId }),
            duration: 3000,
            color: 'success',
          });
          await toast.present();
          this.chargerCommandes();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate('TABLE_MODAL.TRANSFER_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          await toast.present();
        },
      });
    }
  }

  async annuler(commandeId: number): Promise<void> {
    const targetCmd = this.commandes.find(c => c.id === commandeId);
    const modal = await this.modalCtrl.create({
      component: CancelOrderModalComponent,
      componentProps: {
        commande: targetCmd,
        commandeId: commandeId,
        tableNumero: this.table?.nom || this.table?.id,
        items: targetCmd?.items,
        total: targetCmd?.total,
        serveurUsername: targetCmd?.serveurUsername
      },
      cssClass: 'cancel-order-modal-dialog',
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' || data?.confirmed) {
      this.executeAnnulation(commandeId);
    }
  }

  private executeAnnulation(commandeId: number): void {
    this.service.annulerCommande(commandeId).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate('TABLE_MODAL.CANCEL_SUCCESS', { id: commandeId }),
          duration: 3000,
          color: 'success',
        });
        await toast.present();
        this.chargerCommandes();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate('TABLE_MODAL.CANCEL_ERROR'),
          duration: 3000,
          color: 'danger',
        });
        await toast.present();
      },
    });
  }

  nouvelleCommande(): void {
    this.modalCtrl.dismiss();
    this.router.navigate(['/serveur'], { queryParams: { tableId: this.table.id } });
  }

  encaisser(): void {
    this.modalCtrl.dismiss({ action: 'encaisser', table: this.table });
  }

  liberer(): void {
    this.modalCtrl.dismiss({ action: 'liberer', tableId: this.table.id });
  }

  fermer(): void {
    this.modalCtrl.dismiss();
  }

  getCommandeTotal(cmd: Commande | null | undefined): number {
    if (!cmd) return 0;
    if (cmd.total && cmd.total > 0) return cmd.total;
    if (cmd.items && cmd.items.length > 0) {
      return cmd.items.reduce((sum, it) => sum + ((it.prixUnitaire || 0) * (it.quantite || 1)), 0);
    }
    return 0;
  }

  calculerTotalActif(): number {
    return this.commandes
      .filter((c) => c.statut !== 'ANNULEE')
      .reduce((sum, c) => sum + this.getCommandeTotal(c), 0);
  }

  toggleUrgent(cmd: Commande): void {
    this.commandeService.toggleUrgent(cmd.id).subscribe({
      next: async (updated) => {
        cmd.prioritaire = updated.prioritaire;
        const msgKey = cmd.prioritaire ? 'COMMANDES.MESSAGES.MARKED_URGENT' : 'COMMANDES.MESSAGES.UNMARKED_URGENT';
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate(msgKey),
          duration: 2500,
          color: cmd.prioritaire ? 'warning' : 'medium',
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

  statutColor(statut: string): string {
    const colors: Record<string, string> = {
      EN_ATTENTE: 'warning',
      EN_PREPARATION: 'primary',
      PRET: 'success',
      LIVREE: 'medium',
    };
    return colors[statut] ?? 'medium';
  }

  statutTranslocoKey(statut: string): string {
    const keys: Record<string, string> = {
      EN_ATTENTE: 'TABLE_MODAL.STATUS_EN_ATTENTE',
      EN_PREPARATION: 'TABLE_MODAL.STATUS_EN_PREPARATION',
      PRET: 'TABLE_MODAL.STATUS_PRET',
      LIVREE: 'TABLE_MODAL.STATUS_LIVREE',
    };
    return keys[statut] ?? statut;
  }

  peutModifier(statut: string): boolean {
    return statut === 'EN_ATTENTE' || statut === 'EN_PREPARATION';
  }

  peutAnnuler(statut: string): boolean {
    return statut !== 'LIVREE' && statut !== 'REGLEE' && statut !== 'ANNULEE';
  }

  /**
   * Groups identical items (matching cocktail, variant, and notes) and consolidates their quantity.
   */
  getGroupedItems(items: CommandeItem[]): CommandeItem[] {
    if (!items || items.length === 0) return [];
    const groupedMap = new Map<string, CommandeItem>();

    for (const item of items) {
      const key = `${item.cocktailNom}|${item.varianteNom ?? ''}|${item.notes ?? ''}`;
      const existing = groupedMap.get(key);
      if (existing) {
        existing.quantite = (existing.quantite || 1) + (item.quantite || 1);
      } else {
        groupedMap.set(key, { ...item, quantite: item.quantite || 1 });
      }
    }
    return Array.from(groupedMap.values());
  }

  /**
   * Calculates the total number of drink units across all items in an order.
   */
  getArticlesTotalCount(items: CommandeItem[]): number {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.quantite || 1), 0);
  }
}
