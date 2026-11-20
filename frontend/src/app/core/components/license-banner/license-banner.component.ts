import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { IonIcon } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { warningOutline, lockClosedOutline, keyOutline, receiptOutline } from 'ionicons/icons';
import { map } from 'rxjs/operators';
import { LicenseService } from '../../services/license.service';
import { MonetizationService } from '../../services/monetization.service';
import { selectCurrentUser } from '../../store/auth.selectors';
import { ActionButtonComponent } from '../ui/action-button/action-button.component';

/**
 * Persistent top banner alerting authenticated staff when the establishment license
 * is inside its 2-day expiration grace period or has expired, OR when a monthly
 * TPE commission invoice is pending/overdue.
 */
@Component({
  selector: 'app-license-banner',
  standalone: true,
  imports: [AsyncPipe, IonIcon, TranslocoPipe, ActionButtonComponent],
  templateUrl: './license-banner.component.html',
  styleUrls: ['./license-banner.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class LicenseBannerComponent {
  readonly licenseService = inject(LicenseService);
  readonly monetizationService = inject(MonetizationService, { optional: true });
  private readonly router = inject(Router);
  private readonly store = inject(Store, { optional: true });

  /** Emits true if the current user can access the /admin/license console. */
  readonly canManageLicense$ = this.store
    ? this.store.select(selectCurrentUser).pipe(
        map(user => Boolean(user?.roles?.some(r => r === 'ADMIN' || r === 'MANAGER')))
      )
    : undefined;

  /** Computed severity class ('grace' or 'expired'). */
  readonly bannerTone = computed<'grace' | 'expired'>(() =>
    this.licenseService.isInGracePeriod() ? 'grace' : 'expired'
  );

  /** True when a commission invoice warning banner should be shown. */
  readonly showCommissionBanner = computed(() => Boolean(this.monetizationService?.shouldShowBanner()));

  /** Computed severity class for the commission banner. */
  readonly commissionTone = computed<'grace' | 'expired'>(() =>
    this.monetizationService?.summary()?.invoiceStatus === 'OVERDUE' ? 'expired' : 'grace'
  );

  constructor() {
    addIcons({ warningOutline, lockClosedOutline, keyOutline, receiptOutline });
  }

  /** Navigates to the administrative license console. */
  goToLicenseSettings(): void {
    void this.router.navigate(['/admin/license']);
  }

  /** Navigates to historical invoices view (always accessible even when expired). */
  goToInvoices(): void {
    void this.router.navigate(['/factures']);
  }
}
