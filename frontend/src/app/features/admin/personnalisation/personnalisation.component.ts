import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { NgIf } from '@angular/common';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption,
} from '@ionic/angular/standalone';
import { AppSettingsService } from '../../../core/services/app-settings.service';

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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController,
    private appSettingsService: AppSettingsService,
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

    // Aperçu live des couleurs avant sauvegarde (cf. spec CDC #153)
    ['primaryColor', 'primaryColorStrong'].forEach(field => {
      this.settingsForm.get(field)?.valueChanges.subscribe(value => {
        if (HEX_COLOR_PATTERN.test(value)) {
          document.documentElement.style.setProperty(
            field === 'primaryColor' ? '--primary' : '--primary-strong',
            value,
          );
        }
      });
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

  onCancel(): void { this.router.navigate(['/admin']); }
}
