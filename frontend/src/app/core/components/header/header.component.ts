import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {User} from '../../models/user.model';
import {selectCurrentUser} from '../../store/auth.selectors';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatListModule} from '@angular/material/list';
import * as AuthActions from '../../store/auth.actions';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule, MatSidenavModule, MatListModule]
})
export class HeaderComponent implements OnInit {
  currentUser$: Observable<User | null>;

  constructor(
    private store: Store
  ) {
    this.currentUser$ = this.store.select(selectCurrentUser);
  }

  ngOnInit(): void {
    console.log('HeaderComponent ngOnInit');
  }

  onLogout(): void {
    console.log('HeaderComponent onLogout');
    this.store.dispatch(AuthActions.logout());
  }
}
