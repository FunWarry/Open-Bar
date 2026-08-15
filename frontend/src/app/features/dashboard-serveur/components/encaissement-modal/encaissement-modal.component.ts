import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonSpinner, IonBadge, IonSegment, IonSegmentButton,
  IonItem, IonLabel, IonInput, IonCheckbox, IonProgressBar,
  ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, cardOutline, cashOutline, walletOutline, printOutline,
  downloadOutline, peopleOutline, restaurantOutline, checkmarkCircleOutline,
  timeOutline, addOutline, removeOutline, pricetagOutline, receiptOutline,
  heartOutline, alertCircleOutline, refreshOutline, documentTextOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { TableView } from '../../models/table-view.model';
import {
  DashboardServeurService,
  TableAdditionResponse,
  TableAdditionItem,
  EncaissementRequest
} from '../../services/dashboard-serveur.service';
import { FactureService, SplitResultDTO } from '../../../factures/services/facture.service';
import { ReglementModalComponent, ReglementModalResult } from '../../../factures/reglement-modal/reglement-modal.component';
import { Facture } from '../../../factures/models/facture.model';
import { environment } from '../../../../../environments/environment';

/**
 * Encaissement and table payment modal component for server and manager dashboards.
 * Supports complete bill breakdown, single payment with cash calculator and tip/discount,
 * equal and item-based split payment workflows, thermal receipt printing, and PDF download.
 */
@Component({
  selector: 'app-encaissement-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CurrencyPipe, TranslocoModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonSpinner, IonBadge, IonSegment, IonSegmentButton,
    IonItem, IonLabel, IonInput, IonCheckbox, IonProgressBar
  ],
  templateUrl: './encaissement-modal.component.html',
  styleUrls: ['./encaissement-modal.component.scss']
})
export class EncaissementModalComponent implements OnInit, OnDestroy {
  /** The target table to settle */
  @Input({ required: true }) table!: TableView;

  /** Active addition data loaded from backend */
  addition: TableAdditionResponse | null = null;
  isLoading = true;
  isSubmitting = false;
  errorMessage: string | null = null;

  /** Main payment mode: single payment vs split payment */
  paymentTab: 'single' | 'split' = 'single';

  // --- Mode Paiement Unique ---
  modePaiement: string = 'CARTE';
  tipMode: 'none' | '5pct' | '10pct' | 'custom' = 'none';
  customTip = 0;
  discountMode: 'none' | 'percent' | 'fixed' = 'none';
  discountPercent = 0;
  discountFixed = 0;
  montantRecu: number | null = null;
  libererTable = true;
  notes = '';

  // --- Mode Division / Split ---
  splitMode: 'egal' | 'selection' = 'egal';
  nombreConvives = 2;
  convives: { nom: string }[] = [{ nom: '' }, { nom: '' }];
  itemAssignments: { [itemId: number]: number } = {};
  splitResults: SplitResultDTO[] = [];
  isLoadingSplit = false;
  splitError: string | null = null;
  partStates: { [guestIndex: number]: { reglee: boolean; modePaiement: string; pourboire?: number; totalPaid: number } } = {};

  /** Generated invoice once settled */
  settledFacture: Facture | null = null;

