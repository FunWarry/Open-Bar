import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {User} from '../../models/user.model';
import {selectCurrentUser} from '../../store/auth.selectors';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonMenu, IonMenuButton, IonContent, IonList, IonItem, IonLabel,
  IonPopover
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {
  menu, localBar, receipt, tableRestaurant, nutrition, shieldCheckmark,
  logOut, chevronDown, person
} from 'ionicons/icons';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {AsyncPipe, NgIf} from '@angular/common';
import * as AuthActions from '../../store/auth.actions';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonMenu, IonMenuButton, IonContent, IonList, IonItem, IonLabel,
    IonPopover, RouterLink, RouterLinkActive, AsyncPipe, NgIf
  ]
})
export class HeaderComponent implements OnInit {
  currentUser$: Observable<User | null>;

  constructor(
    private store: Store
  ) {
    this.currentUser$ = this.store.select(selectCurrentUser);
    addIcons({menu, localBar, receipt, tableRestaurant, nutrition, shieldCheckmark, logOut, chevronDown, person});
  }

  ngOnInit(): void {
  }

  onLogout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
