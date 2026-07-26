import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonButton, IonIcon,
  IonSegment, IonSegmentButton, IonList, IonBadge, IonNote,
  IonSpinner, IonInput, IonSelect, IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline, listOutline, calculatorOutline,
  removeOutline, addOutline, closeOutline,
} from 'ionicons/icons';
import { FactureService, SplitResultDTO, SplitPartRequest } from '../services/facture.service';
import { Facture } from '../models/facture.model';

@Component({
  selector: 'app-facture-split',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CurrencyPipe,
    IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonButton, IonIcon,
    IonSegment, IonSegmentButton, IonList, IonBadge, IonNote,
    IonSpinner, IonInput, IonSelect, IonSelectOption,
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

  constructor(private readonly route: ActivatedRoute,private readonly factureService: FactureService,
  ) {
    addIcons({ peopleOutline, listOutline, calculatorOutline, removeOutline, addOutline, closeOutline });
  }

  ngOnInit() {
    this.factureId = +this.route.snapshot.paramMap.get('id')!;
  }

  onModeChange() {
    this.results = [];
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
    // Réassigner les items du convive supprimé (désassigner) et décaler les index
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

  // ─── Commun ───────────────────────────────────────────────────────────────────

  get totalSplit(): number {
    return this.results.reduce((acc, r) => acc + r.sousTotal, 0);
  }
}
