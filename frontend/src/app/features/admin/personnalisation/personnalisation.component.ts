import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { NgIf } from '@angular/common';

import { AppSettingsService } from '../../../core/services/app-settings.service';
import { AppSettings } from '../../../core/models/app-settings.model';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const URL_PATTERN = /^https?:\/\/.+/;

@Component({
  selector: 'app-personnalisation',
  templateUrl: './personnalisation.component.html',
  styleUrls: ['./personnalisation.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption,
    ReactiveFormsModule, NgIf,
  ],
})
export class PersonnalisationComponent implements OnInit {
  settingsForm: FormGroup;
  loading = true;
  private loadedColors: Pick<AppSettings, 'primaryColor' | 'primaryColorStrong'> | null = null;

  constructor(private readonly fb: FormBuilder,private readonly router: Router,private readonly toastCtrl: ToastController,private readonly appSettingsService: AppSettingsService,
  ) {
    this.settingsForm = this.fb.group({
      primaryColor: ['#6c7fe8', [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      primaryColorStrong: ['#5a68d6', [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      logoUrl: ['', [Validators.pattern(URL_PATTERN)]],
      establishmentName: ['OpenBar', [Validators.required, Validators.maxLength(100)]],
      defaultTheme: ['DARK', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.appSettingsService.getSettings().subscribe({
      next: settings => {
        this.loadedColors = { primaryColor: settings.primaryColor, primaryColorStrong: settings.primaryColorStrong };
        this.settingsForm.patchValue({
          primaryColor: settings.primaryColor,
          primaryColorStrong: settings.primaryColorStrong,
          logoUrl: settings.logoUrl ?? '',
          establishmentName: settings.establishmentName,
          defaultTheme: settings.defaultTheme,
        });
        this.loading = false;
      },
      error: async () => {
        this.loading = false;
        const toast = await this.toastCtrl.create({ message: 'Erreur lors du chargement des réglages', duration: 3000, color: 'danger' });
        toast.present();
      },
    });

    // Aperçu live des couleurs avant sauvegarde (cf. spec CDC #153) — délègue à
    // AppSettingsService.applyTokens() pour ne pas dupliquer la logique de mapping token → CSS.
    this.settingsForm.valueChanges.subscribe(() => {
      const primaryColor = this.settingsForm.get('primaryColor')?.value;
      const primaryColorStrong = this.settingsForm.get('primaryColorStrong')?.value;
      if (HEX_COLOR_PATTERN.test(primaryColor) && HEX_COLOR_PATTERN.test(primaryColorStrong)) {
        this.appSettingsService.applyTokens({ primaryColor, primaryColorStrong });
      }
    });
  }

  onSubmit(): void {
    if (this.settingsForm.invalid) return;
    const value = this.settingsForm.value;
    const payload = { ...value, logoUrl: value.logoUrl?.trim() ? value.logoUrl.trim() : null };
    this.appSettingsService.updateSettings(payload).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({ message: 'Personnalisation enregistrée', duration: 3000, color: 'success' });
        toast.present();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({ message: 'Erreur lors de la sauvegarde', duration: 3000, color: 'danger' });
        toast.present();
      },
    });
  }

  onCancel(): void {
    if (this.loadedColors) {
      this.appSettingsService.applyTokens(this.loadedColors);
    }
    this.router.navigate(['/admin']);
  }
}
