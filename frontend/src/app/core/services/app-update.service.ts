import { inject, Injectable, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';
import { selectCurrentUser } from '../store/auth.selectors';
import { GitHubRelease, OfficialReleaseInfo, UpdateCheckResult } from '../models/app-update.model';
import { filterOfficialReleases, isNewerVersion } from '../utils/version-comparator.util';

/** Key used in LocalStorage for storing the snoozed version tag. */
export const SNOOZE_VERSION_KEY = 'openbar_update_snooze_version';

/** Key used in LocalStorage for storing the snooze timestamp in milliseconds. */
export const SNOOZE_TIMESTAMP_KEY = 'openbar_update_snooze_timestamp';

/** Duration of a snooze action in milliseconds (24 hours). */
export const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000;

/** Key used in SessionStorage to avoid redundant startup checks in the same browsing session. */
export const SESSION_CHECKED_KEY = 'openbar_update_checked_session';

/**
 * Service managing startup update checks, version comparisons against GitHub releases,
 * manager-restricted presentation of update dialogs, and snooze persistence.
 */
@Injectable({
  providedIn: 'root'
})
export class AppUpdateService {
  private readonly store = inject(Store);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  /** Currently running application version. */
  readonly currentVersion: string = environment.appVersion || '1.0.0';

  /** GitHub API releases endpoint. */
  readonly releasesUrl: string = environment.githubReleasesUrl || 'https://api.github.com/repos/FunWarry/Open-Bar/releases';

  private hasCheckedThisSession = false;

  /**
   * Initializes automatic update checks on application startup.
   * Listens to the authenticated user from NgRx Store and triggers the check
   * exclusively for users with MANAGER or ADMIN privileges.
   */
  initStartupCheck(): void {
    this.store
      .select(selectCurrentUser)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (!user) {
          return;
        }

        const isManagerOrAdmin = this.canUserViewUpdateModal(user.roles);
        if (!isManagerOrAdmin) {
          return;
        }

        if (this.hasCheckedThisSession || sessionStorage.getItem(SESSION_CHECKED_KEY) === 'true') {
          return;
        }

        this.hasCheckedThisSession = true;
        sessionStorage.setItem(SESSION_CHECKED_KEY, 'true');

        this.checkNewerRelease()
          .then((result) => {
            if (result.hasUpdate && result.latestRelease && !this.isSnoozed(result.latestRelease.version)) {
              this.presentUpdateModal(result.latestRelease);
            }
          })
          .catch(() => {
            // Fail silently on offline/network errors without blocking application startup
          });
      });
  }

  /**
   * Checks whether a newer official stable release is available on GitHub.
   * Uses unauthenticated native fetch with a strict timeout to ensure zero impact
   * on internal HTTP interceptors and fails silently when offline.
   *
   * @param overrideUrl Optional custom releases URL (primarily for test mocking)
   * @returns Promise resolving to UpdateCheckResult
   */
  async checkNewerRelease(overrideUrl?: string): Promise<UpdateCheckResult> {
    const targetUrl = overrideUrl || this.releasesUrl;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github.v3+json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          hasUpdate: false,
          currentVersion: this.currentVersion,
          latestRelease: null
        };
      }

      const rawReleases = (await response.json()) as GitHubRelease[];
      const officialReleases = filterOfficialReleases(rawReleases);

      if (officialReleases.length === 0) {
        return {
          hasUpdate: false,
          currentVersion: this.currentVersion,
          latestRelease: null
        };
      }

      const latest = officialReleases[0];
      const hasUpdate = isNewerVersion(latest.version, this.currentVersion);

      return {
        hasUpdate,
        currentVersion: this.currentVersion,
        latestRelease: hasUpdate ? latest : null
      };
    } catch {
      // Graceful offline fallback: silently return no update found
      return {
        hasUpdate: false,
        currentVersion: this.currentVersion,
        latestRelease: null
      };
    }
  }

  /**
   * Determines whether a given set of user roles qualifies for viewing the update modal.
   * Only ROLE_MANAGER, MANAGER, ROLE_ADMIN, and ADMIN roles are authorized.
   *
   * @param roles Array of role strings or undefined
   * @returns True if the user has MANAGER or ADMIN access
   */
  canUserViewUpdateModal(roles?: string[] | null): boolean {
    if (!roles || !Array.isArray(roles)) {
      return false;
    }
    const authorized = new Set(['ROLE_MANAGER', 'MANAGER', 'ROLE_ADMIN', 'ADMIN']);
    return roles.some((r) => authorized.has(r.trim()));
  }

  /**
   * Verifies whether an update modal notification for the specified version is currently snoozed.
   *
   * @param version Version tag or number to inspect
   * @returns True if snoozed within the active cooldown duration
   */
  isSnoozed(version: string): boolean {
    try {
      const snoozedVersion = localStorage.getItem(SNOOZE_VERSION_KEY);
      const snoozedAtStr = localStorage.getItem(SNOOZE_TIMESTAMP_KEY);

      if (snoozedVersion !== version || !snoozedAtStr) {
        return false;
      }

      const snoozedAt = Number.parseInt(snoozedAtStr, 10);
      if (Number.isNaN(snoozedAt)) {
        return false;
      }

      return Date.now() - snoozedAt < SNOOZE_DURATION_MS;
    } catch {
      return false;
    }
  }

  /**
   * Snoozes the update prompt for the specified version for 24 hours.
   *
   * @param version Version string to snooze
   */
  snoozeUpdate(version: string): void {
    try {
      localStorage.setItem(SNOOZE_VERSION_KEY, version);
      localStorage.setItem(SNOOZE_TIMESTAMP_KEY, Date.now().toString());
    } catch {
      // Ignore localStorage permission errors
    }
  }

  /**
   * Clears any active snooze, allowing the modal to be presented again immediately.
   */
  clearSnooze(): void {
    try {
      localStorage.removeItem(SNOOZE_VERSION_KEY);
      localStorage.removeItem(SNOOZE_TIMESTAMP_KEY);
    } catch {
      // Ignore localStorage permission errors
    }
  }

  /**
   * Dynamically loads and displays the update modal component.
   *
   * @param release Official release information to display
   * @returns Created modal instance or null
   */
  async presentUpdateModal(release: OfficialReleaseInfo): Promise<HTMLIonModalElement | null> {
    const { AppUpdateModalComponent } = await import('../components/app-update-modal/app-update-modal.component');

    const modal = await this.modalCtrl.create({
      component: AppUpdateModalComponent,
      componentProps: {
        currentVersion: this.currentVersion,
        latestRelease: release
      },
      cssClass: 'app-update-modal-container',
      backdropDismiss: false
    });

    await modal.present();
    return modal;
  }

  /**
   * Executes the upgrade workflow trigger.
   * Notifies the user, triggers system upgrade hooks, and provides release reference.
   *
   * @param release Target release info
   */
  async triggerUpdate(release: OfficialReleaseInfo): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.transloco.translate('UPDATE_MODAL.UPGRADE_INITIATED', { version: release.version }),
      duration: 5000,
      color: 'success',
      position: 'bottom',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();

    if (release.htmlUrl && typeof window !== 'undefined') {
      window.open(release.htmlUrl, '_blank');
    }
  }
}
