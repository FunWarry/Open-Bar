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
import { TranslocoModule } from '@jsverse/transloco';
import { FactureService, SplitResultDTO, SplitPartRequest } from '../services/facture.service';
import { Facture } from '../models/facture.model';
import { ReglementModalComponent, ReglementModalResult } from '../reglement-modal/reglement-modal.component';

/** State tracking for individual guest split settlements. */
export interface PartSettlementState {
  reglee: boolean;
  modePaiement?: string;
  pourboire?: number;
  totalPaid?: number;
}

/**
 * Facture Split & Post-Split Individual Settlement Component.
 * Supports equal split, split by item selection, and individual guest payment tracking
 * with real-time remaining balance calculations and automatic main invoice settlement.
 *
 * Aligned with Figma Vue système commun Split Settlement layout (`630:1264`).
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
  factureId!: number;
  mode: 'egal' | 'selection' = 'egal';

  // Mode égal
  nombreConvives = 2;

  // Mode par article
  facture: Facture | null = null;
  convives: { nom: string }[] = [{ nom: '' }, { nom: '' }];
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
    if (this.mode === 'selection' && !this.facture) {
      this.loadFacture();
    }
  }

  private loadFacture() {
    this.factureService.getFactureById(this.factureId).subscribe({
      next: f => { this.facture = f; },
      error: () => { this.errorMessage = 'Impossible de charger les articles de la facture'; },
    });
  }

  // ─── Mode égal ───────────────────────────────────────────────────────────────

  ajusterConvives(delta: number) {
    this.nombreConvives = Math.max(2, Math.min(20, this.nombreConvives + delta));
  }

  calculerSplitEgal() {
    this.loading = true;
    this.errorMessage = null;
    this.partStates = {};
    this.factureService.splitEgal(this.factureId, this.nombreConvives).subscribe({
      next: r => { this.results = r; this.loading = false; },
      error: err => {
        this.errorMessage = err?.error?.message ?? 'Erreur lors du calcul';
        this.loading = false;
      },
    });
  }

  // ─── Mode par article ─────────────────────────────────────────────────────────

  addConvive() {
    if (this.convives.length < 20) {
      this.convives.push({ nom: '' });
    }
  }

  removeConvive(index: number) {
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

  get tousItemsAssignes(): boolean {
    if (!this.facture?.items?.length) return false;
    return this.facture.items.every(item => this.itemAssignments[item.id] !== undefined);
  }

  calculerSplitSelection() {
    if (!this.facture) return;
    this.loading = true;
    this.errorMessage = null;
    this.partStates = {};

    const parts: SplitPartRequest[] = this.convives
      .map((_, i) => ({
        nomConvive: this.conviveNom(i),
        itemIds: this.facture!.items
          .filter(item => this.itemAssignments[item.id] === i)
          .map(item => item.id),
      }))
      .filter(p => p.itemIds.length > 0);

    this.factureService.splitParSelection(this.factureId, parts).subscribe({
      next: r => { this.results = r; this.loading = false; },
      error: err => {
        this.errorMessage = err?.error?.message ?? 'Erreur lors du calcul';
        this.loading = false;
      },
    });
  }

  // ─── Règlement Individuel Post-Split ──────────────────────────────────────────

  get totalSplit(): number {
    return this.results.reduce((acc, r) => acc + r.sousTotal, 0);
  }

  get montantTotalAddition(): number {
    return this.facture?.totalTTC ?? this.facture?.total ?? this.totalSplit;
  }

  get montantRegle(): number {
    return this.results.reduce((acc, r, i) => {
      const state = this.partStates[i];
      return state?.reglee ? acc + r.sousTotal : acc;
    }, 0);
  }

  get soldeRestant(): number {
    return Math.max(0, Math.round((this.montantTotalAddition - this.montantRegle) * 100) / 100);
  }

  get ratioRegle(): number {
    if (!this.montantTotalAddition || this.montantTotalAddition <= 0) return 0;
    return Math.min(1, this.montantRegle / this.montantTotalAddition);
  }

  get toutesPartsReglees(): boolean {
    return this.results.length > 0 && this.results.every((_, i) => !!this.partStates[i]?.reglee);
  }

  /**
   * Opens the payment modal for an individual guest part.
   * On confirmation, updates part settlement state and automatically
   * settles the main invoice when all parts are paid.
   *
   * @param index Guest index in results array
   * @param part The guest's split result DTO
   */
  async reglerPart(index: number, part: SplitResultDTO) {
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
      message: `Part de ${part.nomConvive} réglée avec succès (${data.modePaiement})`,
      duration: 2000,
      color: 'success'
    });
    await toast.present();

    if (this.toutesPartsReglees) {
      this.finaliserReglementFactureGlobale();
    }
  }

  private finaliserReglementFactureGlobale() {
    const totalPourboires = Object.values(this.partStates).reduce((acc, s) => acc + (s.pourboire || 0), 0);
    this.factureService.reglerFacture(this.factureId, 'MIXTE_SPLIT', totalPourboires).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Toutes les parts ont été réglées ! Facture finalisée et table libérée.',
          duration: 3000,
          color: 'success'
        });
        await toast.present();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Erreur lors de la finalisation globale',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }
}
