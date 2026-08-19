import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonIcon, IonSpinner, IonRange,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  timerOutline, timeOutline, alertCircleOutline, flashOutline,
  saveOutline, refreshOutline, volumeHighOutline, checkmarkCircleOutline,
  warningOutline, speedometerOutline, informationCircleOutline
} from 'ionicons/icons';

import { AppSettingsService } from '../../../../core/services/app-settings.service';
import { SoundService } from '../../../../core/services/sound.service';
import { AppSettings, AppSettingsUpdateRequest } from '../../../../core/models/app-settings.model';

/**
 * Custom cross-field validator enforcing strict ascending order:
 * Warning threshold < Urgent threshold < Critical threshold.
 */
export function thresholdHierarchyValidator(group: AbstractControl): ValidationErrors | null {
  const warning = group.get('tempsAlerteWarningMinutes')?.value;
  const urgent = group.get('tempsAlerteCommandeMinutes')?.value;
  const critical = group.get('tempsAlerteCritiqueCommandeMinutes')?.value;

  if (warning == null || urgent == null || critical == null) return null;

  const w = Number(warning);
  const u = Number(urgent);
  const c = Number(critical);

  if (w >= u || u >= c) {
    return { invalidThresholdHierarchy: true };
  }
  return null;
}

/** Predefined pace presets for quick setup. */
export interface PacePreset {
  id: 'fast' | 'standard' | 'lounge';
  labelKey: string;
  warning: number;
  urgent: number;
  critical: number;
}

/**
 * Component for configuring order preparation timers and multi-tier alert thresholds.
 * Provides interactive sliders/steppers, presets, live ticket preview, and browser audio synthesis tests.
 */
