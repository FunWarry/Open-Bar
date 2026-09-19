import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap } from 'rxjs/operators';
import { logout, initAuthFromStorage } from '../store/auth.actions';
import { AuthService } from '../services/auth.service';
import { NavigationService } from '../services/navigation.service';

// Shared in-flight refresh observable coordinating concurrent requests
let refreshInProgress$: Observable<string> | null = null;

/**
 * Functional HTTP authentication interceptor for JWT handling.
 * <p>
 * Injects the {@code Authorization: Bearer <token>} header on all outgoing HTTP requests.
 * On 401 Unauthorized responses, attempts automatic token refresh via the refresh token.
 *
 * @param req HTTP request to intercept
 * @param next Interception chain handler
 * @returns Observable of HTTP events
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const store = inject(Store);
  const authService = inject(AuthService);
  const navigationService = inject(NavigationService);

  const token = authService.getToken();
  const authReq = token ? addAuthHeader(req, token) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        token &&
        !req.url.includes('/api/auth/')
      ) {
        return handleRefresh(req, next, store, authService, navigationService, token);
      }
      return throwError(() => error);
    })
  );
};

/**
 * Adds the Bearer JWT security header to an HTTP request.
 *
 * @param req Source request
 * @param token Access JWT token
 * @returns Cloned request with authorization header
 */
function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });
}

/**
 * Handles the token refresh flow upon a 401 error.
 * Coordinates concurrent requests via shareReplay to prevent duplicate refresh calls.
 *
 * @param req Source request
 * @param next HTTP handler
 * @param store NgRx store
 * @param authService Authentication service
 * @param navigationService Navigation service
 * @param failedToken The token that failed on this request
 * @returns Observable of replayed request with fresh access token
 */
function handleRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  store: Store,
  authService: AuthService,
  navigationService: NavigationService,
  failedToken: string
): Observable<any> {
  const currentToken = authService.getToken();

  // If token was already refreshed by another concurrent request, retry immediately
  if (currentToken && currentToken !== failedToken) {
    return next(addAuthHeader(req, currentToken));
  }

  const refreshToken = authService.getRefreshToken();

  if (!refreshToken) {
    authService.logout();
    store.dispatch(logout());
    navigationService.navigateToLogin();
    return throwError(() => new Error('No refresh token available'));
  }

  refreshInProgress$ ??= authService.refreshToken().pipe(
    map(tokens => {
      const user = authService.getStoredUser();
      if (user) {
        store.dispatch(initAuthFromStorage({ token: tokens.accessToken, user }));
      }
      return tokens.accessToken;
    }),
    shareReplay(1),
    finalize(() => {
      refreshInProgress$ = null;
    })
  );

  return refreshInProgress$.pipe(
    switchMap(newToken => next(addAuthHeader(req, newToken))),
    catchError(refreshError => {
      authService.logout();
      store.dispatch(logout());
      navigationService.navigateToLogin();
      return throwError(() => refreshError);
    })
  );
}
