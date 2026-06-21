import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonButton, IonIcon,
  IonSegment, IonSegmentButton, IonList, IonBadge, IonNote,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, listOutline, calculatorOutline, removeOutline, addOutline } from 'ionicons/icons';
import { FactureService, SplitResultDTO } from '../services/facture.service';

@Component({
  selector: 'app-facture-split',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DecimalPipe, CurrencyPipe,
    IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonButton, IonIcon,
    IonSegment, IonSegmentButton, IonList, IonBadge, IonNote,
    IonSpinner
  ],
  templateUrl: './facture-split.component.html',
  styleUrls: ['./facture-split.component.scss']
})
export class FactureSplitComponent implements OnInit {
  factureId!: number;
  mode: 'egal' | 'selection' = 'egal';
  nombreConvives = 2;
  results: SplitResultDTO[] = [];
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private factureService: FactureService
  ) {
    addIcons({ peopleOutline, listOutline, calculatorOutline, removeOutline, addOutline });
  }

  ngOnInit() {
    this.factureId = +this.route.snapshot.paramMap.get('id')!;
  }

  onModeChange() {
    this.results = [];
    this.errorMessage = null;
  }

  ajusterConvives(delta: number) {
    this.nombreConvives = Math.max(2, Math.min(20, this.nombreConvives + delta));
  }

  calculerSplitEgal() {
    this.loading = true;
    this.errorMessage = null;
    this.factureService.splitEgal(this.factureId, this.nombreConvives).subscribe({
      next: (r) => { this.results = r; this.loading = false; },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur lors du calcul';
        this.loading = false;
      }
    });
  }

  get totalSplit(): number {
    return this.results.reduce((acc, r) => acc + r.sousTotal, 0);
  }
}
