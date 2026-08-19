import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { hexToHsl, hslToHex, hexToRgbString } from '../utils/color-utils';

export type AppTheme = 'dark' | 'light' | 'system';

/**
 * Interface defining customizable application theme colors.
 */
export interface CustomThemeColors {
  /** Primary accent color (hex string e.g. #6C7FE8). */
  primary: string;
  /** Dark mode background color (hex string e.g. #0F0F1A). */
  bgDark: string;
  /** Dark mode surface container color (hex string e.g. #1A1A2E). */
  surfaceDark: string;
  /** Light mode background color (hex string e.g. #F8FAFC). */
  bgLight: string;
  /** Light mode surface container color (hex string e.g. #FFFFFF). */
  surfaceLight: string;
  /** Admin role color. */
  roleAdmin: string;
  /** Manager role color. */
  roleManager: string;
  /** Serveur role color. */
  roleServeur: string;
  /** Barman role color. */
  roleBarman: string;
}

/** Predefined Figma Design System default color tokens. */
export const DEFAULT_FIGMA_PALETTE: CustomThemeColors = {
  primary: '#6C7FE8',
  bgDark: '#0F0F1A',
  surfaceDark: '#1A1A2E',
  bgLight: '#F8FAFC',
  surfaceLight: '#FFFFFF',
  roleAdmin: '#9B8AF2',
  roleManager: '#F0A33B',
  roleServeur: '#34C77B',
  roleBarman: '#4FC3F7',
};

/** Predefined theme presets available in the Admin Color Customizer. */
export const THEME_PRESETS: Record<string, { name: string; colors: CustomThemeColors }> = {
  figma: {
    name: 'Figma Default',
    colors: DEFAULT_FIGMA_PALETTE,
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    colors: {
      primary: '#FF007F',
      bgDark: '#0A0017',
      surfaceDark: '#16002C',
      bgLight: '#FAF5FF',
      surfaceLight: '#FFFFFF',
      roleAdmin: '#C084FC',
      roleManager: '#FBBF24',
      roleServeur: '#34D399',
      roleBarman: '#38BDF8',
    },
  },
  emerald: {
    name: 'Emerald Pub',
    colors: {
      primary: '#10B981',
      bgDark: '#061D15',
      surfaceDark: '#0E2F24',
      bgLight: '#F0FDF4',
      surfaceLight: '#FFFFFF',
      roleAdmin: '#A7F3D0',
      roleManager: '#F59E0B',
      roleServeur: '#10B981',
      roleBarman: '#06B6D4',
    },
  },
  sunset: {
    name: 'Sunset Amber',
    colors: {
      primary: '#F59E0B',
      bgDark: '#1C120C',
      surfaceDark: '#2C1D14',
      bgLight: '#FFFBEB',
      surfaceLight: '#FFFFFF',
      roleAdmin: '#F472B6',
      roleManager: '#F59E0B',
      roleServeur: '#10B981',
      roleBarman: '#60A5FA',
    },
  },
  indigo: {
    name: 'Modern Indigo',
    colors: {
      primary: '#6366F1',
      bgDark: '#0F172A',
      surfaceDark: '#1E293B',
      bgLight: '#F8FAFC',
      surfaceLight: '#FFFFFF',
      roleAdmin: '#818CF8',
      roleManager: '#F59E0B',
      roleServeur: '#10B981',
      roleBarman: '#38BDF8',
    },
  },
};

