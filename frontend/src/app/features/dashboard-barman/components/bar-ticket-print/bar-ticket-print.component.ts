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
   * Triggers native print dialog.
   */
  printTicket(): void {
    window.print();
  }

  /**
   * Dismisses the modal dialog.
   */
  dismiss(): void {
    this.modalCtrl?.dismiss();
  }
}
