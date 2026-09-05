import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonButtons,
  IonButton, IonIcon, IonSegment, IonSegmentButton, IonLabel,
  IonSpinner, IonProgressBar,
  ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline, listOutline, calculatorOutline,
  removeOutline, addOutline, closeOutline, checkmarkCircleOutline,
  cardOutline, cashOutline, alertCircleOutline, trashOutline, printOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { FactureService, SplitResultDTO, SplitPartRequest, SplitPartItemRequest } from '../services/facture.service';
import { Facture, FactureItem, FactureReglement, EncaisserPartRequest } from '../models/facture.model';
import { ReglementModalComponent, ReglementModalResult } from '../reglement-modal/reglement-modal.component';
import { TicketReceiptComponent } from '../ticket-receipt/ticket-receipt.component';

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
  reglement?: FactureReglement;
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
    CommonModule, FormsModule, AppCurrencyPipe, TranslocoModule,
    IonContent, IonHeader, IonToolbar, IonButtons,
    IonButton, IonIcon, IonSegment, IonSegmentButton, IonLabel,
    IonSpinner, IonProgressBar
  ],
  templateUrl: './facture-split.component.html',
  styleUrls: ['./facture-split.component.scss'],
})
export class FactureSplitComponent implements OnInit {
  private readonly transloco = inject(TranslocoService);

  /** Optional Input for Modal usage. */
  @Input() factureId!: number;

  /** Optional Input for Modal usage. */
  @Input() facture: Facture | null = null;

  get factureNumero(): string | undefined {
    return this.facture?.numero;
  }

  get factureTableNumero(): number | undefined {
    return this.facture?.tableNumero;
  }

  get factureItems(): FactureItem[] {
    return this.facture?.items ?? [];
  }

  mode: 'equal' | 'itemized' | 'selection' | 'egal' = 'equal';

  // Equal split mode
  guestCount = 2;
  readonly guestPresets = [2, 3, 4, 5, 6];

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
  guests: { name: string }[] = [{ name: '' }, { name: '' }];
  /** Map storing guest index assigned to each unit key (e.g. "101_0", "101_1"). */
  unitAssignments: { [unitKey: string]: number } = {};

  /** Compatibility accessor for legacy tests and bindings. */
  get itemAssignments(): { [itemId: number]: number } {
    const map: { [itemId: number]: number } = {};
    if (this.facture?.items) {
      for (const item of this.facture.items) {
        if (this.unitAssignments[`${item.id}_0`] !== undefined) {
          map[item.id] = this.unitAssignments[`${item.id}_0`];
        }
      }
    }
    return map;
  }
  set itemAssignments(val: { [itemId: number]: number }) {
    if (val && this.facture?.items) {
      Object.keys(val).forEach(id => {
        const itemId = +id;
        const gIdx = val[itemId];
        const item = this.facture?.items?.find(i => i.id === itemId);
        const qte = item?.quantite || 1;
        for (let u = 0; u < qte; u++) {
          this.unitAssignments[`${itemId}_${u}`] = gIdx;
        }
      });
    }
  }

