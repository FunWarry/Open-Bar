import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonBadge, IonIcon,
  IonSpinner, IonNote, IonChip,
  ModalController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, addCircleOutline, banOutline,
  timeOutline, checkmarkCircleOutline,
} from 'ionicons/icons';
import { TableView } from '../../models/table-view.model';
import { Commande } from '../../../../core/models/commande.model';
import { DashboardServeurService } from '../../services/dashboard-serveur.service';

@Component({
  selector: 'app-table-detail-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonBadge, IonIcon,
    IonSpinner, IonNote, IonChip,
  ],
  templateUrl: './table-detail-modal.component.html',
  styleUrls: ['./table-detail-modal.component.scss'],
})
export class TableDetailModalComponent implements OnInit {
  @Input() table!: TableView;
  commandes: Commande[] = [];
  isLoading = false;

  constructor(
    private modalCtrl: ModalController,
    private router: Router,
    private service: DashboardServeurService,
    private toastCtrl: ToastController,
  ) {
    addIcons({ closeOutline, addCircleOutline, banOutline, timeOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.chargerCommandes();
  }

  chargerCommandes() {
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

  async annuler(commandeId: number) {
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

  nouvelleCommande() {
    this.modalCtrl.dismiss();
    this.router.navigate(['/serveur/nouvelle-commande', this.table.id]);
  }

  liberer() {
    this.modalCtrl.dismiss({ action: 'liberer', tableId: this.table.id });
  }

  fermer() {
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
