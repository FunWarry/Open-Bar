import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ModalController, ToastController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';
import { Subscription, interval } from 'rxjs';
import { selectIsAuthenticated } from '../store/auth.selectors';
import { logout } from '../store/auth.actions';
import { AuthService } from './auth.service';
import { SessionTimeoutModalComponent } from '../components/ui/session-timeout-modal/session-timeout-modal.component';

/**
 * Service managing user session duration, 4-hour automatic disconnection,
 * and interactive warning prompts allowing users to extend their session.
 */
@Injectable({
  providedIn: 'root',
})
export class SessionTimeoutService {
  /** Default session duration (4 hours in milliseconds) */
  readonly DEFAULT_SESSION_DURATION_MS = 4 * 60 * 60 * 1000;

  /** Warning threshold before expiration (5 minutes in milliseconds) */
  readonly WARNING_THRESHOLD_MS = 5 * 60 * 1000;

  /** LocalStorage key for session start timestamp */
  readonly SESSION_START_KEY = 'auth_session_start';

  /** LocalStorage key for session expiry timestamp */
  readonly SESSION_EXPIRY_KEY = 'auth_session_expiry';

  private readonly authService = inject(AuthService);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  private monitorSub: Subscription | null = null;
  private isWarningModalOpen = false;
  private warningModal: HTMLIonModalElement | null = null;

  /**
   * Initializes session timeout tracking and reactive auth state listening.
   */
  init(): void {
    this.store.select(selectIsAuthenticated).subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.handleAuthenticatedState();
      } else {
        this.stopMonitoring();
      }
    });
  }

  /**
   * Starts a new session countdown or resets the expiration deadline.
   *
   * @param durationMs Duration in milliseconds (defaults to 4 hours)
   */
  startSession(durationMs: number = this.DEFAULT_SESSION_DURATION_MS): void {
    const now = Date.now();
    localStorage.setItem(this.SESSION_START_KEY, String(now));
    localStorage.setItem(this.SESSION_EXPIRY_KEY, String(now + durationMs));
    this.startMonitoring();
  }

  /**
   * Extends the current session by an additional duration (default 4 hours),
   * proactively refreshes backend tokens if available, and dismisses warning dialog.
   *
   * @param durationMs Additional duration in milliseconds (defaults to 4 hours)
   */
  extendSession(durationMs: number = this.DEFAULT_SESSION_DURATION_MS): void {
    const now = Date.now();
    localStorage.setItem(this.SESSION_EXPIRY_KEY, String(now + durationMs));

    if (this.warningModal) {
      this.warningModal.dismiss({ action: 'dismissed' });
      this.warningModal = null;
    }
    this.isWarningModalOpen = false;

    // Proactively refresh backend token if refresh token is available
    if (this.authService.getRefreshToken()) {
      this.authService.refreshToken().subscribe({
        error: (err) => console.warn('[SessionTimeoutService] Background token refresh warning:', err),
      });
    }

    this.showToast(this.transloco.translate('SESSION.EXTENDED_SUCCESS'), 'success');
  }

  /**
   * Returns remaining milliseconds before session expiration.
   */
  getRemainingTimeMs(): number {
    const expiryStr = localStorage.getItem(this.SESSION_EXPIRY_KEY);
    if (!expiryStr) return 0;
    const expiry = Number(expiryStr);
    return Math.max(0, expiry - Date.now());
  }

  /**
   * Terminates the active session immediately due to expiration or user action.
   */
  async expireSession(): Promise<void> {
    this.stopMonitoring();

    if (this.warningModal) {
      await this.warningModal.dismiss({ action: 'dismissed' });
      this.warningModal = null;
    }
    this.isWarningModalOpen = false;

    localStorage.removeItem(this.SESSION_START_KEY);
    localStorage.removeItem(this.SESSION_EXPIRY_KEY);

    this.authService.logout();
    this.store.dispatch(logout());

    await this.router.navigate(['/auth/login']);
    await this.showToast(this.transloco.translate('SESSION.EXPIRED_DISCONNECTED'), 'warning');
  }

  private handleAuthenticatedState(): void {
    const expiryStr = localStorage.getItem(this.SESSION_EXPIRY_KEY);
    if (!expiryStr) {
      this.startSession();
      return;
    }

    const remaining = Number(expiryStr) - Date.now();
    if (remaining <= 0) {
      this.expireSession();
    } else {
      this.startMonitoring();
    }
  }

  private startMonitoring(): void {
    this.stopMonitoring();
    this.monitorSub = interval(1000).subscribe(() => {
      this.checkSessionStatus();
    });
  }

  private stopMonitoring(): void {
    if (this.monitorSub) {
      this.monitorSub.unsubscribe();
      this.monitorSub = null;
    }
  }

  private checkSessionStatus(): void {
    const remainingMs = this.getRemainingTimeMs();

    if (remainingMs <= 0) {
      this.expireSession();
      return;
    }

    if (remainingMs <= this.WARNING_THRESHOLD_MS && !this.isWarningModalOpen) {
      this.presentWarningModal(Math.floor(remainingMs / 1000));
    }
  }

  private async presentWarningModal(remainingSeconds: number): Promise<void> {
    if (this.isWarningModalOpen) return;
    this.isWarningModalOpen = true;

    this.warningModal = await this.modalCtrl.create({
      component: SessionTimeoutModalComponent,
      componentProps: { remainingSeconds },
      backdropDismiss: false,
      cssClass: 'session-timeout-modal-container',
    });

    await this.warningModal.present();
    const { data } = await this.warningModal.onWillDismiss();
    this.isWarningModalOpen = false;
    this.warningModal = null;

    if (data?.action === 'extend') {
      this.extendSession();
    } else if (data?.action === 'logout' || data?.action === 'expired') {
      this.expireSession();
    }
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
