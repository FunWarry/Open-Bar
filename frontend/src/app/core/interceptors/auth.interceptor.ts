import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAuthToken } from '../store/auth.selectors';
import { BehaviorSubject, from, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { logout } from '../store/auth.actions';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// État partagé entre les requêtes concurrentes lors du rafraîchissement de jeton
let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

/**
 * Intercepteur HTTP fonctionnel d'authentification JWT.
 * <p>
 * Injecte l'en-tête {@code Authorization: Bearer <token>} sur toutes les requêtes sortantes.
 * En cas de réponse 401 Unauthorized, tente un rafraîchissement automatique de jeton via le refresh token.
 *
 * @param req La requête HTTP à intercepter
 * @param next Le handler de la chaîne d'interception
 * @returns Observable de l'événement HTTP
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<any> => {
  const store = inject(Store);
  const authService = inject(AuthService);
  const http = inject(HttpClient);

  return from(store.select(selectAuthToken)).pipe(
    take(1),
    switchMap(token => {
      const authReq = token ? addAuthHeader(req, token) : req;
      return next(authReq).pipe(
        catchError((error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            error.status === 401 &&
            !req.url.includes('/api/auth/')
          ) {
            return handleRefresh(req, next, store, authService, http);
          }
          return throwError(() => error);
        })
      );
    })
  );
};

/**
 * Ajoute l'en-tête de sécurité Bearer JWT à une requête HTTP.
 *
 * @param req La requête d'origine
 * @param token Le jeton JWT d'accès
 * @returns La requête clonée avec l'en-tête d'autorisation
 */
function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });
}

/**
 * Gère le processus de rafraîchissement de jeton lors d'une erreur 401.
 * Mutualise le rafraîchissement pour éviter les requêtes concourantes multiples.
 *
 * @param req Requête d'origine
 * @param next Handler HTTP
 * @param store Store NgRx
 * @param authService Service d'authentification
 * @param http Client HTTP
 * @returns Observable de la requête rejouée avec le nouveau token
 */
function handleRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  store: Store,
  authService: AuthService,
  http: HttpClient
): Observable<any> {
  const refreshToken = authService.getRefreshToken();

  if (!refreshToken) {
    store.dispatch(logout());
    return throwError(() => new Error('No refresh token available'));
  }

  if (isRefreshing) {
    return refreshDone$.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(newToken => next(addAuthHeader(req, newToken!)))
    );
  }

  isRefreshing = true;
  refreshDone$.next(null);

  return http.post<{ accessToken: string; refreshToken: string }>(
    `${environment.apiUrl}/api/auth/refresh`,
    { refreshToken }
  ).pipe(
    switchMap(tokens => {
      isRefreshing = false;
      authService.storeTokens(tokens.accessToken, tokens.refreshToken);
      refreshDone$.next(tokens.accessToken);
      return next(addAuthHeader(req, tokens.accessToken));
    }),
    catchError(refreshError => {
      isRefreshing = false;
      refreshDone$.next(null);
      store.dispatch(logout());
      return throwError(() => refreshError);
    })
  );
}
