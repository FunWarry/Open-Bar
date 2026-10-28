import { Component, Input, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonSpinner, IonBadge, IonSegment, IonSegmentButton,
  IonLabel, IonProgressBar,
  ModalController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline, cardOutline, cashOutline, walletOutline, printOutline,
  downloadOutline, peopleOutline, restaurantOutline, checkmarkCircleOutline,
  timeOutline, addOutline, removeOutline, pricetagOutline, receiptOutline,
  heartOutline, alertCircleOutline, refreshOutline, documentTextOutline,
  arrowBackOutline, pieChartOutline, personOutline, trashOutline,
  arrowDownCircleOutline, calculatorOutline, sparklesOutline, listOutline,
  closeCircleOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';
import { AppSettingsService } from '../../../../core/services/app-settings.service';
import { CashDenomination } from '../../../../core/models/cash-denomination.model';
import { DiscountTier } from '../../../../core/models/app-settings.model';
import { CheckboxFieldComponent } from '../../../../core/components/ui/checkbox-field/checkbox-field.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { TableView } from '../../models/table-view.model';
import {
  DashboardServeurService,
  TableAdditionResponse,
  TableAdditionItem,
  EncaissementRequest
} from '../../services/dashboard-serveur.service';
import { FactureService, SplitResultDTO } from '../../../factures/services/facture.service';
import { Facture, EncaisserPartRequest, TypeSplit, FactureReglement } from '../../../factures/models/facture.model';
import { environment } from '../../../../../environments/environment';
import { BarTab } from '../../../../core/models/bar-tab.model';
import { BarTabService } from '../../../../core/services/bar-tab.service';
import { PaymentTerminalService } from '../../../../core/services/payment-terminal.service';
import { FeatureFlagService } from '../../../../core/services/feature-flag.service';
import { TpePaymentRequestDTO, TpePaymentResponseDTO, TpeTerminalRole } from '../../../../core/models/tpe.model';

/**
 * Encaissement and table payment modal component for server and manager dashboards.
 * Supports complete bill breakdown, single payment with cash calculator and tip/discount,
 * equal, custom amount, custom percentage, and item-based split payment workflows,
 * thermal receipt printing, and PDF download.
 */
/** Available tip selection modes */
export type EncaissementTipMode = 'none' | '5pct' | '10pct' | '15pct' | 'custom' | 'custom_percent';

/** Available discount selection modes */
export type EncaissementDiscountMode = 'none' | 'percent' | 'fixed';

/** Available split modes */
export type EncaissementSplitMode = 'egal' | 'libre' | 'pourcentage' | 'selection';

/** Main encaissement tabs */
export type EncaissementTab = 'single' | 'split';

/** Denomination breakdown item for optimal cash return */
export interface OptimalChangeItem {
  value: number;
  count: number;
  type: 'bill' | 'coin';
  label: string;
}

@Component({
  selector: 'app-encaissement-modal',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    AppCurrencyPipe,
    TranslocoModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonSpinner, IonBadge, IonSegment, IonSegmentButton,
    IonLabel, IonProgressBar, CheckboxFieldComponent, ActionButtonComponent
  ],
  templateUrl: './encaissement-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./encaissement-modal.component.scss']
})
export class EncaissementModalComponent implements OnInit, OnDestroy {
  private readonly appSettingsService = inject(AppSettingsService);

  get currencySymbol(): string {
    return this.appSettingsService.currencySymbol;
  }

  /** The target table to settle (if settling a table) */
  @Input() table?: TableView;

  /** The target bar tab to settle (if settling a bar tab) */
  @Input() tab?: BarTab;

  /** Starting payment tab ('single' | 'split') */
  @Input() initialTab: EncaissementTab = 'single';

  /** Active addition data loaded from backend */
  addition: TableAdditionResponse | null = null;
  isLoading = true;
  isSubmitting = false;
  errorMessage: string | null = null;

  /** Main payment mode: single payment vs split payment */
  paymentTab: EncaissementTab = 'single';

  // --- Mode Paiement Unique ---
  modePaiement: string = 'CARTE';
  tipMode: EncaissementTipMode = 'none';
  customTip = 0;
  customTipPercent = 0;
  discountMode: EncaissementDiscountMode = 'none';
  discountPercent = 0;
  discountFixed = 0;
  selectedTierId: string | null = null;
  discountTiers: DiscountTier[] = [];
  montantRecu: number | null = null;
  libererTable = true;
  notes = '';

  // --- Mode Division / Split ---
  splitMode: EncaissementSplitMode = 'egal';
  readonly guestPresets = [2, 3, 4, 5, 6];
  nombreConvives = 2;
  convives: { nom: string }[] = [{ nom: '' }, { nom: '' }];
  /** Map storing guest index assigned to each unit key (e.g. "101_0", "101_1"). */
  unitAssignments: { [unitKey: string]: number } = {};

  /** Compatibility accessor for legacy tests and bindings. */
  get itemAssignments(): { [itemId: number]: number } {
    const map: { [itemId: number]: number } = {};
    if (this.addition?.items) {
      for (const item of this.addition.items) {
        if (this.unitAssignments[`${item.itemId}_0`] !== undefined) {
          map[item.itemId] = this.unitAssignments[`${item.itemId}_0`];
        }
      }
    }
    return map;
  }
  set itemAssignments(val: { [itemId: number]: number }) {
    if (val && this.addition?.items) {
      Object.keys(val).forEach(id => {
        const itemId = +id;
        const gIdx = val[itemId];
        const item = this.addition?.items?.find(i => i.itemId === itemId);
        const qte = item?.quantite || 1;
        for (let u = 0; u < qte; u++) {
          this.unitAssignments[`${itemId}_${u}`] = gIdx;
        }
      });
    }
  }

  get guests(): { name: string }[] {
    return this.convives.map(c => ({ name: c.nom }));
  }
  set guests(val: { name: string }[]) {
    this.convives = val.map(g => ({ nom: g.name }));
  }

