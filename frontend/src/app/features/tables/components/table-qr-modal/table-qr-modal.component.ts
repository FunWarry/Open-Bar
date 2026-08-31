import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSpinner, ModalController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, copyOutline, downloadOutline, printOutline,
  qrCodeOutline, wifiOutline, checkmarkOutline, linkOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TableBar } from '../../../../core/models/table.model';
import { TableService } from '../../../../core/services/table.service';
import { AppSettingsService } from '../../../../core/services/app-settings.service';
import { AppSettings } from '../../../../core/models/app-settings.model';

/**
 * Modal component displaying a table's digital ordering QR code, direct URL copy,
 * image export options (PNG, SVG), single stand PDF printing, and optional Wi-Fi badge.
 */
@Component({
  selector: 'app-table-qr-modal',
  templateUrl: './table-qr-modal.component.html',
  styleUrls: ['./table-qr-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    IonSpinner,
    TranslocoPipe
  ]
})
export class TableQrModalComponent implements OnInit {
  @Input() table!: TableBar;

  private readonly tableService = inject(TableService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  qrFormat: 'PNG' | 'SVG' = 'PNG';
  qrSize = 320;
  qrUrl = '';
  orderUrl = '';
  settings: AppSettings | null = null;
  copied = false;
  isDownloading = false;

  constructor() {
    addIcons({
      closeOutline,
      copyOutline,
      downloadOutline,
      printOutline,
      qrCodeOutline,
      wifiOutline,
      checkmarkOutline,
      linkOutline
    });
  }

  ngOnInit(): void {
    this.appSettingsService.settings$.subscribe((settings: AppSettings | null) => {
      this.settings = settings;
      this.updateUrls();
    });
    this.updateUrls();
  }

  private updateUrls(): void {
    if (!this.table) {
      return;
    }
    const baseUrl = this.settings?.clientBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://openbar.lan');
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.orderUrl = `${cleanBase}/client/commande?table=${this.table.numero}`;
    this.qrUrl = this.tableService.getTableQrCodeUrl(this.table.id, this.qrFormat, this.qrSize);
  }

  setFormat(format: 'PNG' | 'SVG'): void {
    this.qrFormat = format;
    this.updateUrls();
  }

  async copyOrderUrl(): Promise<void> {
    if (!this.orderUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(this.orderUrl);
      this.copied = true;
      const toast = await this.toastCtrl.create({
        message: this.transloco.translate('TABLES.QR_COPIED_URL'),
        duration: 2500,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
      setTimeout(() => {
        this.copied = false;
      }, 3000);
    } catch {
      const toast = await this.toastCtrl.create({
        message: this.transloco.translate('COMMON.ERROR'),
        duration: 2500,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    }
  }

  downloadImage(format: 'PNG' | 'SVG'): void {
    this.isDownloading = true;
    this.tableService.downloadTableQrCode(this.table.id, format, 600).subscribe({
      next: (blob) => {
        this.isDownloading = false;
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `table-${this.table.numero}-qr.${format.toLowerCase()}`;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      },
      error: async () => {
        this.isDownloading = false;
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('COMMON.ERROR'),
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  printStandPdf(): void {
    this.isDownloading = true;
    this.tableService.downloadQrCodesPdf('STAND', [this.table.id], true).subscribe({
      next: (blob) => {
        this.isDownloading = false;
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `table-${this.table.numero}-chevalet.pdf`;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      },
      error: async () => {
        this.isDownloading = false;
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('COMMON.ERROR'),
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
