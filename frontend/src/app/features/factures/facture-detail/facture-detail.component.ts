import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import {
  IonContent, IonIcon, ToastController,
  ModalController, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  downloadOutline, peopleOutline, checkmarkCircleOutline, printOutline,
  documentTextOutline, arrowBackOutline, receiptOutline, businessOutline,
  locationOutline, callOutline, fastFoodOutline, bagOutline, informationCircleOutline
} from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { FactureService } from '../services/facture.service';
import { Facture, FactureItem, FactureReglement } from '../models/facture.model';
import { TicketReceiptComponent } from '../ticket-receipt/ticket-receipt.component';
import { ReglementModalComponent, ReglementModalResult } from '../reglement-modal/reglement-modal.component';
import { FactureSplitComponent } from '../facture-split/facture-split.component';
import { EstablishmentConfig } from '../../../core/models/establishment-config.model';
import { EtablissementService } from '../../../core/services/etablissement.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-facture-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, TranslocoModule, TicketReceiptComponent,
    IonContent, IonIcon, IonSpinner, AppCurrencyPipe
  ],
  templateUrl: './facture-detail.component.html',
  styleUrls: ['./facture-detail.component.scss'],
})
export class FactureDetailComponent implements OnInit, OnDestroy {
  facture: Facture | null = null;
  establishmentConfig: EstablishmentConfig | null = null;
  activeView: 'invoice' | 'ticket' = 'invoice';

