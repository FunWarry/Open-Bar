import {Component} from '@angular/core';
import {IonSpinner} from '@ionic/angular/standalone';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.css'],
  standalone: true,
  imports: [IonSpinner, NgIf]
})
export class LoadingSpinnerComponent {
  isLoading = false;

  show(): void {
    this.isLoading = true;
  }

  hide(): void {
    this.isLoading = false;
  }
}
