import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  documentTextOutline,
  closeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  shieldCheckmarkOutline,
  layersOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SupplierInvoiceService } from '../../../core/services/supplier-invoice.service';
import { SupplierInvoiceUploadResponse } from '../../../core/models/supplier-invoice.model';
import { ModalComponent } from '../../../core/components/ui/modal/modal.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';

/**
 * Modal dialog for uploading and automatically parsing digital supplier invoices (Factur-X & standard PDF).
 */
@Component({
  selector: 'app-supplier-invoice-upload-modal',
  templateUrl: './supplier-invoice-upload-modal.component.html',
  styleUrls: ['./supplier-invoice-upload-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonIcon,
    TranslocoPipe,
    ModalComponent,
    ActionButtonComponent
  ]
})
export class SupplierInvoiceUploadModalComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly invoiceService = inject(SupplierInvoiceService);

  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  isUploading = signal(false);
  uploadResult = signal<SupplierInvoiceUploadResponse | null>(null);

  constructor() {
    addIcons({
      cloudUploadOutline,
      documentTextOutline,
      closeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      shieldCheckmarkOutline,
      layersOutline
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.setFile(event.dataTransfer.files[0]);
    }
  }

  private setFile(file: File): void {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.xml')) {
      void this.showToast(this.transloco.translate('purchases.invoices.errors.invalidFormat'), 'danger');
      return;
    }
    this.selectedFile.set(file);
    this.uploadResult.set(null);
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.uploadResult.set(null);
  }

  uploadAndParse(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    this.invoiceService.uploadInvoice(file).subscribe({
      next: (response) => {
        this.isUploading.set(false);
        this.uploadResult.set(response);
        const msg = response.duplicate
          ? this.transloco.translate('purchases.invoices.duplicateNotice')
          : this.transloco.translate('purchases.invoices.uploadSuccess');
        void this.showToast(msg, response.duplicate ? 'warning' : 'success');
      },
      error: (err) => {
        this.isUploading.set(false);
        const errorMsg = err?.error?.message || this.transloco.translate('purchases.invoices.errors.uploadFailed');
        void this.showToast(errorMsg, 'danger');
      }
    });
  }

  finish(): void {
    const res = this.uploadResult();
    void this.modalCtrl.dismiss(res?.invoice ?? null, 'confirm');
  }

  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
