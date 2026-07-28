import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonRadioGroup,
  IonRadio, IonTextarea, IonFooter, IonIcon, IonNote,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { closeOutline, addCircleOutline } from 'ionicons/icons';
import { Cocktail, CocktailVariante } from '../../../core/models/cocktail.model';

/**
 * Data emitted by the modal when the user confirms their selection.
 */
export interface VarianteSelectionResult {
  /** The selected variant, or null for the classic version. */
  variante: CocktailVariante | null;
  /** Free-text barman notes, or undefined if not provided. */
  notes: string | undefined;
  /** The effective unit price (base price + variant supplement). */
  prixEffectif: number;
}

/**
 * Modal for selecting a cocktail variant and entering optional barman notes.
 *
 * Opened by {@link NouvelleCommandeComponent} when a cocktail card is tapped.
 * Emits a {@link VarianteSelectionResult} on confirmation, or dismisses without
 * data when the user cancels.
 */
@Component({
  selector: 'app-variante-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonRadioGroup,
    IonRadio, IonTextarea, IonFooter, IonIcon, IonNote,
    TranslocoModule,
  ],
  templateUrl: './variante-modal.component.html',
  styleUrls: ['./variante-modal.component.scss'],
})
export class VarianteModalComponent implements OnInit {
  /** The cocktail for which the user is choosing a variant. */
  @Input() cocktail!: Cocktail;

  /** Id of the currently selected variant, or null for the classic version. */
  selectedVarianteId: number | null = null;

  /** Free-text notes entered by the server for the barman. */
  notes = '';

  /** Variants that are currently available for selection. */
  variantesDisponibles: CocktailVariante[] = [];

  constructor(private readonly modalCtrl: ModalController) {
    addIcons({ closeOutline, addCircleOutline });
  }

  /** @inheritdoc */
  ngOnInit(): void {
    this.variantesDisponibles = this.cocktail.variantes.filter(v => v.disponible);
  }

  /**
   * Computes the effective unit price based on the selected variant.
   * @returns Base price plus the variant supplement, or base price when no variant is selected.
   */
  get prixEffectif(): number {
    if (this.selectedVarianteId === null) {
      return this.cocktail.prix;
    }
    const variante = this.variantesDisponibles.find(v => v.id === this.selectedVarianteId);
    return this.cocktail.prix + (variante?.prixSupplement ?? 0);
  }

  /**
   * Returns the supplement label for the currently selected variant.
   * Returns an empty string if no variant is selected or the supplement is zero.
   */
  get supplementLabel(): string {
    if (this.selectedVarianteId === null) return '';
    const variante = this.variantesDisponibles.find(v => v.id === this.selectedVarianteId);
    if (!variante || variante.prixSupplement === 0) return '';
    const sign = variante.prixSupplement > 0 ? '+' : '';
    return `${sign}${variante.prixSupplement.toFixed(2)} €`;
  }

  /**
   * Confirms the selection and dismisses the modal with the result data.
   */
  confirmer(): void {
    const variante = this.selectedVarianteId === null
      ? null
      : (this.variantesDisponibles.find(v => v.id === this.selectedVarianteId) ?? null);

    const result: VarianteSelectionResult = {
      variante,
      notes: this.notes.trim() || undefined,
      prixEffectif: this.prixEffectif,
    };
    this.modalCtrl.dismiss(result, 'confirm');
  }

  /**
   * Cancels the selection and dismisses the modal without data.
   */
  annuler(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
