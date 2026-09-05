import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
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
  private readonly http = inject(HttpClient, { optional: true });
  private readonly ws = inject(WebSocketService, { optional: true });

  private readonly currentSettings$ = new BehaviorSubject<AppSettings | null>(null);

  /** Observable stream of current establishment settings. */
  readonly settings$ = this.currentSettings$.asObservable();

  /** Current snapshot of settings. */
  get currentSettings(): AppSettings | null {
    return this.currentSettings$.getValue();
  }

  /** Current configured establishment currency ISO code (default: 'EUR'). */
  get currencyCode(): string {
    return this.currentSettings?.currencyCode || 'EUR';
  }

  /** Current configured establishment currency symbol (default: '€'). */
  get currencySymbol(): string {
    return this.currentSettings?.currencySymbol || '€';
  }

  /** Current configured establishment currency symbol position (default: 'AFTER'). */
  get currencyPosition(): 'BEFORE' | 'AFTER' {
    return this.currentSettings?.currencyPosition || 'AFTER';
  }

  /**
   * Formats a monetary amount using configured establishment currency symbol and position.
   *
   * @param amount The numeric amount to format
   * @param minFractionDigits Minimum fraction digits (default: 2)
   * @param maxFractionDigits Maximum fraction digits (default: 2)
   * @returns Formatted currency string
   */
  formatCurrency(amount: number | null | undefined, minFractionDigits: number = 2, maxFractionDigits: number = 2): string {
    const numericAmount = (amount == null || Number.isNaN(Number(amount))) ? 0 : Number(amount);
    const symbol = this.currencySymbol;
    const pos = this.currencyPosition;
    const formattedNumber = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits
    }).format(numericAmount);

    if (pos === 'BEFORE') {
      return `${symbol} ${formattedNumber}`;
    }
    return `${formattedNumber} ${symbol}`;
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
      } catch (err) {
        console.error('Failed to parse WebSocket app settings message:', err);
      }
    });

    this.ws.watch('/topic/settings').subscribe(msg => {
      try {
        const data = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
        if (data) {
          this.currentSettings$.next(data);
          this.applyTokens(data);
        }
      } catch (err) {
        console.error('Failed to parse legacy WebSocket settings message:', err);
      }
    });
  }

  /**
   * Retrieves the current establishment settings from backend REST endpoint.
   * Updates internal reactive stream and applies branding tokens.
   */
  getSettings(): Observable<AppSettings> {
    if (!this.http) {
      const fallback: AppSettings = this.currentSettings || {
        id: 1,
        primaryColor: '#6c7fe8',
        primaryColorStrong: '#5a68d6',
        logoUrl: null,
        establishmentName: 'OpenBar',
        defaultTheme: 'DARK',
        currencyCode: 'EUR',
        currencySymbol: '€',
        currencyPosition: 'AFTER',
        tempsAlerteWarningMinutes: 3,
        tempsAlerteCommandeMinutes: 5,
        tempsAlerteCritiqueCommandeMinutes: 10,
        updatedAt: null,
      };
      return of(fallback);
    }
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
    if (!this.http) {
      const fallback: AppSettings = {
        ...(this.currentSettings || {
          id: 1,
          primaryColor: '#6c7fe8',
          primaryColorStrong: '#5a68d6',
          logoUrl: null,
          establishmentName: 'OpenBar',
          defaultTheme: 'DARK',
          currencyCode: 'EUR',
          currencySymbol: '€',
          currencyPosition: 'AFTER',
          tempsAlerteWarningMinutes: 3,
          tempsAlerteCommandeMinutes: 5,
          tempsAlerteCritiqueCommandeMinutes: 10,
          updatedAt: null,
        }),
        ...request,
      };
      return of(fallback);
    }
    return this.http.put<AppSettings>(this.api, request).pipe(
      tap(settings => {
        this.currentSettings$.next(settings);
        this.applyTokens(settings);
      })
    );
  }

  /**
   * Returns the direct API URL for establishment Wi-Fi pairing QR code (PNG or SVG).
   *
   * @param format Output format ('PNG' | 'SVG')
   * @param size Pixel resolution/size
   */
  getWifiQrCodeUrl(format: 'PNG' | 'SVG' = 'PNG', size: number = 300): string {
    return `${this.api}/wifi/qrcode?format=${format}&size=${size}`;
  }

  /**
   * Downloads the establishment Wi-Fi pairing QR code as a raw Blob.
   *
   * @param format Output format ('PNG' | 'SVG')
   * @param size Pixel resolution/size
   */
  downloadWifiQrCode(format: 'PNG' | 'SVG' = 'PNG', size: number = 300): Observable<Blob> {
    if (!this.http) {
      return of(new Blob([], { type: format === 'SVG' ? 'image/svg+xml' : 'image/png' }));
    }
    const params = new HttpParams()
      .set('format', format)
      .set('size', size.toString());
    return this.http.get(`${this.api}/wifi/qrcode`, {
      params,
      responseType: 'blob'
    });
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
