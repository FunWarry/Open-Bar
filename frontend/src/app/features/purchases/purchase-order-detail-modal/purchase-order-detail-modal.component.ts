import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  createOutline,
  closeOutline,
  documentTextOutline,
  businessOutline,
  calendarOutline,
  timeOutline,
  sendOutline,
  closeCircleOutline,
  checkmarkDoneOutline,
  downloadOutline,
  informationCircleOutline,
  cubeOutline
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { PurchaseOrder } from '../../../core/models/purchase-order.model';

/**
 * Modal presenting complete details of a supplier purchase order, including
 * item lines, unit costs, VAT breakdown, status, and direct lifecycle actions.
 */
@Component({
  selector: 'app-purchase-order-detail-modal',
  templateUrl: './purchase-order-detail-modal.component.html',
  styleUrls: ['./purchase-order-detail-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonIcon,
    TranslocoPipe
  ]
})
export class PurchaseOrderDetailModalComponent {
  private readonly modalCtrl = inject(ModalController);

  @Input() order!: PurchaseOrder;

  constructor() {
    addIcons({
      createOutline,
      closeOutline,
      documentTextOutline,
      businessOutline,
      calendarOutline,
      timeOutline,
      sendOutline,
      closeCircleOutline,
      checkmarkDoneOutline,
      downloadOutline,
      informationCircleOutline,
      cubeOutline
    });
  }

  onClose(): void {
    this.modalCtrl.dismiss({ action: 'close' });
  }

  onEdit(): void {
    this.modalCtrl.dismiss({ action: 'edit', order: this.order });
  }

  onSend(): void {
    this.modalCtrl.dismiss({ action: 'send', order: this.order });
  }

  onCancelOrder(): void {
    this.modalCtrl.dismiss({ action: 'cancel', order: this.order });
  }

  onReceive(): void {
    this.modalCtrl.dismiss({ action: 'receive', order: this.order });
  }

  onDownloadPdf(): void {
    this.modalCtrl.dismiss({ action: 'pdf', order: this.order });
  }
}