  /** Explodes line items into individual unit consumable items for granular split. */
  get splitUnits(): { key: string; itemId: number; description: string; unitIndex: number; totalUnits: number; unitLabel: string; prixUnitaire: number }[] {
    if (!this.facture?.items) return [];
    const units: { key: string; itemId: number; description: string; unitIndex: number; totalUnits: number; unitLabel: string; prixUnitaire: number }[] = [];
    for (const item of this.facture.items) {
      const qte = item.quantite || 1;
      for (let u = 0; u < qte; u++) {
        units.push({
          key: `${item.id}_${u}`,
          itemId: item.id,
          description: item.description,
          unitIndex: u,
          totalUnits: qte,
          unitLabel: qte > 1 ? `${item.description} (${u + 1}/${qte})` : item.description,
          prixUnitaire: item.prixUnitaire
        });
      }
    }
    return units;
  }

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
      removeOutline, addOutline, closeOutline, checkmarkCircleOutline, cardOutline, cashOutline,
      alertCircleOutline, trashOutline, printOutline
    });
  }

  ngOnInit() {
    if (!this.factureId) {
      const routeId = this.route.snapshot?.paramMap?.get('id');
      if (routeId) {
        this.factureId = +routeId;
      }
    }

    if (!this.facture && this.factureId) {
      this.loadFacture();
    }
  }

  /** Dismisses modal returning settlement status. */
  closeModal(didSettle = false): void {
    this.modalCtrl.dismiss({ settled: didSettle || this.allPartsSettled });
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
    Object.keys(this.unitAssignments).forEach(key => {
      if (this.unitAssignments[key] === index) {
        delete this.unitAssignments[key];
      } else if (this.unitAssignments[key] > index) {
        this.unitAssignments[key]--;
      }
    });
  }

  getGuestName(index: number): string {
    return this.guests[index]?.name?.trim() || `${this.transloco.translate('SPLIT.GUEST_PLACEHOLDER', { number: index + 1 })}`;
  }

  get allItemsAssigned(): boolean {
    const units = this.splitUnits;
    if (!units.length) return false;
    return units.every(u => this.unitAssignments[u.key] !== undefined);
  }

  /** Returns the list of distinct items and quantities currently assigned to a guest. */
  getAssignedItemsForGuest(guestIndex: number): { itemId: number; description: string; unitPrice: number; count: number; total: number }[] {
    if (!this.facture?.items) return [];
    const result: { itemId: number; description: string; unitPrice: number; count: number; total: number }[] = [];
    for (const item of this.facture.items) {
      let count = 0;
      const qte = item.quantite || 1;
      for (let u = 0; u < qte; u++) {
        if (this.unitAssignments[`${item.id}_${u}`] === guestIndex) {
          count++;
        }
      }
      if (count > 0) {
        result.push({
          itemId: item.id,
          description: item.description,
          unitPrice: item.prixUnitaire,
          count,
          total: count * item.prixUnitaire
        });
      }
    }
    return result;
  }

  /** Computes the real-time monetary subtotal for a specific guest. */
  getGuestTotal(guestIndex: number): number {
    return this.getAssignedItemsForGuest(guestIndex).reduce((sum, item) => sum + item.total, 0);
  }

  /** Computes how many unassigned units remain for a specific bill item. */
  getUnassignedCount(itemId: number): number {
    const item = this.facture?.items?.find(i => i.id === itemId);
    if (!item) return 0;
    const qte = item.quantite || 1;
    let assigned = 0;
    for (let u = 0; u < qte; u++) {
      if (this.unitAssignments[`${itemId}_${u}`] !== undefined) {
        assigned++;
      }
    }
    return Math.max(0, qte - assigned);
  }

  /** Returns total count of all unassigned items across the invoice. */
  get totalUnassignedCount(): number {
    if (!this.facture?.items) return 0;
    return this.facture.items.reduce((sum, item) => sum + this.getUnassignedCount(item.id), 0);
  }

  /** Returns bill items that still have unassigned units available for distribution. */
  get availableInvoiceItems(): (FactureItem & { remaining: number })[] {
    if (!this.facture?.items) return [];
    return this.facture.items
      .map(item => ({ ...item, remaining: this.getUnassignedCount(item.id) }))
      .filter(item => item.remaining > 0);
  }

  /** Assigns one available unit of the given item to the chosen guest. */
  assignOneUnitToGuest(guestIndex: number, itemId: number): void {
    const item = this.facture?.items?.find(i => i.id === itemId);
    if (!item) return;
    const qte = item.quantite || 1;
    for (let u = 0; u < qte; u++) {
      const key = `${itemId}_${u}`;
      if (this.unitAssignments[key] === undefined) {
        this.unitAssignments[key] = guestIndex;
        break;
      }
    }
  }

  /** Unassigns one unit of the given item from the chosen guest (puts it back in the pool). */
  unassignOneUnitFromGuest(guestIndex: number, itemId: number): void {
    const item = this.facture?.items?.find(i => i.id === itemId);
    if (!item) return;
    const qte = item.quantite || 1;
    for (let u = qte - 1; u >= 0; u--) {
      const key = `${itemId}_${u}`;
      if (this.unitAssignments[key] === guestIndex) {
        delete this.unitAssignments[key];
        break;
      }
    }
  }

  /** Removes all assigned units of a given item from a guest. */
  removeAllUnitsOfItemFromGuest(guestIndex: number, itemId: number): void {
    const item = this.facture?.items?.find(i => i.id === itemId);
    if (!item) return;
    const qte = item.quantite || 1;
    for (let u = 0; u < qte; u++) {
      const key = `${itemId}_${u}`;
      if (this.unitAssignments[key] === guestIndex) {
        delete this.unitAssignments[key];
      }
    }
  }

  /** Handles quick-assign dropdown selection for a guest. */
  onQuickAssignSelect(guestIndex: number, event: CustomEvent): void {
    const selectedItemId = event.detail.value;
    if (selectedItemId !== undefined && selectedItemId !== null) {
      this.assignOneUnitToGuest(guestIndex, +selectedItemId);
      // Reset select value so the same item can be picked again if more units remain
      const target = event.target as HTMLIonSelectElement;
      if (target) {
        target.value = null;
      }
    }
  }

  /** Assigns all units of a single line item to a chosen guest in one action. */
  assignEntireItemToGuest(itemId: number, guestIndex: number): void {
    const item = this.facture?.items?.find(i => i.id === itemId);
    if (!item) return;
    const qte = item.quantite || 1;
    for (let u = 0; u < qte; u++) {
      this.unitAssignments[`${itemId}_${u}`] = guestIndex;
    }
  }

  getUnitArray(quantite: number): number[] {
    return Array.from({ length: quantite || 1 }, (_, i) => i);
  }

  calculateItemizedSplit() {
    if (!this.facture) return;
    this.loading = true;
    this.errorMessage = null;
    this.partStates = {};

    const units = this.splitUnits;

    const parts: SplitPartRequest[] = this.guests.map((_, guestIdx) => {
      const assignedUnits = units.filter(u => this.unitAssignments[u.key] === guestIdx);

      const itemMap = new Map<number, number>();
      for (const u of assignedUnits) {
        itemMap.set(u.itemId, (itemMap.get(u.itemId) || 0) + 1);
      }

      const items: SplitPartItemRequest[] = Array.from(itemMap.entries()).map(([itemId, quantite]) => ({
        itemId,
        quantite
      }));

      const itemIds = Array.from(itemMap.keys());

      return {
        nomConvive: this.getGuestName(guestIdx),
        itemIds,
        items
      };
    }).filter(p => (p.items && p.items.length > 0) || (p.itemIds && p.itemIds.length > 0));

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
   * On confirmation, saves the settlement in backend database, updates part settlement state,
   * and automatically settles the main invoice when all parts are paid.
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
        nomPart: part.nomConvive,
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<ReglementModalResult>();

    if (!data) return;

    const request: EncaisserPartRequest = {
      nomConvive: part.nomConvive,
      partIndex: index + 1,
      totalParts: this.mode === 'equal' ? this.guestCount : this.results.length,
      montant: part.sousTotal,
      pourboire: data.pourboire || 0,
      totalRegle: data.totalTotal,
      modePaiement: data.modePaiement,
      typeSplit: this.mode === 'equal' ? 'EGAL' : 'SELECTION',
      items: part.items,
    };

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

    if (this.factureId) {
      this.factureService.encaisserPart(this.factureId, request).subscribe({
        next: (savedReglement) => {
          if (this.partStates[index]) {
            this.partStates[index].reglement = savedReglement;
          }
        },
        error: (err) => {
          console.error('Failed to persist split settlement', err);
        }
      });
    }

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

  /**
   * Opens the thermal receipt preview modal for a specific settled split share.
   *
   * @param index Index of the guest share
   * @param part The guest's split result DTO
   */
  async printPartReceipt(index: number, part: SplitResultDTO) {
    const reglement: FactureReglement = this.partStates[index]?.reglement || {
      factureId: this.factureId,
      nomConvive: part.nomConvive,
      partIndex: index + 1,
      totalParts: this.mode === 'equal' ? this.guestCount : this.results.length,
      montant: part.sousTotal,
      pourboire: this.partStates[index]?.tip || 0,
      totalRegle: this.partStates[index]?.totalPaid || part.sousTotal,
      modePaiement: this.partStates[index]?.paymentMethod || 'CARTE',
      typeSplit: this.mode === 'equal' ? 'EGAL' : 'SELECTION',
      items: part.items,
      dateReglement: new Date().toISOString(),
    };

    const modal = await this.modalCtrl.create({
      component: TicketReceiptComponent,
      componentProps: {
        facture: this.facture || { id: this.factureId, numero: `FAC-${this.factureId}`, items: [] },
        reglement: reglement,
      },
      cssClass: 'ticket-modal',
    });
    await modal.present();
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
