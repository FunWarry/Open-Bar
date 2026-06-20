import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastController} from '@ionic/angular/standalone';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {arrowBack, create, trash} from 'ionicons/icons';
import {CurrencyPipe, NgIf, NgFor} from '@angular/common';

@Component({
  selector: 'app-commande-detail',
  templateUrl: './commande-detail.component.html',
  styleUrls: ['./commande-detail.component.scss'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon,
    CurrencyPipe, NgIf, NgFor
  ],
  providers: [ToastController]
})
export class CommandeDetailComponent implements OnInit {
  commandeId: number;
  commande: any; // TODO: Remplacer par le type approprié

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private toastCtrl: ToastController
  ) {
    this.commandeId = +this.route.snapshot.paramMap.get('id')!;
    addIcons({arrowBack, create, trash});
  }

  ngOnInit(): void {
    // TODO: Charger les détails de la commande
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'EN_ATTENTE': return 'warning';
      case 'EN_PREPARATION': return 'tertiary';
      case 'PRETE': return 'success';
      case 'SERVIE': return 'medium';
      case 'ANNULEE': return 'danger';
      default: return 'primary';
    }
  }

  onEdit(): void {
    this.router.navigate(['/commandes', this.commandeId, 'edit']);
  }

  async onDelete(): Promise<void> {
    // TODO: Implémenter la logique de suppression
    const toast = await this.toastCtrl.create({
      message: 'Commande supprimée avec succès',
      duration: 3000,
      color: 'success'
    });
    await toast.present();
    this.router.navigate(['/commandes']);
  }
}
