import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin, selectCanEditIngredient } from '../../../core/store/auth.selectors';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
  IonRefresher, IonRefresherContent, IonSpinner, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, eye, create, trash } from 'ionicons/icons';
import { AsyncPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IngredientService } from '../../../core/services/ingredient.service';
import { Ingredient } from '../../../core/models/ingredient.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

/**
 * List component displaying all inventory ingredients in OpenBar.
 * Features pull-to-refresh, low-stock severity badges, role-based action buttons, and deletion.
 */
@Component({
  selector: 'app-ingredient-list',
  templateUrl: './ingredient-list.component.html',
  styleUrls: ['./ingredient-list.component.css'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    IonRefresher, IonRefresherContent, IonSpinner,
    AsyncPipe, TranslocoModule,
  ],
})
export class IngredientListComponent implements OnInit, OnDestroy {
  ingredients: Ingredient[] = [];
  isLoading = false;
  isAdmin$: Observable<boolean>;
  canEdit$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly ingredientService: IngredientService,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService,
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    this.canEdit$ = this.store.select(selectCanEditIngredient);
    addIcons({ add, eye, create, trash });
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
    this.ingredientService.getAll()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) safeCompleteRefresher(refreshEvent);
        }),
      )
      .subscribe({
        next: ingredients => (this.ingredients = ingredients),
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('COMMON.ERROR'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  getStockColor(stock: number): string {
    if (stock <= 0) return 'danger';
    if (stock < 10) return 'warning';
    return 'success';
  }

  isEnAlerte(ingredient: Ingredient): boolean {
    return ingredient.quantiteStock <= ingredient.seuilAlerte;
  }

  onDelete(ingredient: Ingredient): void {
    this.ingredientService.delete(ingredient.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.ingredients = this.ingredients.filter(i => i.id !== ingredient.id);
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('INGREDIENTS.DELETE_SUCCESS'),
            duration: 3000,
            color: 'success',
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('INGREDIENTS.DELETE_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  onAdd(): void {
    this.router.navigate(['/ingredients/new']);
  }

  onView(i: Ingredient): void {
    this.router.navigate(['/ingredients', i.id]);
  }

  onEdit(i: Ingredient): void {
    this.router.navigate(['/ingredients', i.id, 'edit']);
  }

  onRefresh(event: any): void {
    this.charger(event);
  }

  trackById(_: number, item: Ingredient): number {
    return item.id;
  }
}