/**
 * Service managing global application theme preferences (Dark, Light, System)
 * and interactive color customization / dynamic CSS variable injection.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'openbar_theme_preference';
  private readonly COLORS_KEY = 'openbar_custom_colors';

  private readonly themeSubject = new BehaviorSubject<AppTheme>('dark');
  public readonly theme$: Observable<AppTheme> = this.themeSubject.asObservable();

  private readonly customColorsSubject = new BehaviorSubject<CustomThemeColors>(DEFAULT_FIGMA_PALETTE);
  public readonly customColors$: Observable<CustomThemeColors> = this.customColorsSubject.asObservable();

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as AppTheme | null;
    const initialTheme = savedTheme ?? 'dark';

    const savedColorsJson = localStorage.getItem(this.COLORS_KEY);
    if (savedColorsJson) {
      try {
        const parsedColors: CustomThemeColors = JSON.parse(savedColorsJson);
        this.customColorsSubject.next({ ...DEFAULT_FIGMA_PALETTE, ...parsedColors });
      } catch {
        this.customColorsSubject.next(DEFAULT_FIGMA_PALETTE);
      }
    }

    this.setTheme(initialTheme);
  }

  /**
   * Sets the theme preference ('dark', 'light', 'system').
   */
  setTheme(theme: AppTheme): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyThemeToDOM(theme);
  }

  /**
   * Toggles theme between dark and light mode.
   */
  toggleTheme(): AppTheme {
    const current = this.themeSubject.value;
    const nextTheme: AppTheme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
    return nextTheme;
  }

  /** Gets current theme preference. */
  get currentTheme(): AppTheme {
    return this.themeSubject.value;
  }

  /** Checks if active mode is dark. */
  get isDark(): boolean {
    return this.themeSubject.value === 'dark';
  }

  /** Checks if active mode is light. */
  get isLight(): boolean {
    return this.themeSubject.value === 'light';
  }

  /** Gets current active custom theme colors. */
  get currentCustomColors(): CustomThemeColors {
    return this.customColorsSubject.value;
  }

  /**
   * Updates custom theme colors, saves to localStorage, and updates DOM variables.
   */
  setCustomColors(colors: CustomThemeColors): void {
    this.customColorsSubject.next(colors);
    localStorage.setItem(this.COLORS_KEY, JSON.stringify(colors));
    this.applyThemeToDOM(this.themeSubject.value);
  }

  /**
   * Applies a predefined theme preset by key.
   */
  applyPreset(presetKey: string): void {
    const preset = THEME_PRESETS[presetKey];
    if (preset) {
      this.setCustomColors(preset.colors);
    }
  }

  /**
   * Resets custom colors to default Figma design system palette.
   */
  resetToDefaultColors(): void {
    localStorage.removeItem(this.COLORS_KEY);
    this.customColorsSubject.next(DEFAULT_FIGMA_PALETTE);
    this.applyThemeToDOM(this.themeSubject.value);
  }

  /**
   * Automatically generates a complete, harmonious 9-color palette from a single base primary HEX color.
   */
  generatePaletteFromPrimary(baseHex: string): CustomThemeColors {
    const hsl = hexToHsl(baseHex);

    const roleAdmin = hslToHex((hsl.h + 40) % 360, Math.min(85, hsl.s + 10), Math.min(75, hsl.l + 5));
    const roleManager = hslToHex((hsl.h + 120) % 360, 85, 60);
    const roleServeur = hslToHex((hsl.h + 200) % 360, 75, 50);
    const roleBarman = hslToHex((hsl.h + 280) % 360, 85, 65);

    const bgDark = hslToHex(hsl.h, 25, 8);
    const surfaceDark = hslToHex(hsl.h, 25, 14);
    const bgLight = hslToHex(hsl.h, 20, 97);
    const surfaceLight = '#FFFFFF';

    return {
      primary: baseHex.toUpperCase(),
      bgDark,
      surfaceDark,
      bgLight,
      surfaceLight,
      roleAdmin,
      roleManager,
      roleServeur,
      roleBarman,
    };
  }

  /**
   * Applies theme CSS class and injects custom color CSS variables into document.documentElement.
   */
  private applyThemeToDOM(theme: AppTheme): void {
    const body = document.body;
    body.classList.remove('dark-theme', 'light-theme');

    let isEffectiveDark = true;
    if (theme === 'light') {
      body.classList.add('light-theme');
      isEffectiveDark = false;
    } else if (theme === 'dark') {
      body.classList.add('dark-theme');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
      body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
      isEffectiveDark = prefersDark;
    }

    const colors = this.customColorsSubject.value;
    const targetElements = [document.documentElement, document.body];
    const primaryRgb = hexToRgbString(colors.primary);

    for (const el of targetElements) {
      const style = el.style;

      style.setProperty('--primary', colors.primary);
      style.setProperty('--primary-rgb', primaryRgb);
      style.setProperty('--primary-strong', this.adjustBrightness(colors.primary, -15));
      style.setProperty('--primary-light', isEffectiveDark
        ? this.adjustBrightness(colors.primary, +20)
        : this.adjustBrightness(colors.primary, -20)
      );
      style.setProperty('--primary-tint', colors.primary + '33');
      style.setProperty('--primary-tint-weak', colors.primary + '1f');
      style.setProperty('--primary-border', colors.primary + '73');

      style.setProperty('--role-admin', colors.roleAdmin);
      style.setProperty('--role-manager', colors.roleManager);
      style.setProperty('--role-serveur', colors.roleServeur);
      style.setProperty('--role-barman', colors.roleBarman);

      if (isEffectiveDark) {
        const bg0 = colors.bgDark;
        const bg1 = this.adjustBrightness(colors.bgDark, +4);
        const surf1 = colors.surfaceDark;
        const surf2 = this.adjustBrightness(colors.surfaceDark, +6);
        const surf3 = this.adjustBrightness(colors.surfaceDark, +12);

        style.setProperty('--bg-0', bg0);
        style.setProperty('--bg-1', bg1);
        style.setProperty('--surface-1', surf1);
        style.setProperty('--surface-2', surf2);
        style.setProperty('--surface-3', surf3);

        style.setProperty('--background-bg-0', bg0);
        style.setProperty('--background-bg-1', bg1);
        style.setProperty('--background-surface-1', surf1);
        style.setProperty('--background-surface-2', surf2);
        style.setProperty('--background-surface-3', surf3);
      } else {
        const bg0 = colors.bgLight;
        const bg1 = this.adjustBrightness(colors.bgLight, -3);
        const surf1 = colors.surfaceLight;
        const surf2 = this.adjustBrightness(colors.bgLight, -5);
        const surf3 = this.adjustBrightness(colors.bgLight, -10);

        style.setProperty('--bg-0', bg0);
        style.setProperty('--bg-1', bg1);
        style.setProperty('--surface-1', surf1);
        style.setProperty('--surface-2', surf2);
        style.setProperty('--surface-3', surf3);

        style.setProperty('--background-bg-0', bg0);
        style.setProperty('--background-bg-1', bg1);
        style.setProperty('--background-surface-1', surf1);
        style.setProperty('--background-surface-2', surf2);
        style.setProperty('--background-surface-3', surf3);
      }
    }
  }

  private adjustBrightness(hex: string, percent: number): string {
    const hsl = hexToHsl(hex);
    const newL = Math.max(0, Math.min(100, hsl.l + percent));
    return hslToHex(hsl.h, hsl.s, newL);
  }
}
