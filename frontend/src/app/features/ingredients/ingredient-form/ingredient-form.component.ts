import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { NgIf } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IngredientService } from '../../../core/services/ingredient.service';

/**
 * Form component for creating or editing an Ingredient entity in OpenBar.
 * Supports reactive form validation, Transloco i18n, and Toast notifications.
 */
@Component({
  selector: 'app-ingredient-form',
  templateUrl: './ingredient-form.component.html',
  styleUrls: ['./ingredient-form.component.css'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption,
    ReactiveFormsModule, NgIf, TranslocoModule,
  ],
})
export class IngredientFormComponent implements OnInit {
  ingredientForm: FormGroup;
  isEditMode = false;
  ingredientId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastCtrl: ToastController,
    private readonly ingredientService: IngredientService,
    private readonly transloco: TranslocoService,
  ) {
    this.ingredientForm = this.fb.group({
      nom:           ['', [Validators.required]],
      uniteMesure:   ['', [Validators.required]],
      quantiteStock: [0,  [Validators.required, Validators.min(0)]],
      seuilAlerte:   [5,  [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.ingredientId = +id;
      this.ingredientService.getById(this.ingredientId).subscribe({
        next: ingredient => this.ingredientForm.patchValue({
          nom:           ingredient.nom,
          uniteMesure:   ingredient.uniteMesure,
          quantiteStock: ingredient.quantiteStock,
          seuilAlerte:   ingredient.seuilAlerte,
        }),
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
  }

  onSubmit(): void {
    if (this.ingredientForm.invalid) return;
    const payload = this.ingredientForm.value;
    const obs$ = this.isEditMode
      ? this.ingredientService.update(this.ingredientId!, payload)
      : this.ingredientService.create(payload);
    obs$.subscribe({
      next: async () => {
        const msgKey = this.isEditMode ? 'INGREDIENTS.UPDATED_SUCCESS' : 'INGREDIENTS.CREATED_SUCCESS';
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate(msgKey),
          duration: 3000,
          color: 'success',
        });
        toast.present();
        this.router.navigate(['/ingredients']);
      },
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

  onCancel(): void {
    this.router.navigate(['/ingredients']);
  }
}
