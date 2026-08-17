import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonIcon,
  IonChip,
  IonToggle,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, checkmarkCircleOutline, closeCircleOutline, saveOutline } from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CocktailService } from '../../../core/services/cocktail.service';
import { Cocktail } from '../../../core/models/cocktail.model';
import {
  SearchableSelectComponent,
  SearchableOption,
} from '../../../core/components/ui/searchable-select/searchable-select.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';

/**
 * Metadata mapping for 12 months with i18n keys.
 */
const MONTH_KEYS = [
  { value: 1, key: 'COCKTAILS.SEASONALITY.MONTHS.1' },
  { value: 2, key: 'COCKTAILS.SEASONALITY.MONTHS.2' },
  { value: 3, key: 'COCKTAILS.SEASONALITY.MONTHS.3' },
  { value: 4, key: 'COCKTAILS.SEASONALITY.MONTHS.4' },
  { value: 5, key: 'COCKTAILS.SEASONALITY.MONTHS.5' },
  { value: 6, key: 'COCKTAILS.SEASONALITY.MONTHS.6' },
  { value: 7, key: 'COCKTAILS.SEASONALITY.MONTHS.7' },
  { value: 8, key: 'COCKTAILS.SEASONALITY.MONTHS.8' },
  { value: 9, key: 'COCKTAILS.SEASONALITY.MONTHS.9' },
  { value: 10, key: 'COCKTAILS.SEASONALITY.MONTHS.10' },
  { value: 11, key: 'COCKTAILS.SEASONALITY.MONTHS.11' },
  { value: 12, key: 'COCKTAILS.SEASONALITY.MONTHS.12' },
];

/**
 * Cocktail Seasonality Component.
 * Allows configuring active seasonal availability months with searchable dropdown comboboxes.
 */
@Component({
  selector: 'app-cocktail-saisonnalite',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonIcon,
    IonChip,
    IonToggle,
    IonLabel,
    SearchableSelectComponent,
    ActionButtonComponent,
  ],
  templateUrl: './cocktail-saisonnalite.component.html',
  styleUrls: ['./cocktail-saisonnalite.component.scss'],
})
export class CocktailSaisonnaliteComponent implements OnInit {
  /** Target cocktail to configure seasonality for. */
  @Input() cocktail!: Cocktail;

  /** Event emitted when cocktail seasonality is successfully updated. */
  @Output() updated = new EventEmitter<Cocktail>();

  readonly listeMois = MONTH_KEYS;
  moisDebut: number | null = null;
  moisFin: number | null = null;
  touteAnnee = true;
  saving = false;
  moisCourant = new Date().getMonth() + 1;

  constructor(
    private readonly cocktailService: CocktailService,
    private readonly translocoService: TranslocoService
  ) {
    addIcons({ calendarOutline, checkmarkCircleOutline, closeCircleOutline, saveOutline });
  }

  ngOnInit(): void {
    this.moisDebut = this.cocktail?.moisDebut ?? null;
    this.moisFin = this.cocktail?.moisFin ?? null;
    this.touteAnnee = !this.moisDebut && !this.moisFin;
  }

  /**
   * Generates localized searchable options for the 12 calendar months.
   */
  getMonthOptions(): SearchableOption<number>[] {
    return this.listeMois.map((mois) => ({
      value: mois.value,
      label: this.translocoService.translate(mois.key),
      icon: 'calendar-outline',
    }));
  }

  /**
   * Resets seasonality values if cocktail is available all year round.
   */
  onTouteAnneeChange(): void {
    if (this.touteAnnee) {
      this.moisDebut = null;
      this.moisFin = null;
    }
  }

  /**
   * Evaluates if a given month is active in the selected seasonality range.
   * Supports both normal and year wrap-around intervals (e.g. Oct -> Mar).
   *
   * @param mois Month number (1 to 12)
   * @returns true if active
   */
  isMoisActif(mois: number): boolean {
    if (!this.moisDebut || !this.moisFin) return false;
    if (this.moisDebut <= this.moisFin) {
      return mois >= this.moisDebut && mois <= this.moisFin;
    }
    return mois >= this.moisDebut || mois <= this.moisFin;
  }

  /**
   * Evaluates if the cocktail is available in the current month.
   */
  get isDisponibleAujourdhui(): boolean {
    if (!this.moisDebut || !this.moisFin) return true;
    return this.isMoisActif(this.moisCourant);
  }

  /**
   * Saves updated seasonality settings to backend service.
   */
  sauvegarder(): void {
    this.saving = true;
    this.cocktailService
      .updateSaisonnalite(this.cocktail.id, this.moisDebut, this.moisFin)
      .subscribe({
        next: (updatedCocktail) => {
          this.saving = false;
          this.updated.emit(updatedCocktail);
        },
        error: () => {
          this.saving = false;
        },
      });
  }
}
