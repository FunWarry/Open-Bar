import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ToastController, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption,
  IonIcon, IonThumbnail
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, cameraOutline, imageOutline } from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CocktailService } from '../../../core/services/cocktail.service';
import { Cocktail } from '../../../core/models/cocktail.model';
import { CocktailSaisonnaliteComponent } from '../cocktail-saisonnalite/cocktail-saisonnalite.component';

/**
 * Form component for creating and editing cocktails in OpenBar.
 * Includes photo upload selection, live preview, category selection, and seasonal availability settings.
 */
@Component({
  selector: 'app-cocktail-form',
  templateUrl: './cocktail-form.component.html',
  styleUrls: ['./cocktail-form.component.scss'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonButton, IonNote,
    IonSelect, IonSelectOption, IonIcon, IonThumbnail,
    ReactiveFormsModule, TranslocoModule,
    CocktailSaisonnaliteComponent
  ]
})
export class CocktailFormComponent implements OnInit {
  cocktailForm: FormGroup;
  isEditMode = false;
  cocktailId: number | null = null;
  cocktailData: Cocktail | null = null;

  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    public readonly router: Router,
    private readonly toastCtrl: ToastController,
    private readonly cocktailService: CocktailService,
    private readonly transloco: TranslocoService,
  ) {
    this.cocktailForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: ['', Validators.required]
    });
    addIcons({ calendarOutline, cameraOutline, imageOutline });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.cocktailId = +id;
      this.cocktailService.getById(this.cocktailId).subscribe({
        next: (cocktail) => {
          this.cocktailData = cocktail;
          this.imagePreview = cocktail.imageUrl || null;
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

  /**
   * Handles photo file selection and generates local data URL preview.
   * @param event File input change event
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Triggers native file input click event.
   * @param fileInput Target HTML input element reference
   */
  triggerFileInput(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onSaisonnaliteUpdated(updatedCocktail: Cocktail): void {
    this.cocktailData = updatedCocktail;
    this.showToast(this.transloco.translate('COMMON.SUCCESS'));
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

    obs$.pipe(
      switchMap(savedCocktail => {
        if (this.selectedFile && savedCocktail?.id) {
          return this.cocktailService.uploadImage(savedCocktail.id, this.selectedFile);
        }
        return of(savedCocktail);
      })
    ).subscribe({
      next: () => {
        const msg = this.isEditMode
          ? this.transloco.translate('COCKTAILS.PHOTO_UPDATED_SUCCESS')
          : this.transloco.translate('COMMON.SUCCESS');
        this.showToast(msg);
        this.router.navigate(['/cocktails']);
      },
      error: () => this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger'),
    });
  }
}
