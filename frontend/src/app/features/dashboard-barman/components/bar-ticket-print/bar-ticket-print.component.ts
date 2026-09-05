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
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { printOutline, closeOutline } from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommandeView, CommandeItemView } from '../../models/commande-view.model';
import { groupCommandeItems } from '../../../../core/utils/order-item-grouper';
import { AppSettingsService } from '../../../../core/services/app-settings.service';

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
  readonly now = new Date();

  private readonly modalCtrl = inject(ModalController, { optional: true });
  private readonly settingsService = inject(AppSettingsService, { optional: true });

  constructor() {
    addIcons({ printOutline, closeOutline });
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
   * Dismisses the ticket printing modal dialog.
   */
  dismiss(): void {
    if (this.modalCtrl) {
      this.modalCtrl.dismiss();
    }
  }
}