  splitResults: SplitResultDTO[] = [];
  isLoadingSplit = false;
  splitError: string | null = null;
  partStates: {
    [guestIndex: number]: {
      reglee: boolean;
      modePaiement: string;
      pourboire?: number;
      totalPaid: number;
      reglement?: FactureReglement;
      tpeAutorisation?: string;
      tpeTerminalId?: string;
      tpeCardBrand?: string;
      tpeMaskedPan?: string;
      tpeSequence?: string;
    };
  } = {};

  // Part settling state (in-modal settlement)
  settlingPartIndex: number | null = null;
  settlingPart: SplitResultDTO | null = null;
  partPaymentMode: string = 'CARTE';
  partTipMode: EncaissementTipMode = 'none';
  partCustomTip = 0;
  partCustomTipPercent = 0;
  partDiscountMode: EncaissementDiscountMode = 'none';
  partDiscountPercent = 0;
  partDiscountFixed = 0;
  partSelectedTierId: string | null = null;
  partMontantRecu: number | null = null;

  // Prix libre
  customAmountGuests: { nom: string; montant: number | null }[] = [
    { nom: '', montant: null },
    { nom: '', montant: null }
  ];

  // Pourcentage
  customPercentageGuests: { nom: string; pourcentage: number | null }[] = [
    { nom: '', pourcentage: null },
    { nom: '', pourcentage: null }
  ];

  /** Generated invoice once settled */
  settledFacture: Facture | null = null;

  private readonly dashboardService = inject(DashboardServeurService);
  private readonly factureService = inject(FactureService);
  private readonly barTabService = inject(BarTabService, { optional: true });
  private readonly paymentTerminalService = inject(PaymentTerminalService);
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  readonly paymentTerminalEnabled = this.featureFlagService.paymentTerminalEnabled;
  readonly activeTpeTransaction = signal<TpePaymentResponseDTO | null>(null);
  readonly isTpeProcessing = signal<boolean>(false);
  readonly tpeErrorMessage = signal<string | null>(null);
  readonly preferredTpeRole = signal<TpeTerminalRole>(this.paymentTerminalService.preferredRole);
  tpeMetadata: {
    tpeAutorisation?: string;
    tpeTerminalId?: string;
    tpeCardBrand?: string;
    tpeMaskedPan?: string;
    tpeSequence?: string;
  } = {};

  constructor() {
    this.discountTiers = this.appSettingsService.getDiscountTiers();
    addIcons({
      closeOutline, cardOutline, cashOutline, walletOutline, printOutline,
      downloadOutline, peopleOutline, restaurantOutline, checkmarkCircleOutline,
      timeOutline, addOutline, removeOutline, pricetagOutline, receiptOutline,
      heartOutline, alertCircleOutline, refreshOutline, documentTextOutline,
      arrowBackOutline, pieChartOutline, personOutline, trashOutline,
      arrowDownCircleOutline, calculatorOutline, sparklesOutline, listOutline,
      closeCircleOutline
    });
  }

