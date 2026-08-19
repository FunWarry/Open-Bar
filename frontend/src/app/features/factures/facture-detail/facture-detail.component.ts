import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import {
  IonContent, IonButton, IonIcon, ToastController,
  ModalController, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  downloadOutline, peopleOutline, checkmarkCircleOutline, printOutline,
  documentTextOutline, arrowBackOutline, receiptOutline, businessOutline,
  locationOutline, callOutline, fastFoodOutline, bagOutline, informationCircleOutline
} from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { FactureService } from '../services/facture.service';
import { Facture, FactureItem } from '../models/facture.model';
import { TicketReceiptComponent } from '../ticket-receipt/ticket-receipt.component';
import { ReglementModalComponent, ReglementModalResult } from '../reglement-modal/reglement-modal.component';
import { EstablishmentConfig } from '../../../core/models/establishment-config.model';
import { EtablissementService } from '../../../core/services/etablissement.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-facture-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, TranslocoModule, TicketReceiptComponent,
    IonContent, IonButton, IonIcon, IonSpinner
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
        totalInitial: this.displayedAmount
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

  async reglerFacture() {
    await this.settleFacture();
  }
}

