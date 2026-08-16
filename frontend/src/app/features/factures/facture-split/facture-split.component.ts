import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonButton, IonIcon,
  IonSegment, IonSegmentButton, IonList, IonBadge,
  IonSpinner, IonInput, IonSelect, IonSelectOption, IonProgressBar, ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline, listOutline, calculatorOutline,
  removeOutline, addOutline, closeOutline, checkmarkCircleOutline, cardOutline, cashOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FactureService, SplitResultDTO, SplitPartRequest } from '../services/facture.service';
import { Facture } from '../models/facture.model';
import { ReglementModalComponent, ReglementModalResult } from '../reglement-modal/reglement-modal.component';

/** State tracking for individual guest split settlements. */
export interface PartSettlementState {
  settled: boolean;
  paymentMethod?: string;
  tip?: number;
  totalPaid?: number;
  reglee?: boolean;
  modePaiement?: string;
  pourboire?: number;
  totalRegle?: number;
}

/**
 * Facture Split & Post-Split Individual Settlement Component.
 * Supports equal split, split by item selection, and individual guest payment tracking
 * with real-time remaining balance calculations and automatic main invoice settlement.
 *
 * Aligned with Figma Common System Split Settlement layout (`630:1264`).
 */
@Component({
  selector: 'app-facture-split',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CurrencyPipe, RouterLink, TranslocoModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonButton, IonIcon,
    IonSegment, IonSegmentButton, IonList, IonBadge,
    IonSpinner, IonInput, IonSelect, IonSelectOption, IonProgressBar
  ],
  templateUrl: './facture-split.component.html',
  styleUrls: ['./facture-split.component.scss'],
})
export class FactureSplitComponent implements OnInit {
  private readonly transloco = inject(TranslocoService);
  factureId!: number;
  mode: 'equal' | 'itemized' | 'selection' | 'egal' = 'equal';

  // Equal split mode
  guestCount = 2;

  get nombreConvives(): number {
    return this.guestCount;
  }
  set nombreConvives(val: number) {
    this.guestCount = val;
  }

  ajusterConvives(delta: number): void {
    this.adjustGuestCount(delta);
  }

  // Itemized split mode
  facture: Facture | null = null;
  guests: { name: string }[] = [{ name: '' }, { name: '' }];
  itemAssignments: { [itemId: number]: number } = {};

  results: SplitResultDTO[] = [];
  loading = false;
  errorMessage: string | null = null;

  /** Individual settlement state map (keyed by guest index). */
  partStates: { [index: number]: PartSettlementState } = {};