  ngOnInit(): void {
    this.paymentTab = this.initialTab || 'single';
    this.discountTiers = this.appSettingsService.getDiscountTiers();
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

    let addition$: Observable<TableAdditionResponse> | null = null;
    if (this.tab && this.barTabService) {
      addition$ = this.barTabService.getTabAddition(this.tab.id);
    } else if (this.table) {
      addition$ = this.dashboardService.getTableAddition(this.table.id);
    }

    if (!addition$) {
      this.isLoading = false;
      return;
    }

    addition$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (data: TableAdditionResponse) => {
          this.addition = data;
          this.montantRecu = null;
          if (this.paymentTab === 'split' && this.splitResults.length === 0) {
            this.calculerSplitEgal();
          }
        },
        error: () => {
          this.errorMessage = this.transloco.translate('ENCAISSEMENT.ERROR_LOADING_BILL');
        }
      });
  }

  // --- Financial Calculations (Paiement Unique) ---

  get billTotalTTC(): number {
    return this.addition?.totalTTC || 0;
  }

  get alreadyPaidAmount(): number {
    return this.addition?.alreadyPaidAmount || 0;
  }

  get subTotalTTC(): number {
    if (this.addition?.remainingBalance !== undefined && this.addition?.remainingBalance !== null) {
      return this.addition.remainingBalance;
    }
    return Math.max(0, Math.round(((this.addition?.totalTTC || 0) - this.alreadyPaidAmount) * 100) / 100);
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
      case '15pct':
        return Math.round(this.netTotalBeforeTip * 0.15 * 100) / 100;
      case 'custom_percent':
        return Math.round(this.netTotalBeforeTip * (this.customTipPercent || 0) / 100 * 100) / 100;
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

  get discountLabel(): string {
    if (this.selectedTierId) {
      const tier = this.discountTiers.find(t => t.id === this.selectedTierId);
      if (tier) {
        return `${tier.label} (-${tier.value}${tier.type === 'percent' ? '%' : this.currencySymbol})`;
      }
    }
    if (this.discountMode === 'percent' && this.discountPercent > 0) {
      return `-${this.discountPercent}%`;
    }
    if (this.discountMode === 'fixed' && this.discountFixed > 0) {
      return `-${this.discountFixed} ${this.currencySymbol}`;
    }
    return '';
  }

  get tipLabel(): string {
    switch (this.tipMode) {
      case '5pct':
        return '+5%';
      case '10pct':
        return '+10%';
      case '15pct':
        return '+15%';
      case 'custom_percent':
        return `+${this.customTipPercent || 0}%`;
      case 'custom':
        return `+${this.customTip || 0} ${this.currencySymbol}`;
      default:
        return '';
    }
  }

  // --- Financial Calculations (Part Settlement) ---

  get partSubTotal(): number {
    return this.settlingPart?.sousTotal || 0;
  }

  get partDiscountAmount(): number {
    if (this.partDiscountMode === 'percent') {
      const pct = Math.max(0, Math.min(100, this.partDiscountPercent || 0));
      return Math.round((this.partSubTotal * pct / 100) * 100) / 100;
    }
    if (this.partDiscountMode === 'fixed') {
      return Math.min(this.partSubTotal, Math.max(0, this.partDiscountFixed || 0));
    }
    return 0;
  }

  get partDiscountLabel(): string {
    if (this.partSelectedTierId) {
      const tier = this.discountTiers.find(t => t.id === this.partSelectedTierId);
      if (tier) {
        return `${tier.label} (-${tier.value}${tier.type === 'percent' ? '%' : this.currencySymbol})`;
      }
    }
    if (this.partDiscountMode === 'percent' && this.partDiscountPercent > 0) {
      return `-${this.partDiscountPercent}%`;
    }
    if (this.partDiscountMode === 'fixed' && this.partDiscountFixed > 0) {
      return `-${this.partDiscountFixed} ${this.currencySymbol}`;
    }
    return '';
  }

  get partNetBeforeTip(): number {
    return Math.max(0, Math.round((this.partSubTotal - this.partDiscountAmount) * 100) / 100);
  }

  get partPourboire(): number {
    switch (this.partTipMode) {
      case '5pct':
        return Math.round(this.partNetBeforeTip * 0.05 * 100) / 100;
      case '10pct':
        return Math.round(this.partNetBeforeTip * 0.10 * 100) / 100;
      case '15pct':
        return Math.round(this.partNetBeforeTip * 0.15 * 100) / 100;
      case 'custom_percent':
        return Math.round(this.partNetBeforeTip * (this.partCustomTipPercent || 0) / 100 * 100) / 100;
      case 'custom':
        return Math.max(0, this.partCustomTip || 0);
      default:
        return 0;
    }
  }

  get partTipLabel(): string {
    switch (this.partTipMode) {
      case '5pct':
        return '+5%';
      case '10pct':
        return '+10%';
      case '15pct':
        return '+15%';
      case 'custom_percent':
        return `+${this.partCustomTipPercent || 0}%`;
      case 'custom':
        return `+${this.partCustomTip || 0} ${this.currencySymbol}`;
      default:
        return '';
    }
  }

  get partTotalNetAPayer(): number {
    return Math.round((this.partNetBeforeTip + this.partPourboire) * 100) / 100;
  }

  get partMonnaieARendre(): number {
    if (this.partPaymentMode !== 'ESPECES' || !this.partMontantRecu) {
      return 0;
    }
    return Math.max(0, Math.round((this.partMontantRecu - this.partTotalNetAPayer) * 100) / 100);
  }

  get isPartMontantRecuSuffisant(): boolean {
    if (this.partPaymentMode !== 'ESPECES') {
      return true;
    }
    return (this.partMontantRecu || 0) >= this.partTotalNetAPayer;
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

  // --- Fast Cash Denominations & Smart Shortcuts ---

  /**
   * Cash denominations dynamically queried from establishment configuration (bills & coins).
   */
  get configuredCashDenominations(): CashDenomination[] {
    return this.appSettingsService.getCashDenominations();
  }

  /**
   * Primary banknote cash increment amounts dynamically queried from establishment cash denominations.
   * Sorted in ascending face value order.
   */
  get primaryCashIncrements(): CashDenomination[] {
    const all = this.configuredCashDenominations.filter(d => d.type === 'bill');
    if (all.length === 0) {
      return [
        { key: '5e', label: '5 €', value: 5.0, type: 'bill' },
        { key: '10e', label: '10 €', value: 10.0, type: 'bill' },
        { key: '20e', label: '20 €', value: 20.0, type: 'bill' },
        { key: '50e', label: '50 €', value: 50.0, type: 'bill' },
        { key: '100e', label: '100 €', value: 100.0, type: 'bill' }
      ];
    }
    const filtered = all.filter(d => d.value <= 100).sort((a, b) => a.value - b.value);
    return filtered.length > 0 ? filtered : all.slice().sort((a, b) => a.value - b.value);
  }

  /**
   * Primary coin increment amounts dynamically queried from establishment cash denominations (all coins!).
   * Sorted in ascending face value order (e.g. 0.01 €, 0.02 €, 0.05 €, 0.10 €, 0.20 €, 0.50 €, 1 €, 2 €).
   */
  get primaryCoinIncrements(): CashDenomination[] {
    const all = this.configuredCashDenominations.filter(d => d.type === 'coin');
    if (all.length === 0) {
      return [
        { key: '001e', label: '0.01 €', value: 0.01, type: 'coin' },
        { key: '002e', label: '0.02 €', value: 0.02, type: 'coin' },
        { key: '005e', label: '0.05 €', value: 0.05, type: 'coin' },
        { key: '010e', label: '0.10 €', value: 0.10, type: 'coin' },
        { key: '020e', label: '0.20 €', value: 0.20, type: 'coin' },
        { key: '050e', label: '0.50 €', value: 0.50, type: 'coin' },
        { key: '1e', label: '1 €', value: 1.0, type: 'coin' },
        { key: '2e', label: '2 €', value: 2.0, type: 'coin' }
      ];
    }
    return all.slice().sort((a, b) => a.value - b.value);
  }

  /**
   * Computes the optimal greedy denomination breakdown for returning cash change,
   * querying all configured cash denominations (bills and coins) from establishment settings.
   *
   * @param changeDue Total change amount in primary currency units (e.g. euros)
   * @returns Array of denomination items to return to the customer
   */
  computeOptimalChange(changeDue: number): OptimalChangeItem[] {
    if (!changeDue || changeDue <= 0) {
      return [];
    }

    let remainingCents = Math.round(changeDue * 100);

    const denoms = this.configuredCashDenominations
      .slice()
      .sort((a, b) => b.value - a.value);

    const result: OptimalChangeItem[] = [];

    for (const d of denoms) {
      const denomCents = Math.round(d.value * 100);
      if (denomCents > 0 && remainingCents >= denomCents) {
        const count = Math.floor(remainingCents / denomCents);
        remainingCents %= denomCents;
        result.push({
          value: d.value,
          count,
          type: d.type,
          label: d.label
        });
      }
    }

    return result;
  }

  get optimalChangeBreakdown(): OptimalChangeItem[] {
    return this.computeOptimalChange(this.monnaieARendre);
  }

  get partOptimalChangeBreakdown(): OptimalChangeItem[] {
    return this.computeOptimalChange(this.partMonnaieARendre);
  }

  /**
   * Resets the received cash amount back to zero.
   */
  effacerMontantRecu(): void {
    this.montantRecu = null;
  }

  /**
   * Resets the split received cash amount back to zero.
   */
  effacerPartMontantRecu(): void {
    this.partMontantRecu = null;
  }

  /**
   * Generates intelligent smart cash suggestions (e.g. next round amount and next higher banknotes)
   * based on current total due and establishment currency denominations.
   *
   * @returns Array of sorted suggested amounts strictly greater than totalNetAPayer
   */
  get smartCashSuggestions(): number[] {
    const total = this.totalNetAPayer;
    if (!total || total <= 0) {
      return [];
    }

    const bills = this.appSettingsService.getCashDenominations()
      .filter(d => d.type === 'bill')
      .map(d => d.value)
      .sort((a, b) => a - b);

    const raw = this.appSettingsService.currencyCode === 'JPY'
      ? this.computeJpySuggestions(total, bills)
      : this.computeStandardSuggestions(total, bills);

    return Array.from(new Set(raw))
      .filter(v => v > total)
      .sort((a, b) => a - b)
      .slice(0, 2);
  }

  private computeJpySuggestions(total: number, bills: number[]): number[] {
    const suggestions: number[] = [];
    const step1000 = Math.ceil(total / 1000) * 1000;
    if (step1000 > total) {
      suggestions.push(step1000);
    }
    const nextBill = bills.find(b => b > total);
    if (nextBill) {
      suggestions.push(nextBill);
      if (nextBill === step1000) {
        const nextBill2 = bills.find(b => b > nextBill);
        if (nextBill2) {
          suggestions.push(nextBill2);
        }
      }
    }
    return suggestions;
  }

  private computeStandardSuggestions(total: number, bills: number[]): number[] {
    const suggestions: number[] = [];
    const next10 = Math.ceil(total / 10) * 10;
    if (next10 > total) {
      suggestions.push(next10);
    }
    const nextBill = bills.find(b => b > total);
    if (nextBill) {
      suggestions.push(nextBill);
      if (nextBill === next10) {
        const nextBill2 = bills.find(b => b > nextBill);
        if (nextBill2 && nextBill2 <= 200) {
          suggestions.push(nextBill2);
        }
      }
    }
    return suggestions;
  }

  /**
   * Increments the received cash amount by the given denomination value.
   *
   * @param montant Denomination amount to add
   */
  ajouterEspeces(montant: number): void {
    const current = this.montantRecu || 0;
    this.montantRecu = Math.round((current + montant) * 100) / 100;
  }

  /**
   * Sets the received cash amount directly from a shortcut (e.g. exact amount or smart suggestion).
   *
   * @param montant Target cash amount received
   */
  definirMontantRecu(montant: number): void {
    this.montantRecu = Math.round(montant * 100) / 100;
  }

  /**
   * Sets received cash amount to the exact total due.
   */
  definirMontantExact(): void {
    this.definirMontantRecu(this.totalNetAPayer);
  }

  setTipMode(mode: EncaissementTipMode): void {
    this.tipMode = mode;
    if (mode !== 'custom') {
      this.customTip = 0;
    }
    if (mode !== 'custom_percent') {
      this.customTipPercent = 0;
    }
  }

  setPartTipMode(mode: EncaissementTipMode): void {
    this.partTipMode = mode;
    if (mode !== 'custom') {
      this.partCustomTip = 0;
    }
    if (mode !== 'custom_percent') {
      this.partCustomTipPercent = 0;
    }
  }

  applyDiscountTier(tier: DiscountTier): void {
    this.selectedTierId = tier.id;
    if (tier.type === 'percent') {
      this.discountMode = 'percent';
      this.discountPercent = tier.value;
      this.discountFixed = 0;
    } else {
      this.discountMode = 'fixed';
      this.discountFixed = tier.value;
      this.discountPercent = 0;
    }
  }

  applyPartDiscountTier(tier: DiscountTier): void {
    this.partSelectedTierId = tier.id;
    if (tier.type === 'percent') {
      this.partDiscountMode = 'percent';
      this.partDiscountPercent = tier.value;
      this.partDiscountFixed = 0;
    } else {
      this.partDiscountMode = 'fixed';
      this.partDiscountFixed = tier.value;
      this.partDiscountPercent = 0;
    }
  }

  setDiscountMode(mode: EncaissementDiscountMode): void {
    this.discountMode = mode;
    this.selectedTierId = null;
    if (mode === 'none') {
      this.discountPercent = 0;
      this.discountFixed = 0;
    }
  }

  setPartDiscountMode(mode: EncaissementDiscountMode): void {
    this.partDiscountMode = mode;
    this.partSelectedTierId = null;
    if (mode === 'none') {
      this.partDiscountPercent = 0;
      this.partDiscountFixed = 0;
    }
  }

  definirPartMontantRecu(montant: number): void {
    this.partMontantRecu = Math.round(montant * 100) / 100;
  }

  definirPartMontantExact(): void {
    this.definirPartMontantRecu(this.partTotalNetAPayer);
  }

  ajouterPartEspeces(montant: number): void {
    const current = this.partMontantRecu || 0;
    this.partMontantRecu = Math.round((current + montant) * 100) / 100;
  }

  get partBilletSuggestions(): number[] {
    const total = this.partTotalNetAPayer;
    if (total <= 0) return [];
    const allBills = this.appSettingsService.getCashDenominations()
      .filter(d => d.type === 'bill')
      .map(d => d.value);
    const standardBills = allBills.length > 0 ? allBills : [5, 10, 20, 50, 100];
    const larger = standardBills.filter(b => b > total).sort((a, b) => a - b);
    return larger.slice(0, 3);
  }

  // --- Payment Terminal (TPE) Integration ---

  /**
   * Updates preferred TPE station routing role.
   *
   * @param role Target TPE station role (BAR or FLOOR)
   */
  setPreferredTpeRole(role: TpeTerminalRole): void {
    this.paymentTerminalService.preferredRole = role;
    this.preferredTpeRole.set(role);
  }

  /**
   * Initiates payment on network payment terminal (TPE) via Concert IP protocol.
   *
   * @param isPart Whether the transaction is for a split part or the single bill
   */
  envoyerAuTpe(isPart: boolean = false): void {
    if (this.isTpeProcessing()) return;

    const amount = isPart ? this.partTotalNetAPayer : this.totalNetAPayer;
    if (amount <= 0) return;

    this.isTpeProcessing.set(true);
    this.tpeErrorMessage.set(null);

    const targetRole = this.preferredTpeRole();
    const roundedAmount = Math.round(amount * 100) / 100;
    const tableOrTabName = this.table?.nom || (this.tab?.nom ?? 'Bar');
    const req: TpePaymentRequestDTO = {
      amount: roundedAmount,
      montant: roundedAmount,
      targetRole: targetRole,
      terminalRole: targetRole,
      tableNumber: tableOrTabName,
      reference: this.resolveTpeReference(),
      invoiceId: this.addition?.existingFactureId,
    };

    this.paymentTerminalService.initiatePayment(req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (initialRes) => {
          this.activeTpeTransaction.set(initialRes);
          if (initialRes.status === 'APPROVED') {
            this.handleTpeApproved(initialRes, isPart);
            return;
          }
          if (['DECLINED', 'CANCELLED', 'FAILED', 'TIMEOUT', 'ERROR'].includes(initialRes.status)) {
            this.isTpeProcessing.set(false);
            this.tpeErrorMessage.set(initialRes.message || this.transloco.translate('TPE.TRANSACTION_FAILED'));
            return;
          }

          // Listen for asynchronous STOMP WebSocket broadcast updates
          this.paymentTerminalService.watchPayment(initialRes.transactionId)
            .pipe(takeUntil(this.destroy$))
            .subscribe((updated: TpePaymentResponseDTO) => {
              this.activeTpeTransaction.set(updated);
              if (updated.status === 'APPROVED') {
                this.handleTpeApproved(updated, isPart);
              } else if (['DECLINED', 'CANCELLED', 'FAILED', 'TIMEOUT', 'ERROR'].includes(updated.status)) {
                this.isTpeProcessing.set(false);
                this.tpeErrorMessage.set(updated.message || this.transloco.translate('TPE.TRANSACTION_FAILED'));
              }
            });
        },
        error: (err) => {
          this.isTpeProcessing.set(false);
          const msg = err?.error?.message || err?.message || this.transloco.translate('TPE.TRANSACTION_FAILED');
          this.tpeErrorMessage.set(msg);
        }
      });
  }

  private handleTpeApproved(res: TpePaymentResponseDTO, isPart: boolean): void {
    this.isTpeProcessing.set(false);
    this.tpeMetadata = {
      tpeAutorisation: res.authorizationCode,
      tpeTerminalId: res.terminalId,
      tpeCardBrand: res.cardBrand,
      tpeMaskedPan: res.maskedPan,
      tpeSequence: res.sequenceNumber
    };
    if (isPart) {
      this.validerReglementPart();
    } else {
      this.validerEncaissement();
    }
  }

  /**
   * Cancels active TPE payment transaction on the physical terminal.
   */
  annulerTpe(): void {
    const tx = this.activeTpeTransaction();
    if (tx?.transactionId) {
      this.paymentTerminalService.cancelPayment(tx.transactionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
    this.isTpeProcessing.set(false);
    this.activeTpeTransaction.set(null);
  }

  /**
   * Resolves the business transaction reference for the terminal payment.
   *
   * @returns Formatted table or bar tab reference string
   */
  private resolveTpeReference(): string {
    if (this.table?.nom) {
      return `Table ${this.table.nom}`;
    }
    if (this.tab?.nom) {
      return `Tab ${this.tab.nom}`;
    }
    return 'Bar';
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
      commandeIds: this.addition.commandeIds,
      tpeAutorisation: this.tpeMetadata.tpeAutorisation,
      tpeTerminalId: this.tpeMetadata.tpeTerminalId,
      tpeCardBrand: this.tpeMetadata.tpeCardBrand,
      tpeMaskedPan: this.tpeMetadata.tpeMaskedPan,
      tpeSequence: this.tpeMetadata.tpeSequence
    };
    this.tpeMetadata = {};

    let settlement$: Observable<Facture> | null = null;
    if (this.tab && this.barTabService) {
      settlement$ = this.barTabService.encaisserTab(this.tab.id, req);
    } else if (this.table) {
      settlement$ = this.dashboardService.encaisserTable(this.table.id, req);
    }

    if (!settlement$) {
      this.isSubmitting = false;
      return;
    }

    settlement$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe({
        next: async (facture: Facture) => {
          this.settledFacture = facture;
          const targetName = this.tab ? this.tab.nom : (this.table?.nom || `Table ${this.table?.id}`);
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('ENCAISSEMENT.SUCCESS_TOAST', {
              numero: facture.numero,
              table: targetName
            }),
            duration: 3000,
            color: 'success'
          });
          await toast.present();
          await this.modalCtrl.dismiss({ action: 'settled', facture });
        },
        error: async (err: { error?: { message?: string } }) => {
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

  /**
   * Handles payment tab switching: stays within modal and calculates split if needed.
   *
   * @param tab Target payment mode tab ('single' | 'split')
   */
  onPaymentTabChange(tab: 'single' | 'split'): void {
    this.paymentTab = tab;
    if (tab === 'split' && this.splitResults.length === 0 && this.addition) {
      this.calculerSplitEgal();
    }
  }

  // --- Split Addition Mode ---

  definirNombreConvives(count: number): void {
    this.nombreConvives = count;
    this.calculerSplitEgal();
  }

  ajusterConvives(delta: number): void {
    this.nombreConvives = Math.max(2, Math.min(20, this.nombreConvives + delta));
    this.calculerSplitEgal();
  }

  addConvive(): void {
    if (this.convives.length < 20) {
      this.convives.push({ nom: '' });
    }
  }

  removeConvive(index: number): void {
    this.convives.splice(index, 1);
    Object.keys(this.unitAssignments).forEach(key => {
      if (this.unitAssignments[key] === index) {
        delete this.unitAssignments[key];
      } else if (this.unitAssignments[key] > index) {
        this.unitAssignments[key]--;
      }
    });
  }

  conviveNom(index: number): string {
    const custom = this.convives[index]?.nom?.trim();
    if (custom) return custom;
    const translated = this.transloco.translate('SPLIT.GUEST_PLACEHOLDER', { number: index + 1 });
    return (translated && !translated.startsWith('SPLIT.')) ? translated : `Convive ${index + 1}`;
  }

  getGuestName(index: number): string {
    return this.conviveNom(index);
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

  // ─── Mode Prix Libre ────────────────────────────────────────────────────────
  addCustomAmountGuest(): void {
    if (this.customAmountGuests.length < 20) {
      this.customAmountGuests.push({ nom: '', montant: null });
    }
  }

  removeCustomAmountGuest(index: number): void {
    if (this.customAmountGuests.length > 2) {
      this.customAmountGuests.splice(index, 1);
    }
  }

  getCustomAmountGuestNom(index: number): string {
    return this.customAmountGuests[index]?.nom?.trim() || `Convive ${index + 1}`;
  }

  get totalCustomAmountAllocated(): number {
    return Math.round(this.customAmountGuests.reduce((sum, g) => sum + (Number(g.montant) || 0), 0) * 100) / 100;
  }

  get customAmountRemainder(): number {
    return Math.round((this.subTotalTTC - this.totalCustomAmountAllocated) * 100) / 100;
  }

  get isCustomAmountValid(): boolean {
    return Math.abs(this.customAmountRemainder) <= 0.05 &&
      this.customAmountGuests.length >= 2 &&
      this.customAmountGuests.every(g => (Number(g.montant) || 0) > 0);
  }

  assignRemainingToGuest(index: number): void {
    const otherSum = this.customAmountGuests.reduce((sum, g, i) => i === index ? sum : sum + (Number(g.montant) || 0), 0);
    const remainder = Math.max(0, Math.round((this.subTotalTTC - otherSum) * 100) / 100);
    this.customAmountGuests[index].montant = remainder;
  }

  calculerSplitLibre(): void {
    if (!this.isCustomAmountValid) return;
    this.isLoadingSplit = true;
    this.splitError = null;
    this.partStates = {};

    this.splitResults = this.customAmountGuests.map((g, i) => ({
      factureId: this.addition?.existingFactureId || 0,
      nomConvive: this.getCustomAmountGuestNom(i),
      items: [],
      sousTotal: Number(g.montant) || 0,
      totalAvecPourboire: Number(g.montant) || 0
    }));
    this.isLoadingSplit = false;
  }

  // ─── Mode Pourcentage ────────────────────────────────────────────────────────
  addCustomPercentageGuest(): void {
    if (this.customPercentageGuests.length < 20) {
      this.customPercentageGuests.push({ nom: '', pourcentage: null });
    }
  }

  removeCustomPercentageGuest(index: number): void {
    if (this.customPercentageGuests.length > 2) {
      this.customPercentageGuests.splice(index, 1);
    }
  }

  getCustomPercentageGuestNom(index: number): string {
    return this.customPercentageGuests[index]?.nom?.trim() || `Convive ${index + 1}`;
  }

  get totalCustomPercentage(): number {
    return Math.round(this.customPercentageGuests.reduce((sum, g) => sum + (Number(g.pourcentage) || 0), 0) * 100) / 100;
  }

  get customPercentageRemainder(): number {
    return Math.round((100 - this.totalCustomPercentage) * 100) / 100;
  }

  get isCustomPercentageValid(): boolean {
    return Math.abs(this.customPercentageRemainder) <= 0.05 &&
      this.customPercentageGuests.length >= 2 &&
      this.customPercentageGuests.every(g => (Number(g.pourcentage) || 0) > 0);
  }

  distributePercentagesEqually(): void {
    const count = this.customPercentageGuests.length;
    if (count === 0) return;
    const basePct = Math.floor((100 / count) * 100) / 100;
    let sum = 0;
    for (let i = 0; i < count - 1; i++) {
      this.customPercentageGuests[i].pourcentage = basePct;
      sum += basePct;
    }
    this.customPercentageGuests[count - 1].pourcentage = Math.round((100 - sum) * 100) / 100;
  }

  assignRemainingPercentageToGuest(index: number): void {
    const otherSum = this.customPercentageGuests.reduce((sum, g, i) => i === index ? sum : sum + (Number(g.pourcentage) || 0), 0);
    this.customPercentageGuests[index].pourcentage = Math.max(0, Math.round((100 - otherSum) * 100) / 100);
  }

  calculerSplitPourcentage(): void {
    if (!this.isCustomPercentageValid) return;
    this.isLoadingSplit = true;
    this.splitError = null;
    this.partStates = {};

    this.splitResults = this.customPercentageGuests.map((g, i) => {
      const pct = Number(g.pourcentage) || 0;
      const part = Math.round((this.subTotalTTC * pct / 100) * 100) / 100;
      return {
        factureId: this.addition?.existingFactureId || 0,
        nomConvive: `${this.getCustomPercentageGuestNom(i)} (${pct}%)`,
        items: [],
        sousTotal: part,
        totalAvecPourboire: part
      };
    });
    this.isLoadingSplit = false;
  }

  get splitUnits(): { key: string; itemId: number; description: string; unitIndex: number; totalUnits: number; unitLabel: string; prixUnitaire: number }[] {
    if (!this.addition?.items) return [];
    const units: { key: string; itemId: number; description: string; unitIndex: number; totalUnits: number; unitLabel: string; prixUnitaire: number }[] = [];
    for (const item of this.addition.items) {
      const qteTotal = item.quantite || 1;
      const qtePayee = item.quantitePayee || 0;
      const qteRestante = Math.max(0, qteTotal - qtePayee);
      const desc = item.cocktailNom + (item.varianteNom ? ` (${item.varianteNom})` : '');
      for (let u = 0; u < qteRestante; u++) {
        units.push({
          key: `${item.itemId}_${u}`,
          itemId: item.itemId,
          description: desc,
          unitIndex: u,
          totalUnits: qteRestante,
          unitLabel: qteRestante > 1 ? `${desc} (${u + 1}/${qteRestante})` : desc,
          prixUnitaire: item.prixUnitaire
        });
      }
    }
    return units;
  }

  get allItemsAssigned(): boolean {
    const units = this.splitUnits;
    if (!units.length) return false;
    return units.every(u => this.unitAssignments[u.key] !== undefined);
  }

  get tousItemsAssignes(): boolean {
    return this.allItemsAssigned;
  }

  getUnassignedCount(itemId: number): number {
    const units = this.splitUnits.filter(u => u.itemId === itemId);
    let assigned = 0;
    for (const u of units) {
      if (this.unitAssignments[u.key] !== undefined) {
        assigned++;
      }
    }
    return Math.max(0, units.length - assigned);
  }

  get totalUnassignedCount(): number {
    if (!this.addition?.items) return 0;
    return this.addition.items.reduce((sum, item) => sum + this.getUnassignedCount(item.itemId), 0);
  }

  get availableAdditionItems(): (TableAdditionItem & { description: string; remaining: number })[] {
    if (!this.addition?.items) return [];
    return this.addition.items
      .map(item => ({
        ...item,
        description: item.cocktailNom + (item.varianteNom ? ` (${item.varianteNom})` : ''),
        remaining: this.getUnassignedCount(item.itemId)
      }))
      .filter(item => item.remaining > 0);
  }

  get availableInvoiceItems(): (TableAdditionItem & { description: string; remaining: number })[] {
    return this.availableAdditionItems;
  }

  getAssignedItemsForGuest(guestIndex: number): { itemId: number; description: string; unitPrice: number; count: number; total: number }[] {
    if (!this.addition?.items) return [];
    const result: { itemId: number; description: string; unitPrice: number; count: number; total: number }[] = [];
    for (const item of this.addition.items) {
      let count = 0;
      const qteTotal = item.quantite || 1;
      const qtePayee = item.quantitePayee || 0;
      const qteRestante = Math.max(0, qteTotal - qtePayee);
      for (let u = 0; u < qteRestante; u++) {
        if (this.unitAssignments[`${item.itemId}_${u}`] === guestIndex) {
          count++;
        }
      }
      if (count > 0) {
        const desc = item.cocktailNom + (item.varianteNom ? ` (${item.varianteNom})` : '');
        result.push({
          itemId: item.itemId,
          description: desc,
          unitPrice: item.prixUnitaire,
          count,
          total: Math.round(count * item.prixUnitaire * 100) / 100
        });
      }
    }
    return result;
  }

  getGuestTotal(guestIndex: number): number {
    return Math.round(this.getAssignedItemsForGuest(guestIndex).reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  }

  getGuestAssignedTotal(guestIndex: number): number {
    return this.getGuestTotal(guestIndex);
  }

  getGuestAssignedCount(guestIndex: number): number {
    return this.getAssignedItemsForGuest(guestIndex).length;
  }

  assignOneUnitToGuest(guestIndex: number, itemId: number): void {
    const item = this.addition?.items?.find(i => i.itemId === itemId);
    if (!item) return;
    const qteTotal = item.quantite || 1;
    const qtePayee = item.quantitePayee || 0;
    const qteRestante = Math.max(0, qteTotal - qtePayee);
    for (let u = 0; u < qteRestante; u++) {
      const key = `${itemId}_${u}`;
      if (this.unitAssignments[key] === undefined) {
        this.unitAssignments[key] = guestIndex;
        break;
      }
    }
  }

  unassignOneUnitFromGuest(guestIndex: number, itemId: number): void {
    const item = this.addition?.items?.find(i => i.itemId === itemId);
    if (!item) return;
    const qteTotal = item.quantite || 1;
    const qtePayee = item.quantitePayee || 0;
    const qteRestante = Math.max(0, qteTotal - qtePayee);
    for (let u = qteRestante - 1; u >= 0; u--) {
      const key = `${itemId}_${u}`;
      if (this.unitAssignments[key] === guestIndex) {
        delete this.unitAssignments[key];
        break;
      }
    }
  }

  removeAllUnitsOfItemFromGuest(guestIndex: number, itemId: number): void {
    const item = this.addition?.items?.find(i => i.itemId === itemId);
    if (!item) return;
    const qteTotal = item.quantite || 1;
    const qtePayee = item.quantitePayee || 0;
    const qteRestante = Math.max(0, qteTotal - qtePayee);
    for (let u = 0; u < qteRestante; u++) {
      const key = `${itemId}_${u}`;
      if (this.unitAssignments[key] === guestIndex) {
        delete this.unitAssignments[key];
      }
    }
  }

  assignItemToGuest(itemId: number, guestIndex: number | undefined): void {
    const item = this.addition?.items?.find(i => i.itemId === itemId);
    if (!item) return;
    const qteTotal = item.quantite || 1;
    const qtePayee = item.quantitePayee || 0;
    const qteRestante = Math.max(0, qteTotal - qtePayee);
    for (let u = 0; u < qteRestante; u++) {
      const key = `${itemId}_${u}`;
      if (guestIndex === undefined) {
        delete this.unitAssignments[key];
      } else {
        this.unitAssignments[key] = guestIndex;
      }
    }
  }

  get totalAssignedItemsAmount(): number {
    return Math.round(this.convives.reduce((sum, _, idx) => sum + this.getGuestTotal(idx), 0) * 100) / 100;
  }

  get unassignedItemsRemainder(): number {
    return Math.max(0, Math.round((this.subTotalTTC - this.totalAssignedItemsAmount) * 100) / 100);
  }

  calculerSplitSelection(): void {
    if (!this.addition) return;
    this.isLoadingSplit = true;
    this.splitError = null;
    this.partStates = {};

    const results: SplitResultDTO[] = [];

    this.convives.forEach((_, i) => {
      const assignedItems = this.getAssignedItemsForGuest(i);
      const subTotal = Math.round(assignedItems.reduce((acc, it) => acc + it.total, 0) * 100) / 100;
      if (assignedItems.length > 0) {
        results.push({
          factureId: this.addition?.existingFactureId || 0,
          nomConvive: this.conviveNom(i),
          items: assignedItems.map(it => ({
            itemId: it.itemId,
            description: it.description,
            quantite: it.count,
            prixUnitaire: it.unitPrice,
            total: it.total
          })),
          sousTotal: subTotal,
          totalAvecPourboire: subTotal
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

  /**
   * Triggers individual immediate payment for a guest card mid-dinner.
   *
   * @param guestIndex Index of the guest in convives
   */
  payerPartConvive(guestIndex: number): void {
    const assignedItems = this.getAssignedItemsForGuest(guestIndex);
    if (!assignedItems.length) return;
    const subTotal = this.getGuestTotal(guestIndex);
    const part: SplitResultDTO = {
      factureId: this.addition?.existingFactureId || 0,
      nomConvive: this.conviveNom(guestIndex),
      items: assignedItems.map(it => ({
        itemId: it.itemId,
        description: it.description,
        quantite: it.count,
        prixUnitaire: it.unitPrice,
        total: it.total
      })),
      sousTotal: subTotal,
      totalAvecPourboire: subTotal
    };
    this.reglerPart(guestIndex, part);
  }

  reglerPart(index: number, part: SplitResultDTO): void {
    if (this.partStates[index]?.reglee) return;
    this.settlingPartIndex = index;
    this.settlingPart = part;
    this.partPaymentMode = 'CARTE';
    this.partTipMode = 'none';
    this.partCustomTip = 0;
    this.partCustomTipPercent = 0;
    this.partDiscountMode = 'none';
    this.partDiscountPercent = 0;
    this.partDiscountFixed = 0;
    this.partSelectedTierId = null;
    this.partMontantRecu = null;
  }

  annulerReglementPart(): void {
    this.settlingPartIndex = null;
    this.settlingPart = null;
  }

  private resolveTypeSplit(): TypeSplit {
    switch (this.splitMode) {
      case 'selection':
        return TypeSplit.SELECTION;
      case 'libre':
        return TypeSplit.MONTANT_LIBRE;
      case 'pourcentage':
        return TypeSplit.POURCENTAGE;
      default:
        return TypeSplit.EGAL;
    }
  }

  private resolveTotalPartsCount(): number {
    if (this.splitMode === 'selection') {
      return this.convives.length;
    }
    return this.splitResults.length > 0 ? this.splitResults.length : this.nombreConvives;
  }

  private getPartSettlementObservable(req: EncaisserPartRequest): Observable<FactureReglement> | null {
    if (this.tab && this.barTabService) {
      return this.factureService.encaisserPartTab(this.tab.id, req);
    }
    if (this.table) {
      return this.factureService.encaisserPartTable(this.table.id, req);
    }
    if (this.addition?.existingFactureId) {
      return this.factureService.encaisserPart(this.addition.existingFactureId, req);
    }
    return null;
  }

  private async handlePartSettledSuccess(
    index: number,
    guestName: string,
    mode: string,
    pourboire: number,
    totalPaid: number,
    savedReglement: FactureReglement,
    tpeAuth?: string
  ): Promise<void> {
    this.partStates[index] = {
      reglee: true,
      modePaiement: mode,
      pourboire,
      totalPaid,
      tpeAutorisation: tpeAuth || savedReglement?.tpeAutorisation,
      reglement: savedReglement
    };

    Object.keys(this.unitAssignments).forEach(key => {
      if (this.unitAssignments[key] === index) {
        delete this.unitAssignments[key];
      }
    });

    this.settlingPart = null;
    this.settlingPartIndex = null;

    const toast = await this.toastCtrl.create({
      message: this.transloco.translate('ENCAISSEMENT.PART_SETTLED_SUCCESS', {
        nom: guestName,
        mode: mode
      }),
      duration: 2500,
      color: 'success'
    });
    await toast.present();

    this.chargerAddition();
  }

  validerReglementPart(): void {
    if (!this.settlingPart || this.settlingPartIndex === null || this.isSubmitting) return;
    const index = this.settlingPartIndex;
    const part = this.settlingPart;
    const guestName = part.nomConvive;
    const mode = this.partPaymentMode;
    const pourboire = this.partPourboire;
    const totalPaid = this.partTotalNetAPayer;
    const tpeAuth = this.tpeMetadata.tpeAutorisation;

    const req: EncaisserPartRequest = {
      nomConvive: guestName,
      partIndex: index + 1,
      totalParts: this.resolveTotalPartsCount(),
      montant: part.sousTotal,
      pourboire: pourboire > 0 ? pourboire : undefined,
      totalRegle: totalPaid,
      modePaiement: mode,
      typeSplit: this.resolveTypeSplit(),
      items: part.items,
      tpeAutorisation: this.tpeMetadata.tpeAutorisation,
      tpeTerminalId: this.tpeMetadata.tpeTerminalId,
      tpeCardBrand: this.tpeMetadata.tpeCardBrand,
      tpeMaskedPan: this.tpeMetadata.tpeMaskedPan,
      tpeSequence: this.tpeMetadata.tpeSequence
    };
    this.tpeMetadata = {};

    const settlement$ = this.getPartSettlementObservable(req);
    if (!settlement$) return;

    this.isSubmitting = true;
    settlement$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe({
        next: (savedReglement) => {
          void this.handlePartSettledSuccess(index, guestName, mode, pourboire, totalPaid, savedReglement, tpeAuth);
        },
        error: async (err: { error?: { message?: string } }) => {
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

  private finaliserReglementSplitGlobal(): void {
    const totalPourboires = Object.values(this.partStates).reduce((acc, s) => acc + (s.pourboire || 0), 0);
    const req: EncaissementRequest = {
      modePaiement: 'MIXTE_SPLIT',
      pourboire: totalPourboires > 0 ? totalPourboires : undefined,
      libererTable: this.libererTable,
      commandeIds: this.addition?.commandeIds
    };

    let settlement$: Observable<Facture> | null = null;
    if (this.tab && this.barTabService) {
      settlement$ = this.barTabService.encaisserTab(this.tab.id, req);
    } else if (this.table) {
      settlement$ = this.dashboardService.encaisserTable(this.table.id, req);
    }

    if (!settlement$) return;

    settlement$.subscribe({
      next: async (facture: Facture) => {
        this.settledFacture = facture;
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('ENCAISSEMENT.ALL_PARTS_SETTLED_SUCCESS'),
          duration: 3000,
          color: 'success'
        });
        await toast.present();
        await this.modalCtrl.dismiss({ action: 'settled', facture });
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
    void this.modalCtrl.dismiss();
  }

  trackByItemId(_index: number, item: TableAdditionItem): number {
    return item.itemId;
  }
}
