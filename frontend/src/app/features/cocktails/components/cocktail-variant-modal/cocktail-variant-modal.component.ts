import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonIcon, ModalController
} from '@ionic/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import {
  closeOutline, optionsOutline, gitBranchOutline, checkmarkCircleOutline,
  sparklesOutline, leafOutline, flameOutline, funnelOutline, alertCircleOutline
} from 'ionicons/icons';
import { Cocktail, CocktailVariante } from '../../../../core/models/cocktail.model';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';

/**
 * Result data payload returned when closing the variant viewer or selector modal.
 */
export interface CocktailVariantModalResult {
  /** Selected variant, or null if the standard base recipe was chosen */
  selectedVariant: CocktailVariante | null;
  /** Action role confirming selection or cancellation */
  confirmed: boolean;
}

/**
 * Interactive modal displaying all variants of a cocktail, with respect to active filters.
 *
 * In viewing mode (Notre Carte catalog), users explore variant recipes, descriptions, and ingredients.
 * In selection mode (Server order-taking), staff can select a specific variant to add to the order cart.
 */
@Component({
  selector: 'app-cocktail-variant-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    TranslocoPipe,
    AppCurrencyPipe,
  ],
  templateUrl: './cocktail-variant-modal.component.html',
  styleUrls: ['./cocktail-variant-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CocktailVariantModalComponent implements OnInit {
  /** Target cocktail parent model containing the variant list */
  @Input() cocktail!: Cocktail;

  /** Pre-filtered list of variants that satisfy all currently active catalog filters */
  @Input() filteredVariants: CocktailVariante[] = [];

  /** Whether the modal operates in server order-taking selection mode */
  @Input() selectionMode = false;

  /** Human-readable summary of active filter criteria restricting variants, if any */
  @Input() activeFilterSummary = '';

  /** Whether to show all variants ignoring active filters (user toggle) */
  showAllVariants = false;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly transloco: TranslocoService
  ) {
    addIcons({
      closeOutline,
      optionsOutline,
      gitBranchOutline,
      checkmarkCircleOutline,
      sparklesOutline,
      leafOutline,
      flameOutline,
      funnelOutline,
      alertCircleOutline,
      'close-outline': closeOutline,
      'options-outline': optionsOutline,
      'git-branch-outline': gitBranchOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'sparkles-outline': sparklesOutline,
      'leaf-outline': leafOutline,
      'flame-outline': flameOutline,
      'funnel-outline': funnelOutline,
      'alert-circle-outline': alertCircleOutline,
    });
  }

  ngOnInit(): void {
    if (!this.filteredVariants && this.cocktail?.variantes) {
      this.filteredVariants = this.cocktail.variantes.filter(v => v.disponible !== false);
    }
  }

  /**
   * Returns the list of variants currently displayed to the user based on filter toggle.
   */
  get displayedVariants(): CocktailVariante[] {
    if (this.showAllVariants || !this.activeFilterSummary) {
      return (this.cocktail?.variantes || []).filter(v => v.disponible !== false);
    }
    return this.filteredVariants;
  }

  /**
   * Number of variants hidden due to active filter constraints.
   */
  get hiddenVariantsCount(): number {
    const total = (this.cocktail?.variantes || []).filter(v => v.disponible !== false).length;
    return Math.max(0, total - this.filteredVariants.length);
  }

  /**
   * Computes effective selling price for a variant including price supplement.
   *
   * @param variant Target variant model
   * @returns Effective selling price in EUR
   */
  getEffectivePrice(variant: CocktailVariante | null): number {
    if (!variant) {
      return this.cocktail?.prix ?? 0;
    }
    const supplement = variant.prixSupplement ?? 0;
    return Number(((this.cocktail?.prix ?? 0) + supplement).toFixed(2));
  }

  /**
   * Formats price surcharge label with sign prefix.
   *
   * @param variant Target variant model
   * @returns Formatted surcharge string (e.g. "+1.50 €" or "Inclus")
   */
  getSupplementLabel(variant: CocktailVariante | null): string {
    if (!variant?.prixSupplement || variant.prixSupplement === 0) {
      return this.transloco.translate('COCKTAILS.VARIANTS_STANDARD_PRICE');
    }
    const sign = variant.prixSupplement > 0 ? '+' : '';
    return `${sign}${variant.prixSupplement.toFixed(2)} €`;
  }

  /**
   * Toggles the display between strictly filtered variants and all variants.
   */
  toggleShowAll(): void {
    this.showAllVariants = !this.showAllVariants;
  }

  /**
   * Selects a variant option and dismisses the modal with confirmation.
   *
   * @param variant The selected variant or null for standard recipe
   */
  selectOption(variant: CocktailVariante | null): void {
    const payload: CocktailVariantModalResult = {
      selectedVariant: variant,
      confirmed: true,
    };
    void this.modalCtrl.dismiss(payload, 'confirm');
  }

  /**
   * Closes the modal without selecting an option.
   */
  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }
}
