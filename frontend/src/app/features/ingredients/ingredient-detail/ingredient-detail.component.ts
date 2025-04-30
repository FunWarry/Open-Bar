import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectIsAdmin} from '../../../core/store/auth.selectors';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatChipsModule} from '@angular/material/chips';

@Component({
  selector: 'app-ingredient-detail',
  templateUrl: './ingredient-detail.component.html',
  styleUrls: ['./ingredient-detail.component.css'],
  standalone: true,
  imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatIconModule, MatButtonModule, MatChipsModule]
})
export class IngredientDetailComponent implements OnInit {
  ingredient: any; // TODO: Remplacer par le type Ingredient
  isAdmin$: Observable<boolean>;
  cocktailsDataSource: any[] = []; // TODO: Remplacer par le type Cocktail[]
  displayedColumns: string[] = ['name', 'category', 'quantity', 'actions'];

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
  }

  ngOnInit(): void {
    const ingredientId = this.route.snapshot.params['id'];
    // TODO: Charger les données de l'ingrédient depuis le store
  }

  getStockColor(stock: number): string {
    if (stock <= 0) {
      return 'warn';
    } else if (stock < 10) {
      return 'accent';
    }
    return 'primary';
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
