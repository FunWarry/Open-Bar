import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppSettings, AppSettingsUpdateRequest } from '../models/app-settings.model';

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly api = `${environment.apiUrl}/settings`;
  private readonly http = inject(HttpClient);

  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.api).pipe(tap(settings => this.applyTokens(settings)));
  }

  updateSettings(request: AppSettingsUpdateRequest): Observable<AppSettings> {
    return this.http.put<AppSettings>(this.api, request).pipe(tap(settings => this.applyTokens(settings)));
  }

  /** Injects custom branding colors as CSS custom properties over default tokens. */
  applyTokens(settings: Pick<AppSettings, 'primaryColor' | 'primaryColorStrong'>): void {
    const root = document.documentElement;
    root.style.setProperty('--primary', settings.primaryColor);
    root.style.setProperty('--primary-strong', settings.primaryColorStrong);
    // --ion-color-primary-rgb powers Ionic ripple, focus, disabled effects
    // which use rgba(var(--ion-color-primary-rgb), alpha) — must stay synced with --primary.
    root.style.setProperty('--ion-color-primary-rgb', this.hexToRgb(settings.primaryColor));
  }

  private hexToRgb(hex: string): string {
    const match = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
    if (!match) return '108, 127, 232'; // fallback = default design system primary color
    const [r, g, b] = match.slice(1).map(channel => Number.parseInt(channel, 16));
    return `${r}, ${g}, ${b}`;
  }
}
