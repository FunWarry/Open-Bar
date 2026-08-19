import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppSettings, AppSettingsUpdateRequest } from '../models/app-settings.model';
import { WebSocketService } from './websocket.service';

/**
 * Service managing establishment branding, customization, and operational alert thresholds.
 * Emits reactive settings updates via STOMP WebSocket topics and REST API.
 */
@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly api = `${environment.apiUrl}/settings`;
  private readonly http = inject(HttpClient);
  private readonly ws = inject(WebSocketService, { optional: true });

  private readonly currentSettings$ = new BehaviorSubject<AppSettings | null>(null);

  /** Observable stream of current establishment settings. */
  readonly settings$ = this.currentSettings$.asObservable();

  /** Current snapshot of settings. */
  get currentSettings(): AppSettings | null {
    return this.currentSettings$.getValue();
  }

  constructor() {
    this.initWebSocketSubscription();
  }

  private initWebSocketSubscription(): void {
    if (!this.ws) return;

    this.ws.watch('/topic/app-settings').subscribe(msg => {
      try {
        const data = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
        if (data) {
          this.currentSettings$.next(data);
          this.applyTokens(data);
        }
      } catch {
        // Safe fallback for malformed messages
      }
    });

    this.ws.watch('/topic/settings').subscribe(msg => {
      try {
        const data = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
        if (data) {
          this.currentSettings$.next(data);
          this.applyTokens(data);
        }
      } catch {
        // Safe fallback for malformed messages
      }
    });
  }

  /**
   * Retrieves the current establishment settings from backend REST endpoint.
   * Updates internal reactive stream and applies branding tokens.
   */
  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.api).pipe(
      tap(settings => {
        this.currentSettings$.next(settings);
        this.applyTokens(settings);
      })
    );
  }

  /**
   * Updates establishment settings and operational alert thresholds.
   *
   * @param request Update request payload
   */
  updateSettings(request: AppSettingsUpdateRequest): Observable<AppSettings> {
    return this.http.put<AppSettings>(this.api, request).pipe(
      tap(settings => {
        this.currentSettings$.next(settings);
        this.applyTokens(settings);
      })
    );
  }

  /**
   * Injects custom branding colors as CSS custom properties over default tokens.
   */
  applyTokens(settings: Pick<AppSettings, 'primaryColor' | 'primaryColorStrong'>): void {
    if (!settings?.primaryColor) return;
    const root = document.documentElement;
    root.style.setProperty('--primary', settings.primaryColor);
    if (settings.primaryColorStrong) {
      root.style.setProperty('--primary-strong', settings.primaryColorStrong);
    }
    root.style.setProperty('--ion-color-primary-rgb', this.hexToRgb(settings.primaryColor));
  }

  private hexToRgb(hex: string): string {
    const match = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
    if (!match) return '108, 127, 232';
    const [r, g, b] = match.slice(1).map(channel => Number.parseInt(channel, 16));
    return `${r}, ${g}, ${b}`;
  }
}
