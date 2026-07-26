import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { switchMap, takeUntil, finalize } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonBadge, IonChip, IonSpinner,
  IonFooter, IonToolbar as IonFooterToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, removeOutline, trashOutline,
  checkmarkOutline, arrowBackOutline,
} from 'ionicons/icons';
import { DashboardServeurService } from '../services/dashboard-serveur.service';
import { CocktailService } from '../../../core/services/cocktail.service';
import { TableView } from '../models/table-view.model';
import { Cocktail } from '../../../core/models/cocktail.model';
import { AjouterItemRequest } from '../../../core/models/commande.model';

interface CartItem {
  cocktailId: number;
  cocktailNom: string;
  prixUnitaire: number;
  quantite: number;
}

@Component({
  selector: 'app-nouvelle-commande',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonContent, IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonBadge, IonChip, IonSpinner,
    IonFooter, IonFooterToolbar,
  ],
  templateUrl: './nouvelle-commande.component.html',
  styleUrls: ['./nouvelle-commande.component.scss'],
})
export class NouvelleCommandeComponent implements OnInit, OnDestroy {
  table: TableView | null = null;
  cocktails: Cocktail[] = [];
  cart: CartItem[] = [];
  isLoading = false;
  isSubmitting = false;

  private tableId!: number;
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly route: ActivatedRoute,private readonly router: Router,private readonly service: DashboardServeurService,private readonly cocktailService: CocktailService,private readonly toastCtrl: ToastController,
  ) {
    addIcons({ addOutline, removeOutline, trashOutline, checkmarkOutline, arrowBackOutline });
  }

  ngOnInit() {
    this.tableId = Number(this.route.snapshot.paramMap.get('tableId'));
    this.charger();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger() {
    this.isLoading = true;
    forkJoin({
      table: this.service.getTableById(this.tableId),
      cocktails: this.cocktailService.getDisponibles(),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false)),
      )
      .subscribe({
        next: ({ table, cocktails }) => {
          this.table = table;
          this.cocktails = cocktails;
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du chargement',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  quantiteDans(cocktailId: number): number {
    return this.cart.find(i => i.cocktailId === cocktailId)?.quantite ?? 0;
  }

  ajouter(cocktail: Cocktail) {
    const existing = this.cart.find(i => i.cocktailId === cocktail.id);
    if (existing) {
      existing.quantite++;
    } else {
      this.cart.push({ cocktailId: cocktail.id, cocktailNom: cocktail.nom, prixUnitaire: cocktail.prix, quantite: 1 });
    }
  }

  retirer(cocktailId: number) {
    const idx = this.cart.findIndex(i => i.cocktailId === cocktailId);
    if (idx === -1) return;
    if (this.cart[idx].quantite > 1) {
      this.cart[idx].quantite--;
    } else {
      this.cart.splice(idx, 1);
    }
  }

  supprimer(cocktailId: number) {
    this.cart = this.cart.filter(i => i.cocktailId !== cocktailId);
  }

  get totalPanier(): number {
    return this.cart.reduce((sum, i) => sum + i.prixUnitaire * i.quantite, 0);
  }

  get nbArticles(): number {
    return this.cart.reduce((sum, i) => sum + i.quantite, 0);
  }

  valider() {
    if (this.cart.length === 0 || this.isSubmitting) return;
    this.isSubmitting = true;

    this.service.createCommande({ tableId: this.tableId })
      .pipe(
        takeUntil(this.destroy$),
        switchMap(commande =>
          forkJoin(
            this.cart.map(item => {
              const req: AjouterItemRequest = { cocktailId: item.cocktailId, quantite: item.quantite };
              return this.service.ajouterItem(commande.id, req);
            }),
          ).pipe(switchMap(() => of(commande))),
        ),
        finalize(() => (this.isSubmitting = false)),
      )
      .subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Commande créée avec succès',
            duration: 2000,
            color: 'success',
          });
          toast.present();
          this.router.navigate(['/serveur']);
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors de la création de la commande',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  trackById(_: number, item: Cocktail): number { return item.id; }
}
