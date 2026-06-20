import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectCurrentUser, selectIsAdmin, selectIsAuthenticated} from '../../store/auth.selectors';
import {NavigationService} from '../../services/navigation.service';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonPopover, IonList, IonItem, IonLabel
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {home, settings, personCircle, person, logOut, chevronDown} from 'ionicons/icons';
import {AsyncPipe, NgIf} from '@angular/common';
import * as AuthActions from '../../store/auth.actions';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonPopover, IonList, IonItem, IonLabel, NgIf, AsyncPipe]
})
export class NavbarComponent implements OnInit {
  isAuthenticated$: Observable<boolean>;
  isAdmin$: Observable<boolean>;
  currentUser$: Observable<any>;

  isUserMenuOpen = false;

  constructor(
    private store: Store,
    public navigationService: NavigationService
  ) {
    this.isAuthenticated$ = this.store.select(selectIsAuthenticated);
    this.isAdmin$ = this.store.select(selectIsAdmin);
    this.currentUser$ = this.store.select(selectCurrentUser);
    addIcons({home, settings, personCircle, person, logOut, chevronDown});
  }

  ngOnInit(): void {
  }

  onLogout(): void {
    console.log('NavbarComponent onLogout');
    this.store.dispatch(AuthActions.logout());
  }
}
