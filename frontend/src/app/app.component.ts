import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {NavbarComponent} from './core/components/navbar/navbar.component';
import { Store } from '@ngrx/store';
import * as AuthActions from './core/store/auth.actions';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [RouterOutlet, NavbarComponent],
  standalone: true
})
export class AppComponent {
  title = 'Gestion Cocktail';

  constructor(private store: Store, private authService: AuthService) {
    const token = localStorage.getItem('auth_token');
    const user = this.authService.getStoredUser();
    if (token) {
      this.store.dispatch(AuthActions.initAuthFromStorage({ token }));
    }
    if (user) {
      this.store.dispatch(AuthActions.setCurrentUser({ user }));
    }
  }
}
