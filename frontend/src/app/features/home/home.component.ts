import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectCurrentUser} from '../../core/store/auth.selectors';
import {IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonIcon} from '@ionic/angular/standalone';
import {NgIf, AsyncPipe} from '@angular/common';
import {addIcons} from 'ionicons';
import {wineOutline, listOutline, restaurantOutline, calendarOutline} from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: true,
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonIcon, NgIf, AsyncPipe]
})
export class HomeComponent implements OnInit {
  currentUser$: Observable<any>;

  constructor(private readonly store: Store) {
    this.currentUser$ = this.store.select(selectCurrentUser);
    addIcons({ wineOutline, listOutline, restaurantOutline, calendarOutline });
  }

  ngOnInit(): void {
  }
}
