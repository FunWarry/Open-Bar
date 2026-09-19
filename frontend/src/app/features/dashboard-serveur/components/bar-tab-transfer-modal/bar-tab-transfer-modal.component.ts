import { Component, Input, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ModalController,
  IonIcon,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  swapHorizontalOutline,
  restaurantOutline,
  receiptOutline,
  checkmarkCircleOutline,
  checkmarkCircle,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';
import { BarTab } from '../../../../core/models/bar-tab.model';
import { BarTabService } from '../../../../core/services/bar-tab.service';
import { TableBar } from '../../../../core/models/table.model';
import { TableService } from '../../../../core/services/table.service';

export type TransferMode = 'TAB_TO_TABLE' | 'TABLE_TO_TAB';

/**
 * Modal dialog component for transferring orders seamlessly between physical tables and bar tabs.
 */
@Component({
  selector: 'app-bar-tab-transfer-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    TranslocoPipe,
    AppCurrencyPipe,
  ],
  templateUrl: './bar-tab-transfer-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./bar-tab-transfer-modal.component.scss'],
})
export class BarTabTransferModalComponent implements OnInit {
  /** Optional source tab if initiating from a tab */
  @Input() sourceTab?: BarTab;

  /** Optional source table ID if initiating from a table */
  @Input() sourceTableId?: number;

  /** Optional specific order ID if transferring a single order */
  @Input() orderId?: number;

  transferMode: TransferMode = 'TAB_TO_TABLE';

  tables: TableBar[] = [];
  tabs: BarTab[] = [];

  selectedTableId: number | null = null;
  selectedTabId: number | null = null;

  isLoading = false;
  isSubmitting = false;

  private readonly modalCtrl = inject(ModalController);
  private readonly barTabService = inject(BarTabService);
  private readonly tableService = inject(TableService);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    addIcons({
      closeOutline,
      swapHorizontalOutline,
      restaurantOutline,
      receiptOutline,
      checkmarkCircleOutline,
      checkmarkCircle,
    });
  }

  ngOnInit(): void {
    if (this.sourceTableId) {
      this.transferMode = 'TABLE_TO_TAB';
    } else {
      this.transferMode = 'TAB_TO_TABLE';
    }
    this.loadData();
  }

  /**
   * Loads active tables and tabs for selection.
   */
  loadData(): void {
    this.isLoading = true;
    this.tableService.getAll().subscribe({
      next: (tables: TableBar[]) => {
        this.tables = tables;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });

    this.tabs = this.barTabService.activeTabs().filter((t) => t.id !== this.sourceTab?.id);
  }

  dismiss(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  onModeChange(mode: TransferMode): void {
    this.transferMode = mode;
    this.selectedTableId = null;
    this.selectedTabId = null;
  }

  canSubmit(): boolean {
    if (this.transferMode === 'TAB_TO_TABLE') {
      return this.selectedTableId != null;
    }
    return this.selectedTabId != null;
  }

  async onConfirmTransfer(): Promise<void> {
    if (!this.canSubmit() || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    if (this.orderId && this.sourceTab) {
      // Transfer single order
      this.barTabService.transferSingleOrder(this.sourceTab.id, {
        commandeIds: [this.orderId],
        targetTableId: this.transferMode === 'TAB_TO_TABLE' ? this.selectedTableId! : undefined,
        targetTabId: this.transferMode === 'TABLE_TO_TAB' ? this.selectedTabId! : undefined,
      }).subscribe({
        next: async (res: BarTab) => {
          this.isSubmitting = false;
          await this.showToast(this.transloco.translate('TABS.SUCCESS_TRANSFERRED'), 'success');
          this.modalCtrl.dismiss(res, 'confirm');
        },
        error: async (err: unknown) => {
          this.isSubmitting = false;
          console.error('[BarTabTransferModal] Error transferring order:', err);
          await this.showToast(this.transloco.translate('TABS.ERROR_TRANSFER'), 'danger');
        },
      });
      return;
    }

    if (this.transferMode === 'TAB_TO_TABLE' && this.sourceTab) {
      this.barTabService.transferTabToTable(this.sourceTab.id, {
        targetTableId: this.selectedTableId!,
      }).subscribe({
        next: async (res: BarTab) => {
          this.isSubmitting = false;
          await this.showToast(this.transloco.translate('TABS.SUCCESS_TRANSFERRED'), 'success');
          this.modalCtrl.dismiss(res, 'confirm');
        },
        error: async (err: unknown) => {
          this.isSubmitting = false;
          console.error('[BarTabTransferModal] Error transferring tab to table:', err);
          await this.showToast(this.transloco.translate('TABS.ERROR_TRANSFER'), 'danger');
        },
      });
    } else if (this.transferMode === 'TABLE_TO_TAB' && this.sourceTableId && this.selectedTabId) {
      this.barTabService.transferOrdersFromTable(this.selectedTabId, {
        targetTableId: this.sourceTableId,
      }).subscribe({
        next: async (res: BarTab) => {
          this.isSubmitting = false;
          await this.showToast(this.transloco.translate('TABS.SUCCESS_TRANSFERRED'), 'success');
          this.modalCtrl.dismiss(res, 'confirm');
        },
        error: async (err: unknown) => {
          this.isSubmitting = false;
          console.error('[BarTabTransferModal] Error transferring table to tab:', err);
          await this.showToast(this.transloco.translate('TABS.ERROR_TRANSFER'), 'danger');
        },
      });
    }
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
    });
    await toast.present();
  }
}
