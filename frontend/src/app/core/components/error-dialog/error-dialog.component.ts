import {Component, Input} from '@angular/core';
import {ModalController} from '@ionic/angular/standalone';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-error-dialog',
  templateUrl: './error-dialog.component.html',
  styleUrls: ['./error-dialog.component.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
  providers: [ModalController]
})
export class ErrorDialogComponent {
  @Input() data!: {message: string};

  constructor(private modalCtrl: ModalController) {}

  onClose(): void {
    this.modalCtrl.dismiss();
  }
}
