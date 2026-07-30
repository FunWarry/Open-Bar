import {Component} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {RouterLink} from '@angular/router';
import {selectCurrentUser} from '../../core/store/auth.selectors';
import {User} from '../../core/models/user.model';
import {IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonIcon, IonButton} from '@ionic/angular/standalone';
import {AsyncPipe} from '@angular/common';
import {NavigationService} from "../../core/services/navigation.service";

import {TranslocoPipe} from '@jsverse/transloco';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  standalone: true,
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonIcon, IonButton, AsyncPipe, RouterLink, TranslocoPipe]
})
export class AdminComponent {
  currentUser$: Observable<User | null>;

  constructor(private readonly store: Store, protected readonly navigationService: NavigationService) {
    this.currentUser$ = this.store.select(selectCurrentUser);
  }
}
