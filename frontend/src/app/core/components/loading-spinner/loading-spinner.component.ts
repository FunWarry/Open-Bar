import {Component, ChangeDetectionStrategy} from '@angular/core';
import {IonSpinner} from '@ionic/angular';


/**
 * Theme-adaptive loading indicator component for asynchronous operations.
 */
@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonSpinner]
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
