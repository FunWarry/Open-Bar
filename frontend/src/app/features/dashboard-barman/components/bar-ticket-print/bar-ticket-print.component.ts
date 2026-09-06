import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonFooter,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { printOutline, closeOutline, hardwareChipOutline } from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CommandeView, CommandeItemView } from '../../models/commande-view.model';
import { groupCommandeItems } from '../../../../core/utils/order-item-grouper';
import { AppSettingsService } from '../../../../core/services/app-settings.service';
import { PrinterService } from '../../../../core/services/printer.service';

/**
 * Bar preparation thermal receipt component formatted specifically for 80mm bar counter printers.
 */
@Component({
  selector: 'app-bar-ticket-print',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TranslocoPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonFooter
  ],
  templateUrl: './bar-ticket-print.component.html',
  styleUrls: ['./bar-ticket-print.component.scss']
})
export class BarTicketPrintComponent implements OnInit {
  @Input({ required: true }) commande!: CommandeView;

  establishmentName = 'OpenBar';
  isDirectPrinting = false;
  readonly now = new Date();

  private readonly modalCtrl = inject(ModalController, { optional: true });
  private readonly settingsService = inject(AppSettingsService, { optional: true });
  private readonly printerService = inject(PrinterService, { optional: true });
  private readonly toastCtrl = inject(ToastController, { optional: true });
  private readonly translocoService = inject(TranslocoService);

  constructor() {
    addIcons({ printOutline, closeOutline, hardwareChipOutline });
  }

  ngOnInit(): void {
    if (this.settingsService) {
      this.settingsService.getSettings().subscribe({
        next: settings => {
          if (settings.establishmentName) {
            this.establishmentName = settings.establishmentName;
          }
        },
        error: () => {}
      });
    }
  }

  /**
   * Returns grouped items consolidating duplicate lines.
   */
  get groupedItems(): CommandeItemView[] {
    return groupCommandeItems(this.commande?.items) as CommandeItemView[];
  }

  /**
   * Calculates total items quantity.
   */
  get totalItemsCount(): number {
    return this.groupedItems.reduce((acc, item) => acc + (item.quantite || 1), 0);
  }

  /**
   * Triggers isolated 80mm thermal receipt printing without browser backdrop or UI interference.
   */
  printTicket(): void {
    const receiptEl = document.querySelector('.thermal-receipt') as HTMLElement;
    if (!receiptEl) {
      window.print();
      return;
    }

    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';

    printIframe.srcdoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket Bar #${this.commande?.id ?? ''}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 6mm 4mm;
              font-family: 'Courier Prime', 'Courier New', Courier, monospace;
              font-size: 13px;
              line-height: 1.4;
              color: #000000;
              background: #ffffff;
              width: 80mm;
              box-sizing: border-box;
            }
            .establishment-title { font-size: 17px; font-weight: 800; text-align: center; margin: 0 0 4px; text-transform: uppercase; }
            .ticket-type { font-size: 11px; font-weight: 700; text-align: center; margin-bottom: 6px; }
            .receipt-divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .meta-row { display: flex; justify-content: space-between; margin: 2px 0; }
            .highlight-table { font-size: 16px; font-weight: 900; margin: 4px 0; }
            .priority-banner { border: 1px dashed #000; text-align: center; font-weight: 800; padding: 4px; margin: 6px 0; }
            .receipt-items { display: flex; flex-direction: column; gap: 6px; }
            .item-main { display: flex; gap: 8px; font-weight: 700; font-size: 14px; }
            .item-qty { min-width: 24px; }
            .item-sub, .item-note { font-size: 12px; padding-left: 32px; font-weight: normal; }
            .receipt-notes { border-left: 2px solid #000; padding-left: 6px; margin: 6px 0; font-size: 12px; }
            .summary-row { display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; }
            .receipt-footer { text-align: center; font-size: 11px; margin-top: 8px; }
          </style>
        </head>
        <body>
          ${receiptEl.innerHTML}
        </body>
      </html>
    `;

    printIframe.onload = () => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        printIframe.remove();
      }, 1000);
    };

    document.body.appendChild(printIframe);
  }

  /**
   * Directly dispatches the order to the configured ESC/POS thermal printers via TCP socket.
   */
  printDirectEscPos(): void {
    if (!this.commande?.id || !this.printerService) return;
    this.isDirectPrinting = true;
    this.printerService.dispatchOrder(this.commande.id).subscribe({
      next: (results) => {
        this.isDirectPrinting = false;
        const allSuccess = results && results.length > 0 && results.every(r => r.success);
        if (allSuccess) {
          this.showToast(
            this.translocoService.translate('BARMAN_DASHBOARD.DIRECT_PRINT_SUCCESS', { id: this.commande.id }),
            'success'
          );
        } else {
          const errors = (results || []).filter(r => !r.success).map(r => `${r.role}: ${r.message}`).join(', ');
          this.showToast(
            this.translocoService.translate('BARMAN_DASHBOARD.DIRECT_PRINT_FAILED', { error: errors || 'Erreur' }),
            'warning'
          );
        }
      },
      error: (err) => {
        this.isDirectPrinting = false;
        this.showToast(
          this.translocoService.translate('BARMAN_DASHBOARD.DIRECT_PRINT_FAILED', { error: err?.message || 'Error' }),
          'danger'
        );
      },
    });
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    if (this.toastCtrl) {
      const toast = await this.toastCtrl.create({
        message,
        duration: 3000,
        color,
        position: 'bottom',
      });
      await toast.present();
    }
  }

  /**
   * Dismisses the ticket printing modal dialog.
   */
  dismiss(): void {
    if (this.modalCtrl) {
      this.modalCtrl.dismiss();
    }
  }
}
