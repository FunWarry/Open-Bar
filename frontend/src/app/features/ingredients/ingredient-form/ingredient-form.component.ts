import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatError} from '@angular/material/form-field';

@Component({
  selector: 'app-ingredient-form',
  template: `
    <div class="ingredient-form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{isEditMode ? 'Modifier l\'Ingrédient' : 'Nouvel Ingrédient'}}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="ingredientForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nom</mat-label>
              <input matInput formControlName="name" required>
              <mat-error *ngIf="ingredientForm.get('name')?.hasError('required')">
                Le nom est requis
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Catégorie</mat-label>
              <mat-select formControlName="category" required>
                <mat-option value="ALCOOL">Alcool</mat-option>
                <mat-option value="SODA">Soda</mat-option>
                <mat-option value="JUS">Jus</mat-option>
                <mat-option value="FRUIT">Fruit</mat-option>
                <mat-option value="AUTRE">Autre</mat-option>
              </mat-select>
              <mat-error *ngIf="ingredientForm.get('category')?.hasError('required')">
                La catégorie est requise
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Stock</mat-label>
              <input matInput formControlName="stock" type="number" required>
              <mat-error *ngIf="ingredientForm.get('stock')?.hasError('required')">
                Le stock est requis
              </mat-error>
              <mat-error *ngIf="ingredientForm.get('stock')?.hasError('min')">
                Le stock ne peut pas être négatif
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Unité</mat-label>
              <mat-select formControlName="unit" required>
                <mat-option value="CL">Centilitres (cl)</mat-option>
                <mat-option value="ML">Millilitres (ml)</mat-option>
                <mat-option value="G">Grammes (g)</mat-option>
                <mat-option value="KG">Kilogrammes (kg)</mat-option>
                <mat-option value="UNITE">Unité</mat-option>
              </mat-select>
              <mat-error *ngIf="ingredientForm.get('unit')?.hasError('required')">
                L'unité est requise
              </mat-error>
            </mat-form-field>

            <div class="form-actions">
              <button mat-button type="button" (click)="onCancel()">Annuler</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="ingredientForm.invalid">
                {{isEditMode ? 'Modifier' : 'Créer'}}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .ingredient-form-container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 16px;
    }
  `],
  standalone: true,
  imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatFormFieldModule, MatInputModule, MatButtonModule, MatError]
})
export class IngredientFormComponent implements OnInit {
  ingredientForm: FormGroup;
  isEditMode = false;
  ingredientId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.ingredientForm = this.fb.group({
      name: ['', [Validators.required]],
      category: ['', [Validators.required]],
      stock: ['', [Validators.required, Validators.min(0)]],
      unit: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.ingredientId = this.route.snapshot.params['id'];
    if (this.ingredientId) {
      this.isEditMode = true;
      // TODO: Charger les données de l'ingrédient depuis le store
    }
  }

  onSubmit(): void {
    if (this.ingredientForm.valid) {
      const ingredientData = this.ingredientForm.value;
      if (this.isEditMode) {
        // TODO: Dispatch l'action de mise à jour
      } else {
        // TODO: Dispatch l'action de création
      }
    }
  }

  onCancel(): void {
    this.router.navigate(['/ingredients']);
  }
}
