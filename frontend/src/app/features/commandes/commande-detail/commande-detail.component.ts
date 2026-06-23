import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ToastController } from '@ionic/angular/standalone';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, banOutline } from 'ionicons/icons';
import { CurrencyPipe, NgIf, NgFor, DatePipe } from '@angular/common';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande } from '../../../core/models/commande.model';

@Component({
  selector: 'app-commande-detail',
  templateUrl: './commande-detail.component.html',
  styleUrls: ['./commande-detail.component.scss'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon, IonSpinner,
    CurrencyPipe, NgIf, NgFor, DatePipe,
  ],
})
export class CommandeDetailComponent implements OnInit, OnDestroy {
  commande: Commande | null = null;
  isLoading = false;

  private commandeId: number;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private commandeService: CommandeService,
    private toastCtrl: ToastController,
  ) {
    this.commandeId = +this.route.snapshot.paramMap.get('id')!;
    addIcons({ arrowBack, banOutline });
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.commandeService.getById(this.commandeId)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoading = false)))
      .subscribe({
        next: commande => (this.commande = commande),
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Commande introuvable', duration: 3000, color: 'danger' });
          toast.present();
          this.router.navigate(['/commandes']);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatutColor(statut: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'warning', EN_PREPARATION: 'tertiary',
      PRET: 'success', LIVREE: 'medium', REGLEE: 'dark', ANNULEE: 'danger',
    };
    return map[statut] ?? 'primary';
  }

  peutAnnuler(): boolean {
    return !!this.commande && !['LIVREE', 'REGLEE', 'ANNULEE'].includes(this.commande.statut);
  }

  onAnnuler(): void {
    if (!this.commande) return;
    this.commandeService.annuler(this.commande.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async updated => {
          this.commande = updated;
          const toast = await this.toastCtrl.create({ message: 'Commande annulée', duration: 2000, color: 'medium' });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Impossible d\'annuler', duration: 3000, color: 'danger' });
          toast.present();
        },
      });
  }

  onBack(): void { this.router.navigate(['/commandes']); }
}
