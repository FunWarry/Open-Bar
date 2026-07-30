import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ToastController } from '@ionic/angular/standalone';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  colorPaletteOutline,
  sparklesOutline,
  refreshOutline,
  saveOutline,
  moonOutline,
  sunnyOutline,
  desktopOutline
} from 'ionicons/icons';

import { ThemeService, CustomThemeColors, THEME_PRESETS, AppTheme } from '../../../core/services/theme.service';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { RoleBadgeComponent } from '../../../core/components/ui/role-badge/role-badge.component';
import { StatusBadgeComponent } from '../../../core/components/ui/status-badge/status-badge.component';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Admin Theme Customizer Studio allowing interactive real-time editing of app colors,
 * automatic HSL color palette generation, theme presets, and dual dark/light mode customization.
 */
@Component({
  selector: 'app-personnalisation',
  templateUrl: './personnalisation.component.html',
  styleUrls: ['./personnalisation.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslocoModule,
    IonIcon,
    ActionButtonComponent,
    RoleBadgeComponent,
    StatusBadgeComponent
  ]
})
export class PersonnalisationComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);
  private readonly toastCtrl = inject(ToastController);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  colorForm!: FormGroup;
  activeTheme: AppTheme = 'dark';
  presets = Object.entries(THEME_PRESETS).map(([key, val]) => ({ key, name: val.name, colors: val.colors }));

  constructor() {
    addIcons({
      colorPaletteOutline,
      sparklesOutline,
      refreshOutline,
      saveOutline,
      moonOutline,
      sunnyOutline,
      desktopOutline
    });
  }

  ngOnInit(): void {
    this.activeTheme = this.themeService.currentTheme;
    const currentColors = this.themeService.currentCustomColors;

    this.colorForm = this.fb.group({
      primary: [currentColors.primary, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      bgDark: [currentColors.bgDark, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      surfaceDark: [currentColors.surfaceDark, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      bgLight: [currentColors.bgLight, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      surfaceLight: [currentColors.surfaceLight, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      roleAdmin: [currentColors.roleAdmin, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      roleManager: [currentColors.roleManager, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      roleServeur: [currentColors.roleServeur, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      roleBarman: [currentColors.roleBarman, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
    });

    // Real-time live preview update as admin changes color pickers
    this.colorForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(values => {
        if (this.colorForm.valid) {
          this.themeService.setCustomColors(values as CustomThemeColors);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Switches theme mode (Dark, Light, System).
   */
  onSetThemeMode(mode: AppTheme): void {
    this.activeTheme = mode;
    this.themeService.setTheme(mode);
  }

  /**
   * Applies a preset color palette.
   */
  onApplyPreset(key: string): void {
    const preset = THEME_PRESETS[key];
    if (preset) {
      this.colorForm.patchValue(preset.colors);
      this.themeService.applyPreset(key);
    }
  }

  /**
   * Automatically generates a full harmonious color palette from current Primary color.
   */
  onAutoGeneratePalette(): void {
    const currentPrimary = this.colorForm.get('primary')?.value || '#6C7FE8';
    if (HEX_COLOR_PATTERN.test(currentPrimary)) {
      const generated = this.themeService.generatePaletteFromPrimary(currentPrimary);
      this.colorForm.patchValue(generated);
      this.themeService.setCustomColors(generated);

      this.presentToast('Palette générée automatiquement avec succès !', 'success');
    }
  }

  /**
   * Resets colors to default Figma design system values.
   */
  onResetToDefault(): void {
    this.themeService.resetToDefaultColors();
    const defaults = this.themeService.currentCustomColors;
    this.colorForm.patchValue(defaults);
    this.presentToast('Couleurs réinitialisées aux valeurs Figma par défaut.', 'info');
  }

  /**
   * Saves and persists current customized palette.
   */
  async onSubmit(): Promise<void> {
    if (this.colorForm.invalid) return;
    const values = this.colorForm.value as CustomThemeColors;
    this.themeService.setCustomColors(values);
    await this.presentToast('Palette de couleurs enregistrée !', 'success');
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'info'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color });
    await toast.present();
  }
}
