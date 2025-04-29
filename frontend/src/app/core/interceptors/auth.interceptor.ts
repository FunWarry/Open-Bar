import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import {inject} from '@angular/core';
import {Store} from '@ngrx/store';
import {selectAuthToken} from '../store/auth.selectors';
import {from, Observable, throwError} from 'rxjs';
import {Router} from '@angular/router';
import {AuthService} from '../services/auth.service';
import {catchError, switchMap} from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<any> => {
  const store = inject(Store);
  const router = inject(Router);
  const authService = inject(AuthService);

  return from(store.select(selectAuthToken)).pipe(
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
        authService.logout();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};
