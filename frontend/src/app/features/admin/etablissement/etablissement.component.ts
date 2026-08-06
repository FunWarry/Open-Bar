import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { CurrencyPipe } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon,
  IonSpinner, IonGrid, IonRow, IonCol, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { save, business, documentText, checkmarkCircle, time } from 'ionicons/icons';
import { EtablissementService } from '../../../core/services/etablissement.service';
import { EstablishmentConfig } from '../../../core/models/establishment-config.model';

/**
 * Custom validator for 14-digit French SIRET numbers using Luhn algorithm.
 */
export function siretLuhnValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  if (!/^\d{14}$/.test(value)) return { invalidSiretFormat: true };

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = Number.parseInt(value.charAt(i), 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0 ? null : { siretLuhnFailed: true };
}

/**
 * Standalone component for configuring legal establishment parameters (SIRET, TVA, RCS, address).
 */
@Component({
  selector: 'app-etablissement',
  templateUrl: './etablissement.component.html',
  styleUrls: ['./etablissement.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    TranslocoModule,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon,
    IonSpinner, IonGrid, IonRow, IonCol,
  ],
})
export class EtablissementComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly etablissementService = inject(EtablissementService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroy$ = new Subject<void>();

  configForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  timeZones: string[] = ['SYSTEM', 'Europe/Paris', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'UTC'];

  constructor() {
    addIcons({ save, business, documentText, checkmarkCircle, time });
  }

  ngOnInit(): void {
    this.initForm();
    this.loadTimeZones();
    this.loadConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.configForm = this.fb.group({
      legalName: ['', [Validators.required, Validators.maxLength(255)]],
      legalForm: ['SARL', [Validators.maxLength(50)]],
      siret: ['', [Validators.required, siretLuhnValidator]],
      rcsCity: ['Paris', [Validators.maxLength(100)]],
      rcsNumber: ['B 123 456 789', [Validators.maxLength(50)]],
      tvaNumber: ['', [Validators.required, Validators.pattern(/^FR[0-9A-Z]{2}\d{9}$/)]],
      codeApe: ['5630Z', [Validators.pattern(/^\d{4}[A-Z]$/)]],
      capitalSocial: [10000.00, [Validators.min(0)]],
      address: ['', [Validators.required, Validators.maxLength(500)]],
      phone: ['', [Validators.maxLength(50)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      paymentTerms: ['Paiement immédiat à réception', [Validators.maxLength(255)]],
      discountPolicy: ['Aucun escompte pour paiement anticipé', [Validators.maxLength(255)]],
      latePaymentRate: [0.12, [Validators.min(0), Validators.max(1)]],
      timeZone: ['SYSTEM', [Validators.maxLength(50)]],
      ticketFormat: ['80mm', [Validators.pattern(/^(80mm|58mm)$/)]],
    });
  }

  loadTimeZones(): void {
    this.etablissementService.getTimeZones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (zones) => {
          if (zones && zones.length > 0) {
            this.timeZones = zones;
          }
        },
        error: () => {
          // Keep default fallback timezones
        },
      });
  }


  loadConfig(): void {
    this.isLoading = true;
    this.etablissementService.getConfig()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (config) => {
          if (config) {
            this.configForm.patchValue(config);
          }
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du chargement des données légales',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  onSave(): void {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue: EstablishmentConfig = this.configForm.value;

    this.etablissementService.updateConfig(formValue)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isSaving = false))
      )
      .subscribe({
        next: async (updated) => {
          this.configForm.patchValue(updated);
          const toast = await this.toastCtrl.create({
            message: 'Paramètres légaux enregistrés avec succès',
            duration: 3000,
            color: 'success',
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Échec de l\'enregistrement des paramètres',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }
}
