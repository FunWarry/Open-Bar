import { inject, Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SetupService } from '../services/setup.service';

@Injectable({ providedIn: 'root' })
export class SetupGuard implements CanActivate {
  private readonly setupService = inject(SetupService);
  private readonly router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return this.setupService.getStatus().pipe(
      map(status => {
        if (!status.initialized) {
          return true;
        }
        return this.router.createUrlTree(['/auth/login']);
      }),
      catchError(() => {
        return of(true);
      })
    );
  }
}
