import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption, IonIcon } from '@ionic/angular/standalone';

import { NgIf } from '@angular/common';
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import { CocktailService } from '../../../core/services/cocktail.service';
import { Cocktail } from '../../../core/models/cocktail.model';
import { CocktailSaisonnaliteComponent } from '../cocktail-saisonnalite/cocktail-saisonnalite.component';

@Component({
  selector: 'app-cocktail-form',
  templateUrl: './cocktail-form.component.html',
  styleUrls: ['./cocktail-form.component.scss'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonButton, IonNote,
    IonSelect, IonSelectOption, IonIcon,
    ReactiveFormsModule, NgIf,
    CocktailSaisonnaliteComponent
  ]
})
export class CocktailFormComponent implements OnInit {
  cocktailForm: FormGroup;
  isEditMode = false;
  cocktailId: number | null = null;
  /** Données complètes du cocktail (nécessaires pour CocktailSaisonnaliteComponent) */
  cocktailData: Cocktail | null = null;

  constructor(private readonly fb: FormBuilder,private readonly route: ActivatedRoute,public readonly router: Router,private readonly toastCtrl: ToastController,private readonly cocktailService: CocktailService) {
    this.cocktailForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: ['', Validators.required]
    });
    addIcons({ calendarOutline });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.cocktailId = +id;
      this.cocktailService.getById(this.cocktailId).subscribe({
        next: (cocktail) => {
          this.cocktailData = cocktail;
          this.cocktailForm.patchValue({
            name: cocktail.nom,
            description: cocktail.description,
            price: cocktail.prix,
            category: cocktail.categorie
          });
        }
      });
    }
  }

  onSaisonnaliteUpdated(updatedCocktail: Cocktail): void {
    this.cocktailData = updatedCocktail;
    this.showToast('Saisonnalité mise à jour');
  }

  private async showToast(message: string, color = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color });
    await toast.present();
  }

  onSubmit(): void {
    if (this.cocktailForm.invalid) return;
    const { name, description, price, category } = this.cocktailForm.value;
    const payload = { nom: name, description, prix: price, categorie: category };
    const obs$ = this.isEditMode
      ? this.cocktailService.update(this.cocktailId!, payload)
      : this.cocktailService.create(payload);
    obs$.subscribe({
      next: () => {
        this.showToast(this.isEditMode ? 'Cocktail modifié' : 'Cocktail créé');
        this.router.navigate(['/cocktails']);
      },
      error: () => this.showToast('Erreur lors de la sauvegarde', 'danger'),
    });
  }
}