  private readonly route = inject(ActivatedRoute);
  private readonly factureService = inject(FactureService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  constructor() {
    addIcons({
      peopleOutline, listOutline, calculatorOutline,
      removeOutline, addOutline, closeOutline, checkmarkCircleOutline, cardOutline, cashOutline
    });
  }

  ngOnInit() {
    this.factureId = +this.route.snapshot.paramMap.get('id')!;
    this.loadFacture();
  }

  onModeChange() {
    this.results = [];
    this.partStates = {};
    this.errorMessage = null;
    if ((this.mode === 'itemized' || this.mode === 'selection') && !this.facture) {
      this.loadFacture();
    }
  }

  private loadFacture() {
    this.factureService.getFactureById(this.factureId).subscribe({
      next: f => { this.facture = f; },
      error: () => { this.errorMessage = String(this.transloco.translate('SPLIT.LOAD_ITEMS_ERROR')); },
    });
  }

  // ─── Equal Split Mode ────────────────────────────────────────────────────────

  adjustGuestCount(delta: number) {
    this.guestCount = Math.max(2, Math.min(20, this.guestCount + delta));
  }

  calculateEqualSplit() {
    this.loading = true;
    this.errorMessage = null;
    this.partStates = {};
    this.factureService.splitEgal(this.factureId, this.guestCount).subscribe({
      next: r => { this.results = r; this.loading = false; },
      error: err => {
        this.errorMessage = err?.error?.message ?? String(this.transloco.translate('SPLIT.CALCULATION_ERROR'));
        this.loading = false;
      },
    });
  }

  // ─── Itemized Split Mode ───────────────────────────────────────────────────

  addGuest() {
    if (this.guests.length < 20) {
      this.guests.push({ name: '' });
    }
  }

  removeGuest(index: number) {
    this.guests.splice(index, 1);
    Object.keys(this.itemAssignments).forEach(id => {
      const itemId = +id;
      if (this.itemAssignments[itemId] === index) {
        delete this.itemAssignments[itemId];
      } else if (this.itemAssignments[itemId] > index) {
        this.itemAssignments[itemId]--;
      }
    });
  }

  getGuestName(index: number): string {
    return this.guests[index]?.name?.trim() || `${this.transloco.translate('SPLIT.GUEST_PLACEHOLDER', { number: index + 1 })}`;
  }

  get allItemsAssigned(): boolean {
    if (!this.facture?.items?.length) return false;
    return this.facture.items.every(item => this.itemAssignments[item.id] !== undefined);
  }

  calculateItemizedSplit() {
    if (!this.facture) return;
    this.loading = true;
    this.errorMessage = null;
    this.partStates = {};

    const parts: SplitPartRequest[] = this.guests
      .map((_, i) => ({
        nomConvive: this.getGuestName(i),
        itemIds: this.facture!.items
          .filter(item => this.itemAssignments[item.id] === i)
          .map(item => item.id),
      }))
      .filter(p => p.itemIds.length > 0);

    this.factureService.splitParSelection(this.factureId, parts).subscribe({
      next: r => { this.results = r; this.loading = false; },
      error: err => {
        this.errorMessage = err?.error?.message ?? String(this.transloco.translate('SPLIT.CALCULATION_ERROR'));
        this.loading = false;
      },
    });
  }

  // ─── Individual Post-Split Settlement ──────────────────────────────────────

  get totalSplit(): number {
    return this.results.reduce((acc, r) => acc + r.sousTotal, 0);
  }

  get totalBillAmount(): number {
    return this.facture?.totalTTC ?? this.facture?.total ?? this.totalSplit;
  }

  get paidAmount(): number {
    return this.results.reduce((acc, r, i) => {
      const state = this.partStates[i];
      return state?.settled ? acc + r.sousTotal : acc;
    }, 0);
  }

  get remainingBalance(): number {
    return Math.max(0, Math.round((this.totalBillAmount - this.paidAmount) * 100) / 100);
  }

  get paidRatio(): number {
    if (!this.totalBillAmount || this.totalBillAmount <= 0) return 0;
    return Math.min(1, this.paidAmount / this.totalBillAmount);
  }

  get allPartsSettled(): boolean {
    return this.results.length > 0 && this.results.every((_, i) => !!this.partStates[i]?.settled);
  }

  /**
   * Opens the payment modal for an individual guest part.
   * On confirmation, updates part settlement state and automatically
   * settles the main invoice when all parts are paid.
   *
   * @param index Guest index in results array
   * @param part The guest's split result DTO
   */
  async settleGuestPart(index: number, part: SplitResultDTO) {
    if (this.partStates[index]?.settled) return;

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
      settled: true,
      paymentMethod: data.modePaiement,
      tip: data.pourboire,
      totalPaid: data.totalTotal,
      reglee: true,
      modePaiement: data.modePaiement,
      pourboire: data.pourboire,
      totalRegle: data.totalTotal,
    };

    const toast = await this.toastCtrl.create({
      message: String(this.transloco.translate('SPLIT.PART_PAID_SUCCESS', { guest: part.nomConvive, mode: data.modePaiement })),
      duration: 2000,
      color: 'success'
    });
    await toast.present();

    if (this.allPartsSettled) {
      this.finalizeGlobalInvoiceSettlement();
    }
  }

  // ─── Aliases for compatibility ─────────────────────────────────────────────

  get convives(): { nom: string }[] {
    return this.guests.map(g => ({ nom: g.name }));
  }

  set convives(val: { nom: string }[]) {
    this.guests = val.map(g => ({ name: g.nom }));
  }

  conviveNom(index: number): string {
    return this.getGuestName(index);
  }

  removeConvive(index: number): void {
    this.removeGuest(index);
  }

  addConvive(): void {
    this.addGuest();
  }

  get tousItemsAssignes(): boolean {
    return this.allItemsAssigned;
  }

  calculerSplitSelection(): void {
    this.calculateItemizedSplit();
  }

  calculerSplitEgal(): void {
    this.calculateEqualSplit();
  }

  get montantTotalAddition(): number {
    return this.totalBillAmount;
  }

  get montantRegle(): number {
    return this.paidAmount;
  }

  get soldeRestant(): number {
    return this.remainingBalance;
  }

  get ratioRegle(): number {
    return this.paidRatio;
  }

  get toutesPartsReglees(): boolean {
    return this.allPartsSettled;
  }

  async reglerPart(index: number, part: SplitResultDTO) {
    return this.settleGuestPart(index, part);
  }

  private finalizeGlobalInvoiceSettlement() {
    const totalTips = Object.values(this.partStates).reduce((acc, s) => acc + (s.tip || 0), 0);
    this.factureService.reglerFacture(this.factureId, 'MIXTE_SPLIT', totalTips).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({
          message: String(this.transloco.translate('SPLIT.ALL_PARTS_PAID')),
          duration: 3000,
          color: 'success'
        });
        await toast.present();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: String(this.transloco.translate('SPLIT.FINALIZATION_ERROR')),
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }
}
