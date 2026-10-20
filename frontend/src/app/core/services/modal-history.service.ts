import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import {
  ModalController,
  AlertController,
  ActionSheetController,
  PopoverController
} from '@ionic/angular';
import { NavigationService } from './navigation.service';

/**
 * Service managing browser and hardware back-button navigation for overlays and modals.
 *
 * Ensures that pressing the physical back button, browser back button, or swipe-back
 * gesture closes the topmost open modal, alert, or off-canvas drawer before navigating
 * away from the current page.
 */
@Injectable({
  providedIn: 'root'
})
export class ModalHistoryService implements OnDestroy {
  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly popoverCtrl = inject(PopoverController);
  private readonly navigationService = inject(NavigationService);
  private readonly ngZone = inject(NgZone);

  private isInitialized = false;
  private overlayCount = 0;
  private isPoppingForOverlayDismiss = false;
  private isProgrammaticBack = false;

  private readonly boundOnOverlayPresent = () => this.handleOverlayPresent();
  private readonly boundOnOverlayDismiss = () => this.handleOverlayDismiss();
  private readonly boundOnPopState = (event: PopStateEvent) => this.handlePopState(event);

  /**
   * Initializes application-wide listeners for overlay lifecycle and browser history events.
   */
  init(): void {
    if (typeof window === 'undefined' || this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    // Overlay present events bubble up to window from Ionic web components
    window.addEventListener('ionModalDidPresent', this.boundOnOverlayPresent);
    window.addEventListener('ionAlertDidPresent', this.boundOnOverlayPresent);
    window.addEventListener('ionActionSheetDidPresent', this.boundOnOverlayPresent);
    window.addEventListener('ionPopoverDidPresent', this.boundOnOverlayPresent);

    // Overlay dismiss events bubble up to window
    window.addEventListener('ionModalDidDismiss', this.boundOnOverlayDismiss);
    window.addEventListener('ionAlertDidDismiss', this.boundOnOverlayDismiss);
    window.addEventListener('ionActionSheetDidDismiss', this.boundOnOverlayDismiss);
    window.addEventListener('ionPopoverDidDismiss', this.boundOnOverlayDismiss);

    // Browser and hardware back button event
    window.addEventListener('popstate', this.boundOnPopState);
  }

  /**
   * Tracks newly presented overlays and pushes a history state entry.
   */
  private handleOverlayPresent(): void {
    this.overlayCount++;
    try {
      window.history.pushState({ openbarOverlay: true, count: this.overlayCount }, '');
    } catch {
      // Fallback in case history API is restricted in sandbox
    }
  }

  /**
   * Cleans up pushed history state when an overlay is dismissed via in-app UI.
   */
  private handleOverlayDismiss(): void {
    if (this.isPoppingForOverlayDismiss) {
      return;
    }

    if (this.overlayCount > 0) {
      this.overlayCount--;
      this.isProgrammaticBack = true;
      try {
        window.history.back();
      } catch {
        this.isProgrammaticBack = false;
      }
    }
  }

  /**
   * Handles popstate events triggered by the browser or device back button.
   */
  private handlePopState(_event: PopStateEvent): void {
    if (this.isProgrammaticBack) {
      this.isProgrammaticBack = false;
      return;
    }

    void this.ngZone.run(async () => {
      await this.dismissTopOverlay();
    });
  }

  /**
   * Dismisses the topmost active overlay or closes the mobile sidebar if open.
   *
   * @returns Promise resolving to true if an overlay or drawer was closed, false otherwise.
   */
  async dismissTopOverlay(): Promise<boolean> {
    const alert = await this.alertCtrl.getTop();
    const actionSheet = await this.actionSheetCtrl.getTop();
    const popover = await this.popoverCtrl.getTop();
    const modal = await this.modalCtrl.getTop();

    const topOverlay = alert || actionSheet || popover || modal;

    if (topOverlay) {
      this.isPoppingForOverlayDismiss = true;
      if (this.overlayCount > 0) {
        this.overlayCount--;
      }
      try {
        await topOverlay.dismiss(null, 'backdrop');
      } finally {
        this.isPoppingForOverlayDismiss = false;
      }
      return true;
    }

    if (this.navigationService.isMobileSidebarOpen()) {
      this.navigationService.closeMobileSidebar();
      return true;
    }

    return false;
  }

  /**
   * Returns current count of open overlays tracked in the history stack.
   */
  getOverlayCount(): number {
    return this.overlayCount;
  }

  /**
   * Cleans up event listeners and resets state.
   */
  ngOnDestroy(): void {
    this.destroy();
  }

  /**
   * Explicit teardown helper for unit tests and component unmounting.
   */
  destroy(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('ionModalDidPresent', this.boundOnOverlayPresent);
    window.removeEventListener('ionAlertDidPresent', this.boundOnOverlayPresent);
    window.removeEventListener('ionActionSheetDidPresent', this.boundOnOverlayPresent);
    window.removeEventListener('ionPopoverDidPresent', this.boundOnOverlayPresent);

    window.removeEventListener('ionModalDidDismiss', this.boundOnOverlayDismiss);
    window.removeEventListener('ionAlertDidDismiss', this.boundOnOverlayDismiss);
    window.removeEventListener('ionActionSheetDidDismiss', this.boundOnOverlayDismiss);
    window.removeEventListener('ionPopoverDidDismiss', this.boundOnOverlayDismiss);

    window.removeEventListener('popstate', this.boundOnPopState);

    this.isInitialized = false;
    this.overlayCount = 0;
    this.isPoppingForOverlayDismiss = false;
    this.isProgrammaticBack = false;
  }
}
