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

// État partagé entre les appels concurrent (module-level, pas d'injection)
let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

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

function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });
}

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
    // Une autre requête est déjà en train de rafraîchir — attendre le résultat
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
