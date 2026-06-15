import {Injectable} from '@angular/core';
import {CanActivate, Router, UrlTree} from '@angular/router';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {selectCurrentUser} from '../store/auth.selectors';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private store: Store,
    private router: Router
  ) {
  }

  canActivate(): Observable<boolean | UrlTree> {
    return this.store.select(selectCurrentUser).pipe(
      take(1),
      map(user => {
        if (user?.roles.includes('ADMIN')) {
          return true;
        }
        return this.router.createUrlTree(['/']);
      })
    );
  }
}
