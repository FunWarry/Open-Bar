import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastController} from '@ionic/angular/standalone';
import {IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption} from '@ionic/angular/standalone';
import {NgIf} from '@angular/common';

@Component({
    selector: 'app-cocktail-form',
    templateUrl: './cocktail-form.component.html',
    styleUrls: ['./cocktail-form.component.scss'],
    standalone: true,
    imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption, ReactiveFormsModule, NgIf]
})
export class CocktailFormComponent implements OnInit {
  cocktailForm: FormGroup;
  isEditMode = false;
  cocktailId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private toastCtrl: ToastController
  ) {
    this.cocktailForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.cocktailId = +id;
      // TODO: Charger les données du cocktail
    }
  }

  private async showToast(message: string, color = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color });
    await toast.present();
  }

  onSubmit(): void {
    if (this.cocktailForm.valid) {
      // TODO: Implémenter la logique de sauvegarde
      this.showToast('Cocktail sauvegardé avec succès');
      this.router.navigate(['/cocktails']);
    }
  }
}
