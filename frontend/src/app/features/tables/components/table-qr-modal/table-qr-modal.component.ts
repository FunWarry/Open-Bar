import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IonIcon, IonSpinner, ModalController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, copyOutline, downloadOutline, printOutline,
  qrCodeOutline, wifiOutline, checkmarkOutline, linkOutline,
  restaurantOutline, locationOutline, peopleOutline, keyOutline,
  lockClosedOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TableBar } from '../../../../core/models/table.model';
import { TableService } from '../../../../core/services/table.service';
import { AppSettingsService } from '../../../../core/services/app-settings.service';
import { AppSettings } from '../../../../core/models/app-settings.model';

export type QrModalMode = 'ORDER' | 'WIFI';

/**
 * Modal component displaying a table's digital ordering QR code and establishment Wi-Fi QR code,
 * direct URL / credentials copy, image export options (PNG, SVG), and single stand PDF printing.
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
export class TableQrModalComponent implements OnInit, OnDestroy {
  @Input() table!: TableBar;

  private readonly tableService = inject(TableService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  activeMode: QrModalMode = 'ORDER';
  qrFormat: 'PNG' | 'SVG' = 'PNG';
  qrSize = 320;
  previewUrl = '';
  private currentRawBlobUrl = '';
  orderUrl = '';
  settings: AppSettings | null = null;
  copiedUrl = false;
  copiedPass = false;
  isLoadingPreview = false;
  isDownloading = false;

  private readonly destroy$ = new Subject<void>();

  constructor() {
    addIcons({
      closeOutline,
      copyOutline,
      downloadOutline,
      printOutline,
      qrCodeOutline,
      wifiOutline,
      checkmarkOutline,
      linkOutline,
      restaurantOutline,
      locationOutline,
      peopleOutline,
      keyOutline,
      lockClosedOutline
    });
  }

  ngOnInit(): void {
    this.appSettingsService.settings$
      .pipe(takeUntil(this.destroy$))
      .subscribe((settings: AppSettings | null) => {
        this.settings = settings;
        this.updateOrderUrl();
        this.loadQrPreview();
      });
  }

  ngOnDestroy(): void {
    if (this.currentRawBlobUrl) {
      URL.revokeObjectURL(this.currentRawBlobUrl);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateOrderUrl(): void {
    if (!this.table) {
      return;
    }
    const baseUrl = this.settings?.clientBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://openbar.lan');
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.orderUrl = `${cleanBase}/client/commande?table=${this.table.numero}`;
  }

  setMode(mode: QrModalMode): void {
    if (this.activeMode === mode) {
      return;
    }
    this.activeMode = mode;
    this.loadQrPreview();
  }

  loadQrPreview(): void {
    this.isLoadingPreview = true;

    if (this.activeMode === 'WIFI') {
      this.appSettingsService.downloadWifiQrCode(this.qrFormat, this.qrSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (blob) => {
            this.handleBlobSuccess(blob);
          },
          error: () => {
            this.isLoadingPreview = false;
            this.previewUrl = this.appSettingsService.getWifiQrCodeUrl(this.qrFormat, this.qrSize);
          }
        });
    } else {
      if (!this.table?.id) {
        this.isLoadingPreview = false;
        return;
      }
      this.tableService.downloadTableQrCode(this.table.id, this.qrFormat, this.qrSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (blob) => {
            this.handleBlobSuccess(blob);
          },
          error: () => {
            this.isLoadingPreview = false;
            this.previewUrl = this.tableService.getTableQrCodeUrl(this.table.id, this.qrFormat, this.qrSize);
          }
        });
    }
  }

  private handleBlobSuccess(blob: Blob): void {
    if (this.currentRawBlobUrl) {
      URL.revokeObjectURL(this.currentRawBlobUrl);
    }
    this.currentRawBlobUrl = URL.createObjectURL(blob);
    this.previewUrl = this.currentRawBlobUrl;
    this.isLoadingPreview = false;
  }

  setFormat(format: 'PNG' | 'SVG'): void {
    if (this.qrFormat === format) {
      return;
    }
    this.qrFormat = format;
    this.loadQrPreview();
  }

  async copyOrderUrl(): Promise<void> {
    if (!this.orderUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(this.orderUrl);
      this.copiedUrl = true;
      const toast = await this.toastCtrl.create({
        message: this.transloco.translate('TABLES.QR_COPIED_URL'),
        duration: 2500,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
      setTimeout(() => {
        this.copiedUrl = false;
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

  async copyWifiPassword(): Promise<void> {
    if (!this.settings?.wifiPassword) {
      return;
    }
    try {
      await navigator.clipboard.writeText(this.settings.wifiPassword);
      this.copiedPass = true;
      const toast = await this.toastCtrl.create({
        message: this.transloco.translate('TABLES.QR_WIFI_PASS_COPIED'),
        duration: 2500,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
      setTimeout(() => {
        this.copiedPass = false;
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

    if (this.activeMode === 'WIFI') {
      this.appSettingsService.downloadWifiQrCode(format, 600)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (blob) => {
            this.isDownloading = false;
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `openbar-wifi-qr.${format.toLowerCase()}`;
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
    } else {
      this.tableService.downloadTableQrCode(this.table.id, format, 600)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
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
  }

  printStandPdf(): void {
    this.isDownloading = true;
    this.tableService.downloadQrCodesPdf('STAND', [this.table.id], true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
