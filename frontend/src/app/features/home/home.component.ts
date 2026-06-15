import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectCurrentUser} from '../../core/store/auth.selectors';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import { NgIf, AsyncPipe } from '@angular/common';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: true,
  imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatIconModule, NgIf, AsyncPipe]
})
export class HomeComponent implements OnInit {
  currentUser$: Observable<any>;

  constructor(private store: Store) {
    this.currentUser$ = this.store.select(selectCurrentUser);
  }

  ngOnInit(): void {
  }
}
