import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  colorPaletteOutline,
  moonOutline,
  sunnyOutline,
  desktopOutline,
  sparklesOutline,
  refreshOutline,
  checkmarkOutline
} from 'ionicons/icons';

import {
  ThemeService,
  AppTheme,
  CustomThemeColors,
  THEME_PRESETS
} from '../../core/services/theme.service';
import { RoleBadgeComponent } from '../../core/components/ui/role-badge/role-badge.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { StatusBadgeComponent } from '../../core/components/ui/status-badge/status-badge.component';

const HEX_COLOR_PATTERN = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Universal theme customizer component allowing all staff members (servers, bartenders, managers, admins)
 * to configure application color themes, switch between dark/light/system modes, select presets,
 * generate harmonized palettes from a primary color, and preview changes in real time.
 */
@Component({
  selector: 'app-theme-customizer',
  standalone: true,
  templateUrl: './theme-customizer.component.html',
  styleUrls: ['./theme-customizer.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslocoModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    RoleBadgeComponent,
    ActionButtonComponent,
    StatusBadgeComponent
  ]
})
export class ThemeCustomizerComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);
  private readonly transloco = inject(TranslocoService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroy$ = new Subject<void>();

  /** Whether the customizer is displayed as a full dedicated page. */
  @Input() isPage = false;

  /** Emitted whenever the user modifies theme colors. */
  @Output() readonly themeChange = new EventEmitter<CustomThemeColors>();

  /** Active theme mode: 'dark' | 'light' | 'system'. */
  activeTheme: AppTheme = 'dark';

  /** Theme presets available in OpenBar. */
  readonly presets = Object.entries(THEME_PRESETS).map(([key, val]) => ({
    key,
    name: val.name,
    colors: val.colors
  }));

  /** Reactive form managing individual color hex values. */
  colorForm!: FormGroup;

  constructor() {
    addIcons({
      colorPaletteOutline,
      moonOutline,
      sunnyOutline,
      desktopOutline,
      sparklesOutline,
      refreshOutline,
      checkmarkOutline
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
      roleBarman: [currentColors.roleBarman, [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]]
    });

    this.colorForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((values) => {
        if (this.colorForm.valid) {
          const colors = values as CustomThemeColors;
          this.themeService.setCustomColors(colors);
          this.themeChange.emit(colors);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Switches the active theme mode ('dark', 'light', 'system').
   *
   * @param mode Selected theme mode
   */
  onSetThemeMode(mode: AppTheme): void {
    this.activeTheme = mode;
    this.themeService.setTheme(mode);
  }

  /**
   * Applies a predefined theme preset and syncs the color form.
   *
   * @param key Preset key identifier
   */
  onApplyPreset(key: string): void {
    const preset = THEME_PRESETS[key];
    if (preset) {
      this.colorForm.patchValue(preset.colors);
      this.themeService.applyPreset(key);
      this.themeChange.emit(preset.colors);
    }
  }

  /**
   * Checks whether a theme preset matches current primary color.
   *
   * @param key Preset key identifier
   * @returns true if preset is active
   */
  isPresetActive(key: string): boolean {
    const preset = THEME_PRESETS[key];
    if (!preset) return false;
    const formPrimary = this.colorForm?.get('primary')?.value;
    return formPrimary?.toUpperCase() === preset.colors.primary.toUpperCase();
  }

  /**
   * Generates a complete harmonious color palette based on the chosen primary color.
   */
  async onAutoGeneratePalette(): Promise<void> {
    const currentPrimary = this.colorForm.get('primary')?.value || '#6C7FE8';
    if (HEX_COLOR_PATTERN.test(currentPrimary)) {
      const generated = this.themeService.generatePaletteFromPrimary(currentPrimary);
      this.colorForm.patchValue(generated);
      this.themeService.setCustomColors(generated);
      this.themeChange.emit(generated);

      const toast = await this.toastCtrl.create({
        message: this.transloco.translate('THEME_CUSTOMIZER.AUTO_GEN_SUCCESS'),
        duration: 2500,
        color: 'success'
      });
      await toast.present();
    }
  }

  /**
   * Resets application colors to standard Figma default tokens.
   */
  async onResetToDefaultTheme(): Promise<void> {
    this.themeService.resetToDefaultColors();
    const defaults = this.themeService.currentCustomColors;
    this.colorForm.patchValue(defaults);
    this.themeChange.emit(defaults);

    const toast = await this.toastCtrl.create({
      message: this.transloco.translate('THEME_CUSTOMIZER.RESET_SUCCESS'),
      duration: 2500,
      color: 'info'
    });
    await toast.present();
  }
}
