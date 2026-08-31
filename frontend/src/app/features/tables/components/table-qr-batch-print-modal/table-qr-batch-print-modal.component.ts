import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonIcon, IonSpinner, ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, printOutline, checkmarkCircle,
  ellipseOutline, layersOutline, wifiOutline,
  optionsOutline, documentTextOutline, gridOutline, copyOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TableBar } from '../../../../core/models/table.model';
import { TableService } from '../../../../core/services/table.service';
import { AppSettingsService } from '../../../../core/services/app-settings.service';
import { AppSettings } from '../../../../core/models/app-settings.model';

export type TableQrLayout = 'STAND' | 'CARD' | 'STICKER';

/**
 * Modal component allowing multi-table selection, export layout selection (Chevalet/Stand, Card, Sticker),
 * Wi-Fi QR toggle, and batch A4 PDF generation.
 */
@Component({
  selector: 'app-table-qr-batch-print-modal',
  templateUrl: './table-qr-batch-print-modal.component.html',
  styleUrls: ['./table-qr-batch-print-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonSpinner,
    TranslocoPipe
  ]
})
export class TableQrBatchPrintModalComponent implements OnInit {
  @Input() tables: TableBar[] = [];
  @Input() selectedTableIds: number[] = [];

  private readonly tableService = inject(TableService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  selectedLayout: TableQrLayout = 'STAND';
  includeWifi = true;
  selectAll = true;
  selectedIdsSet = new Set<number>();
  isGenerating = false;
  settings: AppSettings | null = null;

  constructor() {
    addIcons({
      closeOutline,
      printOutline,
      checkmarkCircle,
      ellipseOutline,
      layersOutline,
      wifiOutline,
      optionsOutline,
      documentTextOutline,
      gridOutline,
      copyOutline
    });
  }

  ngOnInit(): void {
    this.appSettingsService.settings$.subscribe((settings: AppSettings | null) => {
      this.settings = settings;
      if (!settings?.wifiEnabled || !settings?.wifiSsid) {
        this.includeWifi = false;
      }
    });

    if (this.tables.length === 0) {
      this.tableService.getAll().subscribe({
        next: (tables) => {
          this.tables = [...tables].sort((a, b) => a.numero - b.numero);
          this.initSelection();
        }
      });
    } else {
      this.tables = [...this.tables].sort((a, b) => a.numero - b.numero);
      this.initSelection();
    }
  }

  private initSelection(): void {
    if (this.selectedTableIds && this.selectedTableIds.length > 0) {
      this.selectAll = false;
      this.selectedIdsSet = new Set(this.selectedTableIds);
    } else {
      this.selectAll = true;
      this.selectedIdsSet = new Set(this.tables.map(t => t.id));
    }
  }

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.selectedIdsSet = new Set(this.tables.map(t => t.id));
    } else {
      this.selectedIdsSet.clear();
    }
  }

  toggleTableSelection(tableId: number): void {
    if (this.selectedIdsSet.has(tableId)) {
      this.selectedIdsSet.delete(tableId);
      this.selectAll = false;
    } else {
      this.selectedIdsSet.add(tableId);
      if (this.selectedIdsSet.size === this.tables.length) {
        this.selectAll = true;
      }
    }
  }

  isTableSelected(tableId: number): boolean {
    return this.selectedIdsSet.has(tableId);
  }

  setLayout(layout: TableQrLayout): void {
    this.selectedLayout = layout;
  }

  generatePdf(): void {
    if (this.selectedIdsSet.size === 0) {
      return;
    }
    this.isGenerating = true;
    const targetIds = this.selectAll ? undefined : Array.from(this.selectedIdsSet);

    this.tableService.downloadQrCodesPdf(this.selectedLayout, targetIds, this.includeWifi).subscribe({
      next: (blob) => {
        this.isGenerating = false;
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        const layoutSuffix = this.selectedLayout.toLowerCase();
        a.download = `openbar-tables-qrcodes-${layoutSuffix}.pdf`;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        this.dismiss();
      },
      error: async () => {
        this.isGenerating = false;
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('COMMON.ERROR'),
          duration: 3500,
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
