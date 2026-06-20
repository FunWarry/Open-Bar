import {Component, Input} from '@angular/core';
import {User} from '../../../../core/models/user.model';
import {ModalController} from '@ionic/angular/standalone';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonIcon
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {trash} from 'ionicons/icons';

@Component({
  selector: 'app-delete-user-dialog',
  templateUrl: './delete-user-dialog.component.html',
  styleUrls: ['./delete-user-dialog.component.css'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonIcon
  ],
  providers: [ModalController]
})
export class DeleteUserDialogComponent {
  @Input() data!: User;

  constructor(private modalCtrl: ModalController) {
    addIcons({trash});
  }

  onConfirm(): void {
    this.modalCtrl.dismiss(true);
  }

  onCancel(): void {
    this.modalCtrl.dismiss(false);
  }
}
