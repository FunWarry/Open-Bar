import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  ToastController, IonContent, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonBadge, IonButton,
  IonButtons, IonIcon, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, banOutline, timeOutline, personOutline } from 'ionicons/icons';
import { CurrencyPipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande, CommandeItem } from '../../../core/models/commande.model';

@Component({
  selector: 'app-commande-detail',
  templateUrl: './commande-detail.component.html',
  styleUrls: ['./commande-detail.component.scss'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonBadge, IonButton, IonButtons, IonIcon, IonSpinner,
    CurrencyPipe, TranslocoPipe,
  ],
})
export class CommandeDetailComponent implements OnInit, OnDestroy {
  commande: Commande | null = null;
  isLoading = false;

  private readonly commandeId: number;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    public readonly router: Router,
    private readonly commandeService: CommandeService,
    private readonly toastCtrl: ToastController,
  ) {
    this.commandeId = +this.route.snapshot.paramMap.get('id')!;
    addIcons({ arrowBack, banOutline, timeOutline, personOutline });
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

  /**
   * Groups identical items (same cocktail name, variante, and notes) and sums quantities.
   */
  get groupedItems(): CommandeItem[] {
    if (!this.commande?.items) return [];
    const map = new Map<string, CommandeItem>();
    for (const item of this.commande.items) {
      const nomKey = (item.cocktailNom || item.cocktailId || '').toString().trim().toLowerCase();
      const varianteKey = item.varianteNom ? item.varianteNom.trim().toLowerCase() : (item.varianteId || 0);
      const notesKey = (item.notes || '').trim().toLowerCase();
      const key = `${nomKey}_${varianteKey}_${notesKey}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantite += (item.quantite || 1);
      } else {
        map.set(key, { ...item, quantite: item.quantite || 1 });
      }
    }
    return Array.from(map.values());
  }

  getItemLineTotal(item: CommandeItem): number {
    return (item.prixUnitaire || 0) * (item.quantite || 1);
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
