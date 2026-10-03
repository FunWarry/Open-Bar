import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ThemeCustomizerComponent } from './theme-customizer.component';

/**
 * Standalone Theme Configuration page accessible to all authenticated staff members.
 * Enables bartenders, servers, managers, and admins to customize terminal UI themes,
 * choose presets, auto-generate palettes, and preview live styles.
 */
@Component({
  selector: 'app-theme-page',
  standalone: true,
  imports: [ThemeCustomizerComponent],
  template: `<app-theme-customizer [isPage]="true"></app-theme-customizer>`,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ThemePageComponent {}
