import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, from, switchMap, throwError } from 'rxjs';

const FALLBACK_MESSAGES: Record<string, string> = {
  'ERRORS.NETWORK': 'Network error — please check your internet connection.',
  'ERRORS.UNAUTHORIZED': 'Access denied.',
  'ERRORS.FORBIDDEN': 'Forbidden.',
  'ERRORS.NOT_FOUND': 'Resource not found.',
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

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      if (error.status === 401) return throwError(() => error);

      const key = getErrorKey(error.status);
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

/**
 * Maps an HTTP status code to its corresponding Transloco translation key.
 *
 * @param status HTTP status code (0, 403, 404, 500, etc.)
 * @returns Corresponding i18n translation key
 */
function getErrorKey(status: number): string {
  if (status === 0)   return 'ERRORS.NETWORK';
  if (status === 403) return 'ERRORS.FORBIDDEN';
  if (status === 404) return 'ERRORS.NOT_FOUND';
  return 'ERRORS.SERVER';
}
