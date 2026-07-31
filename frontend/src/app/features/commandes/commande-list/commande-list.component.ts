import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
  IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
  IonSpinner, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, banOutline } from 'ionicons/icons';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande, CommandeStatut } from '../../../core/models/commande.model';

@Component({
  selector: 'app-commande-list',
  templateUrl: './commande-list.component.html',
  styleUrls: ['./commande-list.component.css'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
    IonSpinner,
    CurrencyPipe, DatePipe,
  ],
})
export class CommandeListComponent implements OnInit, OnDestroy {
  commandes: Commande[] = [];
  filteredCommandes: Commande[] = [];
  filtre: CommandeStatut | 'TOUTES' = 'TOUTES';
  isLoading = false;
  isAdmin$: Observable<boolean>;

  readonly statuts: Array<{ value: CommandeStatut | 'TOUTES'; label: string }> = [
    { value: 'TOUTES',         label: 'Toutes' },
    { value: 'EN_ATTENTE',     label: 'En attente' },
    { value: 'EN_PREPARATION', label: 'En préparation' },
    { value: 'PRET',           label: 'Prêt' },
    { value: 'LIVREE',         label: 'Livré' },
    { value: 'REGLEE',         label: 'Réglée' },
    { value: 'ANNULEE',        label: 'Annulée' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly store: Store,private readonly router: Router,private readonly commandeService: CommandeService,private readonly toastCtrl: ToastController,
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({ eye, banOutline });
  }

  ngOnInit(): void { this.charger(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(refreshEvent?: any): void {
    this.isLoading = true;
    this.commandeService.getAll()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) refreshEvent.target.complete();
        }),
      )
      .subscribe({
        next: commandes => {
          this.commandes = commandes;
          this.appliquerFiltre();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Erreur lors du chargement', duration: 3000, color: 'danger' });
          toast.present();
        },
      });
  }

  onFiltreChange(event: any): void {
    this.filtre = event.detail.value;
    this.appliquerFiltre();
  }

  private appliquerFiltre(): void {
    this.filteredCommandes = this.filtre === 'TOUTES'
      ? [...this.commandes]
      : this.commandes.filter(c => c.statut === this.filtre);
  }

  getStatutColor(statut: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'warning', EN_PREPARATION: 'tertiary',
      PRET: 'success', LIVREE: 'medium', REGLEE: 'dark', ANNULEE: 'danger',
    };
    return map[statut] ?? 'primary';
  }

  onView(c: Commande): void { this.router.navigate(['/commandes', c.id]); }

  onAnnuler(c: Commande): void {
    this.commandeService.annuler(c.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.charger(),
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Impossible d\'annuler', duration: 3000, color: 'danger' });
          toast.present();
        },
      });
  }

  peutAnnuler(statut: string): boolean {
    return !['LIVREE', 'REGLEE', 'ANNULEE'].includes(statut);
  }

  onRefresh(event: any): void { this.charger(event); }
  trackById(_: number, c: Commande): number { return c.id; }
}
