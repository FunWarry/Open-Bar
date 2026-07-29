import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
  IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
  IonSpinner, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, leafOutline, toggleOutline } from 'ionicons/icons';
import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { CocktailService } from '../../../core/services/cocktail.service';
import { Cocktail } from '../../../core/models/cocktail.model';

@Component({
  selector: 'app-cocktail-list',
  templateUrl: './cocktail-list.component.html',
  styleUrls: ['./cocktail-list.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
    IonSpinner,
    AsyncPipe, CurrencyPipe,
  ],
})
export class CocktailListComponent implements OnInit, OnDestroy {
  cocktails: Cocktail[] = [];
  filteredCocktails: Cocktail[] = [];
  filtre: 'tous' | 'disponibles' | 'indisponibles' = 'tous';
  isLoading = false;
  isAdmin$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly store: Store,private readonly router: Router,private readonly cocktailService: CocktailService,private readonly toastCtrl: ToastController,
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({ add, create, trash, leafOutline, toggleOutline });
  }

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(refreshEvent?: any): void {
    this.isLoading = true;
    this.cocktailService.getAll()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) refreshEvent.target.complete();
        }),
      )
      .subscribe({
        next: cocktails => {
          this.cocktails = cocktails;
          this.appliquerFiltre();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Erreur lors du chargement des cocktails', duration: 3000, color: 'danger' });
          toast.present();
        },
      });
  }

  onFiltreChange(event: any): void {
    this.filtre = event.detail.value;
    this.appliquerFiltre();
  }

  private appliquerFiltre(): void {
    switch (this.filtre) {
      case 'disponibles':   this.filteredCocktails = this.cocktails.filter(c => c.disponible); break;
      case 'indisponibles': this.filteredCocktails = this.cocktails.filter(c => !c.disponible); break;
      default:              this.filteredCocktails = [...this.cocktails];
    }
  }

  isHorsSaison(cocktail: Cocktail): boolean {
    return !!(cocktail.moisDebut && cocktail.moisFin && cocktail.disponibleAujourdhui === false);
  }

  onToggleDisponibilite(cocktail: Cocktail): void {
    this.cocktailService.toggleDisponibilite(cocktail.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          const idx = this.cocktails.findIndex(c => c.id === updated.id);
          if (idx !== -1) this.cocktails[idx] = updated;
          this.appliquerFiltre();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Impossible de changer la disponibilité', duration: 3000, color: 'danger' });
          toast.present();
        },
      });
  }

  onDelete(cocktail: Cocktail): void {
    this.cocktailService.delete(cocktail.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cocktails = this.cocktails.filter(c => c.id !== cocktail.id);
          this.appliquerFiltre();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Impossible de supprimer le cocktail', duration: 3000, color: 'danger' });
          toast.present();
        },
      });
  }

  onAdd(): void { this.router.navigate(['/cocktails/new']); }
  onEdit(c: Cocktail): void { this.router.navigate(['/cocktails', c.id, 'edit']); }
  onRefresh(event: any): void { this.charger(event); }
  trackById(_: number, item: Cocktail): number { return item.id; }
}
