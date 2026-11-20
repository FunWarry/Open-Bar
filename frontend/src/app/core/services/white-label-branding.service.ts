import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { PublicBranding } from '../models/cloud-relay.model';
import { CloudRelayService } from './cloud-relay.service';
import { ThemeService } from './theme.service';

const DEFAULT_PUBLIC_BRANDING: PublicBranding = {
  establishmentName: 'OpenBar',
  venueSlug: null,
  customDomain: null,
  primaryColor: '#6c7fe8',
  primaryColorStrong: '#5a68d6',
  logoUrl: null,
  bannerImageUrl: null,
  defaultTheme: 'DARK',
  cloudRelayEnabled: false,
  tunnelConnected: false,
  clientsEnabled: true,
  staffEnabled: true,
  effectivePublicUrl: 'https://openbar.lan',
  localFallbackUrl: 'https://openbar.local',
  wifiEnabled: false,
  wifiSsid: null,
};

/**
 * Service managing dynamic white-label establishment branding (venue name, logo, banner image,
 * primary accent theme colors, and fallback Wi-Fi metadata) across patron and login views.
 */
@Injectable({ providedIn: 'root' })
export class WhiteLabelBrandingService {
  private readonly cloudRelayService = inject(CloudRelayService);
  private readonly themeService = inject(ThemeService, { optional: true });

  /** Current loaded public white-label branding state. */
  readonly branding = signal<PublicBranding>(DEFAULT_PUBLIC_BRANDING);

  /** Display establishment name (defaults to 'OpenBar'). */
  readonly establishmentName = computed(() => this.branding().establishmentName || 'OpenBar');

  /** Custom venue logo URL if configured. */
  readonly logoUrl = computed(() => this.branding().logoUrl || null);

  /** Custom venue hero banner image URL if configured. */
  readonly bannerImageUrl = computed(() => this.branding().bannerImageUrl || null);

  /** Resolved effective public URL (custom CNAME, venue subdomain, or local URL). */
  readonly effectivePublicUrl = computed(() => this.branding().effectivePublicUrl || 'https://openbar.lan');

  /** Local Wi-Fi SSID for fallback notice when tunnel is offline. */
  readonly wifiSsid = computed(() => this.branding().wifiSsid || null);

  /** Whether local Wi-Fi credentials are configured for fallback notice. */
  readonly wifiEnabled = computed(() => this.branding().wifiEnabled);

  /** Local fallback URL (typically https://openbar.local). */
  readonly localFallbackUrl = computed(() => this.branding().localFallbackUrl || 'https://openbar.local');

  /** Whether Cloud Relay public tunnel is currently enabled and healthy. */
  readonly tunnelConnected = computed(() => this.branding().tunnelConnected);

  /**
   * Loads white-label branding from {@code /api/public/branding} and applies theme colors
   * and document title dynamically.
   */
  loadBranding(): Observable<PublicBranding | null> {
    return this.cloudRelayService.getPublicBranding().pipe(
      tap(loaded => {
        if (loaded) {
          this.applyBranding(loaded);
        }
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Applies the given branding configuration to reactive signals, CSS variables, and page title.
   *
   * @param data Public branding payload
   */
  applyBranding(data: PublicBranding): void {
    const merged: PublicBranding = { ...DEFAULT_PUBLIC_BRANDING, ...data };
    this.branding.set(merged);

    if (typeof document !== 'undefined') {
      if (merged.primaryColor) {
        document.documentElement.style.setProperty('--primary', merged.primaryColor);
        document.documentElement.style.setProperty('--ion-color-primary', merged.primaryColor);
      }
      if (merged.primaryColorStrong) {
        document.documentElement.style.setProperty('--primary-strong', merged.primaryColorStrong);
      }
      if (merged.establishmentName && merged.establishmentName !== 'OpenBar') {
        document.title = `${merged.establishmentName} — OpenBar`;
      }
    }

    if (this.themeService && merged.primaryColor) {
      const current = this.themeService.currentCustomColors;
      if (current.primary !== merged.primaryColor) {
        this.themeService.setCustomColors({ ...current, primary: merged.primaryColor });
      }
    }
  }
}