  private readonly route = inject(ActivatedRoute);
  private readonly factureService = inject(FactureService);
  private readonly etablissementService = inject(EtablissementService);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);
  private readonly destroy$ = new Subject<void>();

  constructor() {
    addIcons({
      downloadOutline, peopleOutline, checkmarkCircleOutline, printOutline,
      documentTextOutline, arrowBackOutline, receiptOutline, businessOutline,
      locationOutline, callOutline, fastFoodOutline, bagOutline, informationCircleOutline
    });
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => this.factureService.getFactureById(Number(params.get('id')))),
      takeUntil(this.destroy$)
    ).subscribe({ next: f => this.facture = f });

    this.etablissementService.getConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: config => this.establishmentConfig = config, error: () => {} });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onViewChange(event: CustomEvent): void {
    const val = event.detail.value;
    if (val === 'invoice' || val === 'ticket') {
      this.activeView = val;
    }
  }

  get displayedAmount(): number {
    return this.facture?.totalTTC ?? this.facture?.total ?? 0;
  }

  get montantAffiche(): number {
    return this.displayedAmount;
  }

  get totalHT(): number {
    return this.facture?.totalHT ?? (this.displayedAmount / 1.2);
  }

  get totalVAT(): number {
    return this.facture?.totalVAT ?? (this.displayedAmount - this.totalHT);
  }

  /**
   * Computes the unit price excluding taxes (P.U. HT) for an invoice item.
   *
   * @param item Invoice item
   * @returns Unit price HT
   */
  getItemPuHT(item: FactureItem): number {
    const qty = Math.max(1, item.quantite);
    if (item.priceHT !== undefined && item.priceHT !== null) {
      return item.priceHT / qty;
    }
    const rate = this.parseVatRate(item.vatRate);
    return (item.prixUnitaire || 0) / (1 + rate);
  }

  /**
   * Computes the line total excluding taxes (Total HT) for an invoice item.
   *
   * @param item Invoice item
   * @returns Line total HT
   */
  getItemTotalHT(item: FactureItem): number {
    if (item.priceHT !== undefined && item.priceHT !== null) {
      return item.priceHT;
    }
    const rate = this.parseVatRate(item.vatRate);
    const total = item.total ?? ((item.prixUnitaire || 0) * item.quantite);
    return total / (1 + rate);
  }

  /**
   * Computes the line VAT amount for an invoice item.
   *
   * @param item Invoice item
   * @returns VAT amount
   */
  getItemVatAmount(item: FactureItem): number {
    if (item.vatAmount !== undefined && item.vatAmount !== null) {
      return item.vatAmount;
    }
    const total = item.total ?? ((item.prixUnitaire || 0) * item.quantite);
    return total - this.getItemTotalHT(item);
  }

  /**
   * Groups invoice items by VAT rate to display the tax breakdown table.
   */
  get vatBreakdown(): { rateLabel: string; baseHT: number; amountVAT: number; totalTTC: number }[] {
    if (!this.facture?.items || this.facture.items.length === 0) {
      return [{
        rateLabel: '20%',
        baseHT: this.totalHT,
        amountVAT: this.totalVAT,
        totalTTC: this.displayedAmount - (this.facture?.pourboire || 0),
      }];
    }

    const groups = new Map<string, { rateLabel: string; baseHT: number; amountVAT: number; totalTTC: number }>();

    for (const item of this.facture.items) {
      const label = item.vatRate || '20%';
      const baseHT = this.getItemTotalHT(item);
      const amountVAT = this.getItemVatAmount(item);
      const totalTTC = item.total ?? ((item.prixUnitaire || 0) * item.quantite);

      const existing = groups.get(label) || { rateLabel: label, baseHT: 0, amountVAT: 0, totalTTC: 0 };
      existing.baseHT += baseHT;
      existing.amountVAT += amountVAT;
      existing.totalTTC += totalTTC;
      groups.set(label, existing);
    }

    return Array.from(groups.values());
  }

  private parseVatRate(rateStr?: string): number {
    if (!rateStr) return 0.20;
    if (rateStr.includes('5.5') || rateStr.includes('5,5')) return 0.055;
    if (rateStr.includes('10')) return 0.10;
    return 0.20;
  }

  statusColor(settled: boolean): string {
    return settled ? 'success' : 'warning';
  }

  statutColor(reglee: boolean): string {
    return this.statusColor(reglee);
  }

  statusLabel(settled: boolean): string {
    return settled ? 'FACTURES.SETTLED' : 'FACTURES.PENDING';
  }

  statutLabel(reglee: boolean): string {
    return this.statusLabel(reglee);
  }

  trackById(_: number, item: FactureItem) {
    return item.id;
  }

  downloadPdf() {
    if (this.facture) {
      window.open(`${environment.apiUrl}/factures/${this.facture.id}/pdf`, '_blank');
    }
  }

  telechargerPdf() {
    this.downloadPdf();
  }

  async settleFacture() {
    if (!this.facture || this.facture.reglee) return;

    const modal = await this.modalCtrl.create({
      component: ReglementModalComponent,
      componentProps: {
        totalInitial: this.displayedAmount,
        invoiceNumber: this.facture.numero,
        tableNumber: this.facture.tableNumero
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<ReglementModalResult>();

    if (!data) return;

    this.factureService.reglerFacture(this.facture.id, data.modePaiement, data.pourboire)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async f => {
          this.facture = f;
          const toast = await this.toastCtrl.create({
            message: 'FACTURES.SETTLE_SUCCESS',
            duration: 2000,
            color: 'success'
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'FACTURES.SETTLE_ERROR',
            duration: 3000,
            color: 'danger'
          });
          toast.present();
        },
      });
  }

  async openSplitModal() {
    if (!this.facture) return;

    const modal = await this.modalCtrl.create({
      component: FactureSplitComponent,
      componentProps: {
        factureId: this.facture.id,
        facture: this.facture
      }
    });

    await modal.present();
    await modal.onWillDismiss();

    // Reload invoice data to reflect any settlements done during split
    this.factureService.getFactureById(this.facture.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: f => this.facture = f });
  }

  async reglerFacture() {
    await this.settleFacture();
  }

  /**
   * Opens the thermal receipt preview modal for a specific individual split payment share.
   *
   * @param reglement Split settlement details
   */
  async imprimerTicketPart(reglement: FactureReglement) {
    if (!this.facture) return;

    const modal = await this.modalCtrl.create({
      component: TicketReceiptComponent,
      componentProps: {
        facture: this.facture,
        reglement: reglement,
        establishmentConfig: this.establishmentConfig || undefined,
      },
      cssClass: 'ticket-modal',
    });
    await modal.present();
  }
}

