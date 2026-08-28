import { Injectable, inject } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable, firstValueFrom, isObservable } from 'rxjs';
import { AlertController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Interface that components must implement to allow {@link PendingChangesGuard}
 * to check whether there are unsaved modifications before leaving the route.
 */
export interface HasPendingChanges {
  /**
   * Evaluates if the component has unsaved changes.
   *
   * @returns boolean, Observable<boolean>, or Promise<boolean> indicating dirty state
   */
  hasUnsavedChanges(): boolean | Observable<boolean> | Promise<boolean>;
}

/**
 * Route guard preventing navigation if a component has unsaved modifications.
 * Prompts the user with an Ionic confirmation dialog before proceeding.
 */
@Injectable({
  providedIn: 'root',
})
export class PendingChangesGuard implements CanDeactivate<HasPendingChanges> {
  private readonly alertCtrl = inject(AlertController, { optional: true });
  private readonly translocoService = inject(TranslocoService, { optional: true });

  /**
   * Determines if the user can leave the current route.
   *
   * @param component The active component implementing {@link HasPendingChanges}
   * @returns Promise resolving to true if navigation is allowed, false otherwise
   */
  async canDeactivate(component: HasPendingChanges): Promise<boolean> {
    if (!component || typeof component.hasUnsavedChanges !== 'function') {
      return true;
    }

    const pendingResult = component.hasUnsavedChanges();
    let isDirty = false;

    if (typeof pendingResult === 'boolean') {
      isDirty = pendingResult;
    } else if (isObservable(pendingResult)) {
      isDirty = await firstValueFrom(pendingResult);
    } else if (pendingResult instanceof Promise) {
      isDirty = await pendingResult;
    }

    if (!isDirty) {
      return true;
    }

    if (!this.alertCtrl) {
      // Fallback in environments without AlertController (e.g. non-browser unit test runs)
      return true;
    }

    const header = this.translocoService?.translate('SETTINGS.UNSAVED_CHANGES_TITLE') ?? 'Modifications non enregistrées';
    const message = this.translocoService?.translate('SETTINGS.UNSAVED_CHANGES_MSG') ?? 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter sans sauvegarder ?';
    const stayText = this.translocoService?.translate('SETTINGS.STAY') ?? 'Rester';
    const leaveText = this.translocoService?.translate('SETTINGS.LEAVE') ?? 'Quitter';

    const alert = await this.alertCtrl.create({
      header,
      message,
      backdropDismiss: false,
      buttons: [
        {
          text: stayText,
          role: 'cancel',
        },
        {
          text: leaveText,
          role: 'destructive',
        },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }
}
