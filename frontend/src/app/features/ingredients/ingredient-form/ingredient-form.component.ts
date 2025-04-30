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
  templateUrl: './ingredient-form.component.html',
  styleUrls: ['./ingredient-form.component.css'],
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
