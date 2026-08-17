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
  restaurantOutline, receiptOutline, flameOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TableView } from '../../models/table-view.model';
import { Commande } from '../../../../core/models/commande.model';
import { DashboardServeurService } from '../../services/dashboard-serveur.service';
import { TransfertModalComponent } from '../transfert-modal/transfert-modal.component';
import { EditCommandeModalComponent } from '../edit-commande-modal/edit-commande-modal.component';
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
  isLoading = false;

  private readonly modalCtrl = inject(ModalController);
  private readonly router = inject(Router);
  private readonly service = inject(DashboardServeurService);
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
    });
  }

  ngOnInit(): void {
    this.chargerCommandes();
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
    const alert = await this.alertCtrl.create({
      header: this.translocoService.translate('TABLE_MODAL.CONFIRM_CANCEL_TITLE', { id: commandeId }),
      message: this.translocoService.translate('TABLE_MODAL.CONFIRM_CANCEL_MESSAGE'),
      buttons: [
        {
          text: this.translocoService.translate('COMMON.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translocoService.translate('TABLE_MODAL.CONFIRM_CANCEL_BTN'),
          role: 'destructive',
          handler: () => {
            this.executeAnnulation(commandeId);
          },
        },
      ],
    });
    await alert.present();
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

  calculerTotalActif(): number {
    return this.commandes.reduce((sum, c) => sum + (c.total ?? 0), 0);
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
}
