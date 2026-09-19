import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonIcon, IonSpinner, IonBadge, ModalController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline, receiptOutline, restaurantOutline, checkmarkCircleOutline,
  alertCircleOutline, arrowForwardOutline, cardOutline, peopleOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { TableService } from '../../../core/services/table.service';
import { TableBar } from '../../../core/models/table.model';
import { FactureService } from '../services/facture.service';
import { Facture, TableAdditionResponse } from '../models/facture.model';

/**
 * Result returned by the new invoice modal upon dismissal.
 */
export interface NouvelleFactureModalResult {
  action: 'created' | 'cancelled';
  facture?: Facture;
  openSplit?: boolean;
}

/**
 * Modal dialog enabling staff to select an active occupied table and generate its pending invoice.
 */
@Component({
  selector: 'app-nouvelle-facture-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    AppCurrencyPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
    IonBadge
  ],
  templateUrl: './nouvelle-facture-modal.component.html',
  styleUrls: ['./nouvelle-facture-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class NouvelleFactureModalComponent implements OnInit {
  private readonly tableService = inject(TableService);
  private readonly factureService = inject(FactureService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  occupiedTables: TableBar[] = [];
  selectedTable: TableBar | null = null;
  additionPreview: TableAdditionResponse | null = null;

  isLoadingTables = true;
  isLoadingPreview = false;
  isSubmitting = false;
  errorMessage: string | null = null;

  constructor() {
    addIcons({
      closeOutline,
      receiptOutline,
      restaurantOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      arrowForwardOutline,
      cardOutline,
      peopleOutline
    });
  }

  ngOnInit(): void {
    this.loadOccupiedTables();
  }

  /**
   * Fetches all occupied tables currently active on the floor plan.
   */
  loadOccupiedTables(): void {
    this.isLoadingTables = true;
    this.errorMessage = null;

    this.tableService.getAll().subscribe({
      next: (tables) => {
        this.occupiedTables = (tables || []).filter(t => t.occupee);
        this.isLoadingTables = false;
        if (this.occupiedTables.length === 1) {
          this.selectTable(this.occupiedTables[0]);
        }
      },
      error: () => {
        this.isLoadingTables = false;
        this.errorMessage = this.transloco.translate('FACTURES.NEW_INVOICE_MODAL.ERROR_LOADING_TABLES');
      }
    });
  }

  /**
   * Selects a table and loads its bill summary addition preview.
   *
   * @param table Selected table
   */
  selectTable(table: TableBar): void {
    if (this.selectedTable?.id === table.id && this.additionPreview) {
      return;
    }
    this.selectedTable = table;
    this.additionPreview = null;
    this.isLoadingPreview = true;

    this.factureService.getTableAddition(table.id).subscribe({
      next: (addition) => {
        this.additionPreview = addition;
        this.isLoadingPreview = false;
      },
      error: () => {
        this.isLoadingPreview = false;
        this.additionPreview = null;
      }
    });
  }

  /**
   * Generates the invoice for the selected table and dismisses the modal.
   *
   * @param openSplit Whether to transition directly into the split bill view
   */
  generateInvoice(openSplit = false): void {
    if (!this.selectedTable || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.factureService.genererFactureTable(this.selectedTable.id).subscribe({
      next: async (facture) => {
        this.isSubmitting = false;
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('FACTURES.NEW_INVOICE_MODAL.SUCCESS_TOAST', {
            numero: facture.numero,
            table: this.selectedTable?.numero
          }),
          duration: 3000,
          color: 'success'
        });
        await toast.present();

        this.modalCtrl.dismiss({
          action: 'created',
          facture,
          openSplit
        } satisfies NouvelleFactureModalResult);
      },
      error: async (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message || this.transloco.translate('FACTURES.NEW_INVOICE_MODAL.ERROR_GENERATION');
        const toast = await this.toastCtrl.create({
          message: msg,
          duration: 3500,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  /**
   * Closes the modal without action.
   */
  close(): void {
    this.modalCtrl.dismiss({ action: 'cancelled' } satisfies NouvelleFactureModalResult);
  }
}
