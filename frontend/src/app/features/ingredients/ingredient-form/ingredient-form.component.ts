import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {ToastController} from '@ionic/angular/standalone';
import {IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption} from '@ionic/angular/standalone';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-ingredient-form',
  templateUrl: './ingredient-form.component.html',
  styleUrls: ['./ingredient-form.component.css'],
  standalone: true,
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption, ReactiveFormsModule, NgIf]
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
    private toastCtrl: ToastController
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

  private async showToast(message: string, color = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color });
    await toast.present();
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
