import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonBadge, IonIcon,
  IonSpinner, IonNote, IonChip, IonFooter,
  ModalController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, addCircleOutline, banOutline,
  timeOutline, checkmarkCircleOutline, swapHorizontalOutline,
} from 'ionicons/icons';
import { TableView } from '../../models/table-view.model';
import { Commande } from '../../../../core/models/commande.model';
import { DashboardServeurService } from '../../services/dashboard-serveur.service';
import { TransfertModalComponent } from '../transfert-modal/transfert-modal.component';
import { fastModalEnterAnimation, fastModalLeaveAnimation } from '../../../../core/utils/modal-animation.utils';

/**
 * Modal displaying active orders for a specific table with actions for new orders, cancellation, and table transfer.
 */
@Component({
  selector: 'app-table-detail-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonBadge, IonIcon,
    IonSpinner, IonNote, IonChip, IonFooter,
  ],
  templateUrl: './table-detail-modal.component.html',
  styleUrls: ['./table-detail-modal.component.scss'],
})
export class TableDetailModalComponent implements OnInit {
  @Input() table!: TableView;
  commandes: Commande[] = [];
  isLoading = false;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly router: Router,
    private readonly service: DashboardServeurService,
    private readonly toastCtrl: ToastController,
  ) {
    addIcons({ closeOutline, addCircleOutline, banOutline, timeOutline, checkmarkCircleOutline, swapHorizontalOutline });
  }

  ngOnInit(): void {
    this.chargerCommandes();
  }

  chargerCommandes(): void {
    this.isLoading = true;
    this.service.getCommandesByTable(this.table.id)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: commandes => {
          this.commandes = commandes.filter(
            c => c.statut !== 'REGLEE' && c.statut !== 'ANNULEE',
          );
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du chargement des commandes',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
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
          const targetNum = data.targetTableNumero ? `Table ${data.targetTableNumero}` : 'la nouvelle table';
          const toast = await this.toastCtrl.create({
            message: `Commande #${commandeId} transférée vers ${targetNum} avec succès !`,
            duration: 3000,
            color: 'success',
          });
          await toast.present();
          this.chargerCommandes();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du transfert de la commande',
            duration: 3000,
            color: 'danger',
          });
          await toast.present();
        },
      });
    }
  }

  async annuler(commandeId: number): Promise<void> {
    this.service.annulerCommande(commandeId).subscribe({
      next: () => this.chargerCommandes(),
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Impossible d\'annuler la commande',
          duration: 3000,
          color: 'danger',
        });
        toast.present();
      },
    });
  }

  nouvelleCommande(): void {
    this.modalCtrl.dismiss();
    this.router.navigate(['/serveur'], { queryParams: { tableId: this.table.id } });
  }

  liberer(): void {
    this.modalCtrl.dismiss({ action: 'liberer', tableId: this.table.id });
  }

  fermer(): void {
    this.modalCtrl.dismiss();
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

  statutLabel(statut: string): string {
    const labels: Record<string, string> = {
      EN_ATTENTE: 'En attente',
      EN_PREPARATION: 'En préparation',
      PRET: 'Prêt',
      LIVREE: 'Livré',
    };
    return labels[statut] ?? statut;
  }

  peutAnnuler(statut: string): boolean {
    return statut !== 'LIVREE' && statut !== 'REGLEE' && statut !== 'ANNULEE';
  }
}