@Component({
  selector: 'app-order-timers-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslocoModule,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonIcon, IonSpinner, IonRange
  ],
  templateUrl: './order-timers-settings.component.html',
  styleUrls: ['./order-timers-settings.component.scss']
})
export class OrderTimersSettingsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly soundService = inject(SoundService);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  timersForm!: FormGroup;
  currentSettings: AppSettings | null = null;
  isLoading = false;
  isSaving = false;

  /** Simulated elapsed order wait time in minutes for the live preview card. */
  simulatedMinutes = signal<number>(4);

  readonly presets: PacePreset[] = [
    { id: 'fast', labelKey: 'ORDER_TIMERS.PACE_FAST', warning: 2, urgent: 4, critical: 7 },
    { id: 'standard', labelKey: 'ORDER_TIMERS.PACE_STANDARD', warning: 3, urgent: 5, critical: 10 },
    { id: 'lounge', labelKey: 'ORDER_TIMERS.PACE_LOUNGE', warning: 5, urgent: 8, critical: 15 },
  ];

  constructor() {
    addIcons({
      timerOutline, timeOutline, alertCircleOutline, flashOutline,
      saveOutline, refreshOutline, volumeHighOutline, checkmarkCircleOutline,
      warningOutline, speedometerOutline, informationCircleOutline
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.timersForm = this.fb.group({
      tempsAlerteWarningMinutes: [3, [Validators.required, Validators.min(1), Validators.max(120)]],
      tempsAlerteCommandeMinutes: [5, [Validators.required, Validators.min(1), Validators.max(120)]],
      tempsAlerteCritiqueCommandeMinutes: [10, [Validators.required, Validators.min(1), Validators.max(120)]],
    }, { validators: thresholdHierarchyValidator });
  }

  /**
   * Loads current establishment settings from backend.
   */
  loadSettings(): void {
    this.isLoading = true;
    this.appSettingsService.getSettings()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: settings => {
          this.currentSettings = settings;
          this.timersForm.patchValue({
            tempsAlerteWarningMinutes: settings.tempsAlerteWarningMinutes ?? 3,
            tempsAlerteCommandeMinutes: settings.tempsAlerteCommandeMinutes ?? 5,
            tempsAlerteCritiqueCommandeMinutes: settings.tempsAlerteCritiqueCommandeMinutes ?? 10,
          });
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('ORDER_TIMERS.LOAD_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          await toast.present();
        }
      });
  }

  /**
   * Adjusts a field value with bounded increment/decrement.
   *
   * @param field Control name
   * @param delta Step increment
   */
  adjustValue(field: string, delta: number): void {
    const control = this.timersForm.get(field);
    if (!control) return;
    const current = Number(control.value) || 1;
    const next = Math.max(1, Math.min(120, current + delta));
    control.setValue(next);
    control.markAsDirty();
  }

  /**
   * Applies one of the predefined establishment pace presets.
   *
   * @param preset Selected preset configuration
   */
  applyPreset(preset: PacePreset): void {
    this.timersForm.patchValue({
      tempsAlerteWarningMinutes: preset.warning,
      tempsAlerteCommandeMinutes: preset.urgent,
      tempsAlerteCritiqueCommandeMinutes: preset.critical,
    });
    this.timersForm.markAsDirty();
  }

  /**
   * Resets alert thresholds to standard defaults (3 / 5 / 10 min).
   */
  resetToDefaults(): void {
    this.timersForm.patchValue({
      tempsAlerteWarningMinutes: 3,
      tempsAlerteCommandeMinutes: 5,
      tempsAlerteCritiqueCommandeMinutes: 10,
    });
    this.timersForm.markAsDirty();
  }

  /**
   * Tests browser synthesized audio chime for new incoming order.
   */
  testNewOrderSound(): void {
    this.soundService.playNewOrderSound();
  }

  /**
   * Tests browser synthesized audio chime for ready order.
   */
  testOrderReadySound(): void {
    this.soundService.playOrderReadySound();
  }

  /**
   * Tests browser synthesized audio alert sequence for urgent/critical delay.
   */
  testUrgentAlertSound(): void {
    this.soundService.playUrgentAlertSound();
  }

  /**
   * Returns current threshold values from form or default fallback.
   */
  get warningThreshold(): number {
    return Number(this.timersForm.get('tempsAlerteWarningMinutes')?.value) || 3;
  }

  get urgentThreshold(): number {
    return Number(this.timersForm.get('tempsAlerteCommandeMinutes')?.value) || 5;
  }

  get criticalThreshold(): number {
    return Number(this.timersForm.get('tempsAlerteCritiqueCommandeMinutes')?.value) || 10;
  }

  /**
   * Computes severity status for the simulated preview card.
   */
  get simulatedSeverity(): 'normal' | 'warning' | 'urgent' | 'critical' {
    const mins = this.simulatedMinutes();
    if (mins >= this.criticalThreshold) return 'critical';
    if (mins >= this.urgentThreshold) return 'urgent';
    if (mins >= this.warningThreshold) return 'warning';
    return 'normal';
  }

  get simulatedBorderColor(): string {
    switch (this.simulatedSeverity) {
      case 'critical': return 'var(--semantic-danger)';
      case 'urgent': return 'var(--semantic-danger)';
      case 'warning': return 'var(--semantic-warning)';
      default: return 'var(--semantic-success)';
    }
  }

  /**
   * Submits updated threshold settings to backend REST API.
   */
  onSubmit(): void {
    if (this.timersForm.invalid) {
      this.timersForm.markAllAsTouched();
      return;
    }

    if (!this.currentSettings) return;

    this.isSaving = true;
    const formValue = this.timersForm.value;

    const request: AppSettingsUpdateRequest = {
      primaryColor: this.currentSettings.primaryColor,
      primaryColorStrong: this.currentSettings.primaryColorStrong,
      logoUrl: this.currentSettings.logoUrl,
      establishmentName: this.currentSettings.establishmentName,
      defaultTheme: this.currentSettings.defaultTheme,
      tempsAlerteWarningMinutes: Number(formValue.tempsAlerteWarningMinutes),
      tempsAlerteCommandeMinutes: Number(formValue.tempsAlerteCommandeMinutes),
      tempsAlerteCritiqueCommandeMinutes: Number(formValue.tempsAlerteCritiqueCommandeMinutes),
    };

    this.appSettingsService.updateSettings(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isSaving = false))
      )
      .subscribe({
        next: async updated => {
          this.currentSettings = updated;
          this.timersForm.reset({
            tempsAlerteWarningMinutes: updated.tempsAlerteWarningMinutes ?? 3,
            tempsAlerteCommandeMinutes: updated.tempsAlerteCommandeMinutes ?? 5,
            tempsAlerteCritiqueCommandeMinutes: updated.tempsAlerteCritiqueCommandeMinutes ?? 10,
          });
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('ORDER_TIMERS.SAVE_SUCCESS'),
            duration: 3000,
            color: 'success',
          });
          await toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('ORDER_TIMERS.SAVE_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          await toast.present();
        }
      });
  }
}
