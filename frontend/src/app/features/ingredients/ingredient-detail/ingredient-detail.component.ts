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
  template: `
    <div class="ingredient-detail-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ingredient?.name}}</mat-card-title>
          <div class="header-actions">
            <button mat-button color="primary" (click)="onBack()">
              <mat-icon>arrow_back</mat-icon>
              Retour
            </button>
            <button *ngIf="isAdmin$ | async" mat-raised-button color="accent" (click)="onEdit()">
              <mat-icon>edit</mat-icon>
              Modifier
            </button>
          </div>
        </mat-card-header>
        <mat-card-content>
          <div class="detail-section">
            <h3>Informations</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Catégorie:</span>
                <span class="value">{{ingredient?.category}}</span>
              </div>
              <div class="detail-item">
                <span class="label">Stock:</span>
                <span class="value">
                  <mat-chip [color]="getStockColor(ingredient?.stock)" selected>
                    {{ingredient?.stock}} {{ingredient?.unit}}
                  </mat-chip>
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Dernière mise à jour:</span>
                <span class="value">{{ingredient?.updatedAt | date:'medium'}}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Cocktails utilisant cet ingrédient</h3>
            <table mat-table [dataSource]="cocktailsDataSource" class="full-width">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Nom</th>
                <td mat-cell *matCellDef="let cocktail">{{cocktail.name}}</td>
              </ng-container>

              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef>Catégorie</th>
                <td mat-cell *matCellDef="let cocktail">{{cocktail.category}}</td>
              </ng-container>

              <ng-container matColumnDef="quantity">
                <th mat-header-cell *matHeaderCellDef>Quantité</th>
                <td mat-cell *matCellDef="let cocktail">{{cocktail.quantity}} {{ingredient?.unit}}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let cocktail">
                  <button mat-icon-button color="primary" (click)="onViewCocktail(cocktail)">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .ingredient-detail-container {
      padding: 20px;
    }
    .header-actions {
      display: flex;
      gap: 16px;
      margin-left: auto;
    }
    .detail-section {
      margin-bottom: 24px;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .label {
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
    }
    .value {
      font-size: 16px;
    }
    .full-width {
      width: 100%;
    }
  `],
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
