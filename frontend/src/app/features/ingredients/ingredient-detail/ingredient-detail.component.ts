import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon, IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, create } from 'ionicons/icons';
import { NgIf, AsyncPipe, DatePipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IngredientService } from '../../../core/services/ingredient.service';
import { Ingredient } from '../../../core/models/ingredient.model';

/**
 * Detail view component displaying detailed information for a specific Ingredient.
 */
@Component({
  selector: 'app-ingredient-detail',
  templateUrl: './ingredient-detail.component.html',
  styleUrls: ['./ingredient-detail.component.css'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon, IonSpinner,
    NgIf, AsyncPipe, DatePipe, TranslocoModule,
  ],
})
export class IngredientDetailComponent implements OnInit, OnDestroy {
  ingredient: Ingredient | null = null;
  isLoading = false;
  isAdmin$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly ingredientService: IngredientService,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService,
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({ arrowBack, create });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.isLoading = true;
    this.ingredientService.getById(+id)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ingredient => (this.ingredient = ingredient),
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('COMMON.ERROR'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
          this.router.navigate(['/ingredients']);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStockColor(stock: number): string {
    if (stock <= 0) return 'danger';
    if (stock < 10) return 'warning';
    return 'success';
  }

  isEnAlerte(): boolean {
    return !!this.ingredient && this.ingredient.quantiteStock <= this.ingredient.seuilAlerte;
  }

  onBack(): void {
    this.router.navigate(['/ingredients']);
  }

  onEdit(): void {
    this.router.navigate(['/ingredients', this.ingredient?.id, 'edit']);
  }

  trackById(_: number, item: any): any {
    return item.id ?? _;
  }
}
