import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { CloudRelayService } from '../services/cloud-relay.service';

const FALLBACK_MESSAGES: Record<string, string> = {
  'ERRORS.NETWORK': 'Network error — please check your internet connection.',
  'ERRORS.UNAUTHORIZED': 'Access denied.',
  'ERRORS.FORBIDDEN': 'Forbidden.',
  'ERRORS.NOT_FOUND': 'Resource not found.',
  'ERRORS.LICENSE_EXPIRED': 'License expired: order creation is locked. Historical invoices and reports remain accessible.',
  'ERRORS.CLOUD_RELAY_OFFLINE': 'Venue tunnel is offline. Please connect to the bar Wi-Fi or ask waitstaff.',
  'ERRORS.RELAY_USER_ACCESS_DISABLED': 'Remote Cloud Relay access is disabled for your user account.',
  'ERRORS.RELAY_ROLE_ACCESS_DISABLED': 'Your role is not authorized to access OpenBar via the Cloud Relay tunnel.',
  'ERRORS.RELAY_CLIENT_ACCESS_DISABLED': 'Patron ordering via Cloud Relay is currently disabled.',
  'ERRORS.RELAY_STAFF_ACCESS_DISABLED': 'Staff remote access via Cloud Relay is currently disabled.',
  'ERRORS.RELAY_ADMIN_ACCESS_DISABLED': 'Admin console access via Cloud Relay is currently disabled.',
  'ERRORS.RELAY_REMOTE_TPE_DISABLED': 'Remote TPE payment dispatch via Cloud Relay is disabled.',
  'ERRORS.RELAY_REMOTE_PRINTING_DISABLED': 'Remote thermal printing via Cloud Relay is disabled.',
  'ERRORS.SERVER': 'Unexpected server error.',
};

const DEV = isDevMode();

/**
 * Functional HTTP interceptor for global error handling.
 * <p>
 * Intercepts HTTP errors (4xx/5xx/0) and automatically displays an Ionic error toast
 * with i18n translation via Transloco.
 *
 * @param req HTTP request to intercept
 * @param next Interception chain handler
 * @returns Observable propagating the error after displaying toast
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastCtrl = inject(ToastController);
  const transloco = inject(TranslocoService);
  const cloudRelayService = inject(CloudRelayService, { optional: true });
  const router = inject(Router, { optional: true });

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      if (error.status === 401 || req.headers.has('X-Silent-Probe')) return throwError(() => error);

      const errorCode = extractErrorCode(error);
      if (errorCode === 'CLOUD_RELAY_OFFLINE' && cloudRelayService) {
        cloudRelayService.markTunnelOffline();
        if (router && !router.url.includes('/relay-offline')) {
          void router.navigate(['/relay-offline']);
        }
      }

      const key = getErrorKey(error.status, errorCode);
      const translated = transloco.translate(key);
      const message = translated !== key ? translated : (FALLBACK_MESSAGES[key] ?? 'An error occurred.');

      if (DEV) console.error('[HTTP Error]', error.status, error.url, error);

      const show$ = from(
        toastCtrl.getTop()
          .then(existing => existing?.dismiss())
          .then(() => toastCtrl.create({
            message,
            duration: 3500,
            color: 'danger',
            position: 'bottom',
            buttons: [{ text: '✕', role: 'cancel' }],
          }))
          .then(toast => toast.present())
      );

      return show$.pipe(switchMap(() => throwError(() => error)));
    })
  );
};

function extractErrorCode(error: HttpErrorResponse): string | null {
  const payload = error.error;
  if (payload && typeof payload === 'object' && 'errorCode' in payload) {
    const raw = (payload as { errorCode?: unknown }).errorCode;
    return typeof raw === 'string' ? raw : null;
  }
  return null;
}

/**
 * Maps an HTTP status code and optional Cloud Relay error code to its Transloco translation key.
 *
 * @param status HTTP status code (0, 403, 404, 500, 503, etc.)
 * @param errorCode Optional machine-readable error code
 * @returns Corresponding i18n translation key
 */
function getErrorKey(status: number, errorCode: string | null): string {
  if (errorCode && `ERRORS.${errorCode}` in FALLBACK_MESSAGES) {
    return `ERRORS.${errorCode}`;
  }
  if (status === 0) return 'ERRORS.NETWORK';
  if (status === 402) return 'ERRORS.LICENSE_EXPIRED';
  if (status === 403) return 'ERRORS.FORBIDDEN';
  if (status === 404) return 'ERRORS.NOT_FOUND';
  return 'ERRORS.SERVER';
}
