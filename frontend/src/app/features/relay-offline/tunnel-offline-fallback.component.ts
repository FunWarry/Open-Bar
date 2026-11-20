import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cloudOfflineOutline,
  wifiOutline,
  refreshOutline,
  restaurantOutline,
  copyOutline,
  checkmarkOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { BrandLogoComponent } from '../../core/components/ui/brand-logo/brand-logo.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { WhiteLabelBrandingService } from '../../core/services/white-label-branding.service';
import { CloudRelayService } from '../../core/services/cloud-relay.service';

const RETRY_INTERVAL_SECONDS = 15;

/**
 * Graceful offline fallback screen displayed when a patron or staff user accesses
 * the establishment via a Cloud Relay subdomain or custom CNAME while the venue's
 * local internet connection or outbound tunnel is temporarily unavailable.
 */
@Component({
  selector: 'app-tunnel-offline-fallback',
  templateUrl: './tunnel-offline-fallback.component.html',
  styleUrls: ['./tunnel-offline-fallback.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    TranslocoModule,
    IonIcon,
    BrandLogoComponent,
    ActionButtonComponent
  ]
})
export class TunnelOfflineFallbackComponent implements OnInit, OnDestroy {
  readonly brandingService = inject(WhiteLabelBrandingService);
  private readonly cloudRelayService = inject(CloudRelayService);
  private readonly router = inject(Router);

  readonly countdown = signal<number>(RETRY_INTERVAL_SECONDS);
  readonly isChecking = signal<boolean>(false);
  readonly copiedWifi = signal<boolean>(false);

  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    addIcons({
      cloudOfflineOutline,
      wifiOutline,
      refreshOutline,
      restaurantOutline,
      copyOutline,
      checkmarkOutline,
      arrowBackOutline
    });
  }

  ngOnInit(): void {
    this.brandingService.loadBranding().subscribe();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Probes the Cloud Relay health endpoint immediately and navigates back to the app
   * when tunnel connectivity is restored.
   */
  retryConnection(): void {
    if (this.isChecking()) {
      return;
    }
    this.isChecking.set(true);
    this.cloudRelayService.checkRelayHealth().subscribe({
      next: (health) => {
        this.isChecking.set(false);
        this.countdown.set(RETRY_INTERVAL_SECONDS);
        if (health?.tunnelConnected) {
          this.cloudRelayService.clearTunnelOffline();
          void this.router.navigate(['/client/commande']);
        }
      },
      error: () => {
        this.isChecking.set(false);
        this.countdown.set(RETRY_INTERVAL_SECONDS);
      }
    });
  }

  /**
   * Copies the venue Wi-Fi SSID to clipboard to help patrons join the local bar network.
   */
  copyWifiSsid(): void {
    const ssid = this.brandingService.wifiSsid();
    if (!ssid || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    void navigator.clipboard.writeText(ssid).then(() => {
      this.copiedWifi.set(true);
      setTimeout(() => this.copiedWifi.set(false), 2000);
    });
  }

  /**
   * Navigates directly to the local fallback menu URL if the user switched to venue Wi-Fi.
   */
  openLocalFallback(): void {
    const target = this.brandingService.localFallbackUrl();
    if (typeof window !== 'undefined' && target) {
      window.location.href = target;
    }
  }

  private startCountdown(): void {
    this.timerId = setInterval(() => {
      const nextVal = this.countdown() - 1;
      if (nextVal <= 0) {
        this.retryConnection();
      } else {
        this.countdown.set(nextVal);
      }
    }, 1000);
  }
}
