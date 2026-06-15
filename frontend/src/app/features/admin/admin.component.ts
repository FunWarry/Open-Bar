import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectCurrentUser} from '../../core/store/auth.selectors';
import {User} from '../../core/models/user.model';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import {NavigationService} from "../../core/services/navigation.service";

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  standalone: true,
  imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatIconModule, MatButtonModule, AsyncPipe]
})
export class AdminComponent implements OnInit {
  currentUser$: Observable<User | null>;

  constructor(private store: Store
  , protected navigationService: NavigationService
  ) {
    this.currentUser$ = this.store.select(selectCurrentUser);
    this.navigationService = navigationService;
  }

  ngOnInit(): void {
  }
}
