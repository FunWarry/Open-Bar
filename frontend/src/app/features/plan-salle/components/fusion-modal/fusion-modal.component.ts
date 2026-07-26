import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { gitMergeOutline, closeOutline } from 'ionicons/icons';
import { TableBar } from '../../../../core/models/table.model';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';

@Component({
  selector: 'app-fusion-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    ActionButtonComponent,
  ],
  templateUrl: './fusion-modal.component.html',
  styleUrls: ['./fusion-modal.component.scss'],
})
export class FusionModalComponent {
  @Input() sourceTable!: TableBar;
  @Input() targetTable!: TableBar;

  constructor(private modalCtrl: ModalController) {
    addIcons({ gitMergeOutline, closeOutline });
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm() {
    this.modalCtrl.dismiss({ confirmed: true }, 'confirm');
  }
}