  private readonly dashboardService = inject(DashboardServeurService);
  private readonly factureService = inject(FactureService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  constructor() {
    addIcons({
      closeOutline, cardOutline, cashOutline, walletOutline, printOutline,
      downloadOutline, peopleOutline, restaurantOutline, checkmarkCircleOutline,
      timeOutline, addOutline, removeOutline, pricetagOutline, receiptOutline,
      heartOutline, alertCircleOutline, refreshOutline, documentTextOutline
    });
  }

  ngOnInit(): void {
    this.chargerAddition();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads table addition summary and active orders from the backend.
   */
  chargerAddition(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.dashboardService.getTableAddition(this.table.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: data => {
          this.addition = data;
          this.montantRecu = null;
        },
        error: () => {
          this.errorMessage = this.transloco.translate('ENCAISSEMENT.ERROR_LOADING_BILL');
        }
      });
  }

  // --- Financial Calculations (Paiement Unique) ---

  get subTotalTTC(): number {
    return this.addition?.totalTTC || 0;
  }

  get totalHT(): number {
    return this.addition?.totalHT || (this.subTotalTTC / 1.2);
  }

  get totalVAT(): number {
    return this.addition?.totalVAT || (this.subTotalTTC - this.totalHT);
  }

  get discountAmount(): number {
    if (this.discountMode === 'percent') {
      const pct = Math.max(0, Math.min(100, this.discountPercent || 0));
      return Math.round((this.subTotalTTC * pct / 100) * 100) / 100;
    }
    if (this.discountMode === 'fixed') {
      return Math.min(this.subTotalTTC, Math.max(0, this.discountFixed || 0));
    }
    return 0;
  }

  get netTotalBeforeTip(): number {
    return Math.max(0, Math.round((this.subTotalTTC - this.discountAmount) * 100) / 100);
  }

  get pourboire(): number {
    switch (this.tipMode) {
      case '5pct':
        return Math.round(this.netTotalBeforeTip * 0.05 * 100) / 100;
      case '10pct':
        return Math.round(this.netTotalBeforeTip * 0.10 * 100) / 100;
      case 'custom':
        return Math.max(0, this.customTip || 0);
      case 'none':
      default:
        return 0;
    }
  }

  get totalNetAPayer(): number {
    return Math.round((this.netTotalBeforeTip + this.pourboire) * 100) / 100;
  }

  get monnaieARendre(): number {
    if (this.modePaiement !== 'ESPECES' || !this.montantRecu) {
      return 0;
    }
    return Math.max(0, Math.round((this.montantRecu - this.totalNetAPayer) * 100) / 100);
  }

  get isMontantRecuSuffisant(): boolean {
    if (this.modePaiement !== 'ESPECES') {
      return true;
    }
    if (this.montantRecu === null || this.montantRecu === undefined) {
      return true;
    }
    return this.montantRecu >= this.totalNetAPayer;
  }

  // --- Fast Cash Buttons ---

  ajouterEspeces(montant: number): void {
    const current = this.montantRecu || 0;
    this.montantRecu = Math.round((current + montant) * 100) / 100;
  }

  definirMontantExact(): void {
    this.montantRecu = this.totalNetAPayer;
  }

  setTipMode(mode: 'none' | '5pct' | '10pct' | 'custom'): void {
    this.tipMode = mode;
    if (mode !== 'custom') {
      this.customTip = 0;
    }
  }

  setDiscountMode(mode: 'none' | 'percent' | 'fixed'): void {
    this.discountMode = mode;
    if (mode === 'none') {
      this.discountPercent = 0;
      this.discountFixed = 0;
    }
  }

  // --- Settlement Submission ---

  /**
   * Validates and submits table settlement.
   */
  validerEncaissement(): void {
    if (!this.addition || this.isSubmitting) return;

    if (this.modePaiement === 'ESPECES' && this.montantRecu !== null && this.montantRecu < this.totalNetAPayer) {
      return;
    }

    this.isSubmitting = true;
    const req: EncaissementRequest = {
      modePaiement: this.modePaiement,
      pourboire: this.pourboire > 0 ? this.pourboire : undefined,
      remiseMontant: this.discountMode === 'fixed' && this.discountFixed > 0 ? this.discountFixed : undefined,
      remisePourcentage: this.discountMode === 'percent' && this.discountPercent > 0 ? this.discountPercent : undefined,
      montantRecu: this.modePaiement === 'ESPECES' && this.montantRecu ? this.montantRecu : undefined,
      notes: this.notes.trim() || undefined,
      libererTable: this.libererTable,
      commandeIds: this.addition.commandeIds
    };

    this.dashboardService.encaisserTable(this.table.id, req)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe({
        next: async (facture) => {
          this.settledFacture = facture;
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('ENCAISSEMENT.SUCCESS_TOAST', {
              numero: facture.numero,
              table: this.table.nom || this.table.id
            }),
            duration: 3000,
            color: 'success'
          });
          await toast.present();
          this.modalCtrl.dismiss({ action: 'settled', facture });
        },
        error: async (err) => {
          const msg = err?.error?.message || this.transloco.translate('ENCAISSEMENT.ERROR_SETTLEMENT');
          const toast = await this.toastCtrl.create({
            message: msg,
            duration: 3500,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  // --- Split Addition Mode ---

  ajusterConvives(delta: number): void {
    this.nombreConvives = Math.max(2, Math.min(20, this.nombreConvives + delta));
  }

  addConvive(): void {
    if (this.convives.length < 20) {
      this.convives.push({ nom: '' });
    }
  }

  removeConvive(index: number): void {
    this.convives.splice(index, 1);
    Object.keys(this.itemAssignments).forEach(id => {
      const itemId = +id;
      if (this.itemAssignments[itemId] === index) {
        delete this.itemAssignments[itemId];
      } else if (this.itemAssignments[itemId] > index) {
        this.itemAssignments[itemId]--;
      }
    });
  }

  conviveNom(index: number): string {
    return this.convives[index]?.nom?.trim() || `Convive ${index + 1}`;
  }

  calculerSplitEgal(): void {
    if (!this.addition) return;
    this.isLoadingSplit = true;
    this.splitError = null;
    this.partStates = {};

    const base = this.subTotalTTC;
    const part = Math.round((base / this.nombreConvives) * 100) / 100;
    const results: SplitResultDTO[] = [];

    for (let i = 1; i <= this.nombreConvives; i++) {
      results.push({
        factureId: this.addition.existingFactureId || 0,
        nomConvive: `Convive ${i}`,
        items: [],
        sousTotal: part,
        totalAvecPourboire: part
      });
    }

    this.splitResults = results;
    this.isLoadingSplit = false;
  }

  calculerSplitSelection(): void {
    if (!this.addition) return;
    this.isLoadingSplit = true;
    this.splitError = null;
    this.partStates = {};

    const items = this.addition.items || [];
    const results: SplitResultDTO[] = [];

    this.convives.forEach((_, i) => {
      const assignedItems = items.filter(item => this.itemAssignments[item.itemId] === i);
      const subTotal = assignedItems.reduce((acc, it) => acc + it.total, 0);
      if (assignedItems.length > 0) {
        results.push({
          factureId: this.addition?.existingFactureId || 0,
          nomConvive: this.conviveNom(i),
          items: assignedItems.map(it => ({
            itemId: it.itemId,
            description: it.cocktailNom + (it.varianteNom ? ` (${it.varianteNom})` : ''),
            quantite: it.quantite,
            prixUnitaire: it.prixUnitaire,
            total: it.total
          })),
          sousTotal: Math.round(subTotal * 100) / 100,
          totalAvecPourboire: Math.round(subTotal * 100) / 100
        });
      }
    });

    this.splitResults = results;
    this.isLoadingSplit = false;
  }

  get montantTotalSplit(): number {
    return this.splitResults.reduce((acc, r) => acc + r.sousTotal, 0);
  }

  get montantRegleSplit(): number {
    return this.splitResults.reduce((acc, r, i) => {
      const state = this.partStates[i];
      return state?.reglee ? acc + r.sousTotal : acc;
    }, 0);
  }

  get soldeRestantSplit(): number {
    return Math.max(0, Math.round((this.subTotalTTC - this.montantRegleSplit) * 100) / 100);
  }

  get ratioRegleSplit(): number {
    if (!this.subTotalTTC || this.subTotalTTC <= 0) return 0;
    return Math.min(1, this.montantRegleSplit / this.subTotalTTC);
  }

  get toutesPartsReglees(): boolean {
    return this.splitResults.length > 0 && this.splitResults.every((_, i) => !!this.partStates[i]?.reglee);
  }

  async reglerPart(index: number, part: SplitResultDTO): Promise<void> {
    if (this.partStates[index]?.reglee) return;

    const modal = await this.modalCtrl.create({
      component: ReglementModalComponent,
      componentProps: {
        totalInitial: part.sousTotal,
        nomPart: part.nomConvive
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<ReglementModalResult>();

    if (!data) return;

    this.partStates[index] = {
      reglee: true,
      modePaiement: data.modePaiement,
      pourboire: data.pourboire,
      totalPaid: data.totalTotal
    };

    const toast = await this.toastCtrl.create({
      message: this.transloco.translate('ENCAISSEMENT.PART_SETTLED_SUCCESS', {
        nom: part.nomConvive,
        mode: data.modePaiement
      }),
      duration: 2000,
      color: 'success'
    });
    await toast.present();

    if (this.toutesPartsReglees) {
      this.finaliserReglementSplitGlobal();
    }
  }

  private finaliserReglementSplitGlobal(): void {
    const totalPourboires = Object.values(this.partStates).reduce((acc, s) => acc + (s.pourboire || 0), 0);
    const req: EncaissementRequest = {
      modePaiement: 'MIXTE_SPLIT',
      pourboire: totalPourboires > 0 ? totalPourboires : undefined,
      libererTable: this.libererTable,
      commandeIds: this.addition?.commandeIds
    };

    this.dashboardService.encaisserTable(this.table.id, req).subscribe({
      next: async (facture) => {
        this.settledFacture = facture;
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('ENCAISSEMENT.ALL_PARTS_SETTLED_SUCCESS'),
          duration: 3000,
          color: 'success'
        });
        await toast.present();
        this.modalCtrl.dismiss({ action: 'settled', facture });
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('ENCAISSEMENT.ERROR_SETTLEMENT'),
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  // --- Thermal Print & PDF Export ---

  telechargerPdf(): void {
    const id = this.settledFacture?.id || this.addition?.existingFactureId;
    if (id) {
      window.open(`${environment.apiUrl}/factures/${id}/pdf`, '_blank');
    }
  }

  imprimerRecu(): void {
    window.print();
  }

  fermer(): void {
    this.modalCtrl.dismiss();
  }

  trackByItemId(_index: number, item: TableAdditionItem): number {
    return item.itemId;
  }
}
