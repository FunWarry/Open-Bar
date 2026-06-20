import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectIsAdmin} from '../../../core/store/auth.selectors';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {arrowBack, create, eye} from 'ionicons/icons';
import {NgIf, NgFor, AsyncPipe, DatePipe} from '@angular/common';

@Component({
  selector: 'app-ingredient-detail',
  templateUrl: './ingredient-detail.component.html',
  styleUrls: ['./ingredient-detail.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon,
    NgIf, NgFor, AsyncPipe, DatePipe
  ]
})
export class IngredientDetailComponent implements OnInit {
  ingredient: any; // TODO: Remplacer par le type Ingredient
  isAdmin$: Observable<boolean>;
  cocktailsDataSource: any[] = [];

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({arrowBack, create, eye});
  }

  ngOnInit(): void {
    // TODO: Charger les données de l'ingrédient depuis le store
  }

  getStockColor(stock: number): string {
    if (stock <= 0) return 'danger';
    if (stock < 10) return 'warning';
    return 'success';
  }

  trackById(index: number, item: any): any {
    return item.id ?? index;
  }

  onBack(): void {
    this.router.navigate(['/ingredients']);
  }

  onEdit(): void {
    this.router.navigate(['/ingredients', this.ingredient.id, 'edit']);
  }

  onViewCocktail(cocktail: any): void {
    this.router.navigate(['/cocktails', cocktail.id]);
  }
}
