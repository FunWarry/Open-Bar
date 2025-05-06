import {HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import {Store} from '@ngrx/store';
import {selectAuthToken} from '../store/auth.selectors';
import {from, Observable, take, throwError} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';
import {logout} from "../store/auth.actions";

// auth.interceptor.ts - Version simplifiée
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<any> => {
  const store = inject(Store);

  return from(store.select(selectAuthToken)).pipe(
    take(1),
    switchMap(token => {
      if (token) {
        const cloned = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
        return next(cloned);
      }
      return next(req);
    }),
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Si 401, on dispatch l'action de logout
        const store = inject(Store);
        store.dispatch(logout());
      }
      return throwError(() => error);
    })
  );
};
