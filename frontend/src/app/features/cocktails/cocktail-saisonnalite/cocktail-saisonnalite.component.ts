import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonItem, IonLabel, IonSelect, IonSelectOption,
  IonButton, IonIcon, IonNote, IonChip, IonToggle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { CocktailService } from '../../../core/services/cocktail.service';
import { Cocktail } from '../../../core/models/cocktail.model';

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
  { value: 12, key: 'COCKTAILS.SEASONALITY.MONTHS.12' }
];

@Component({
  selector: 'app-cocktail-saisonnalite',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslocoModule,
    IonItem, IonLabel, IonSelect, IonSelectOption,
    IonButton, IonIcon, IonNote, IonChip, IonToggle
  ],
  template: `
    <div class="saisonnalite-container">
      <!-- Year-round availability toggle -->
      <ion-item lines="none">
        <ion-label>{{ 'COCKTAILS.SEASONALITY.ALL_YEAR' | transloco }}</ion-label>
        <ion-toggle slot="end" [(ngModel)]="touteAnnee" (ionChange)="onTouteAnneeChange()"></ion-toggle>
      </ion-item>

      <!-- Month selectors if seasonal -->
      @if (!touteAnnee) {
        <ion-item>
          <ion-label position="stacked">{{ 'COCKTAILS.SEASONALITY.START_MONTH' | transloco }}</ion-label>
          <ion-select [(ngModel)]="moisDebut" [placeholder]="'COMMON.SELECT' | transloco">
            @for (mois of listeMois; track mois.value) {
              <ion-select-option [value]="mois.value">{{ mois.key | transloco }}</ion-select-option>
            }
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">{{ 'COCKTAILS.SEASONALITY.END_MONTH' | transloco }}</ion-label>
          <ion-select [(ngModel)]="moisFin" [placeholder]="'COMMON.SELECT' | transloco">
            @for (mois of listeMois; track mois.value) {
              <ion-select-option [value]="mois.value">{{ mois.key | transloco }}</ion-select-option>
            }
          </ion-select>
        </ion-item>

        <!-- 12-month period preview -->
        <div class="saison-preview">
          <ion-note>{{ 'COCKTAILS.SEASONALITY.PERIOD_PREVIEW' | transloco }}</ion-note>
          <div class="mois-grid">
            @for (mois of listeMois; track mois.value) {
              <div
                class="mois-cell"
                [class.actif]="isMoisActif(mois.value)"
                [class.courant]="mois.value === moisCourant">
                {{ (mois.key | transloco).slice(0, 3) }}
              </div>
            }
          </div>
        </div>

        <!-- Availability badge for current month -->
        <div class="disponibilite-badge">
          @if (isDisponibleAujourdhui) {
            <ion-chip color="success">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              <ion-label>{{ 'COCKTAILS.SEASONALITY.AVAILABLE_NOW' | transloco }}</ion-label>
            </ion-chip>
          } @else {
            <ion-chip color="warning">
              <ion-icon name="close-circle-outline"></ion-icon>
              <ion-label>{{ 'COCKTAILS.SEASONALITY.OUT_OF_SEASON' | transloco }}</ion-label>
            </ion-chip>
          }
        </div>
      }

      <ion-button expand="block" (click)="sauvegarder()" [disabled]="saving" class="save-btn">
        {{ (saving ? 'COCKTAILS.SEASONALITY.SAVING' : 'COCKTAILS.SEASONALITY.SAVE') | transloco }}
      </ion-button>
    </div>
  `,
  styles: [`
    .saisonnalite-container { padding: 8px 0; }

    .saison-preview {
      padding: 12px 16px;
    }

    .saison-preview ion-note {
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
    }

    .mois-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-top: 8px;
    }

    .mois-cell {
      padding: 8px 4px;
      text-align: center;
      border-radius: var(--radius-sm, 6px);
      font-size: 12px;
      font-weight: 500;
      background: var(--background-surface-2);
      color: var(--text-secondary);
      border: 1px solid var(--border-medium);
      transition: all 0.2s ease;
    }

    .mois-cell.actif {
      background: var(--primary-tint-weak, rgba(108, 127, 232, 0.15));
      color: var(--primary);
      border-color: var(--primary);
      font-weight: 700;
    }

    .mois-cell.courant {
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary);
    }

    .disponibilite-badge {
      padding: 0 16px 8px;
    }

    .save-btn {
      margin: 8px 16px;
    }
  `]
})
export class CocktailSaisonnaliteComponent implements OnInit {
  @Input() cocktail!: Cocktail;
  @Output() updated = new EventEmitter<Cocktail>();

  listeMois = MONTH_KEYS;
  moisDebut: number | null = null;
  moisFin: number | null = null;
  touteAnnee = true;
  saving = false;
  moisCourant = new Date().getMonth() + 1;

  constructor(private readonly cocktailService: CocktailService) {
    addIcons({ calendarOutline, checkmarkCircleOutline, closeCircleOutline });
  }

  ngOnInit(): void {
    this.moisDebut = this.cocktail.moisDebut ?? null;
    this.moisFin = this.cocktail.moisFin ?? null;
    this.touteAnnee = !this.moisDebut && !this.moisFin;
  }

  onTouteAnneeChange(): void {
    if (this.touteAnnee) {
      this.moisDebut = null;
      this.moisFin = null;
    }
  }

  isMoisActif(mois: number): boolean {
    if (!this.moisDebut || !this.moisFin) return false;
    if (this.moisDebut <= this.moisFin) {
      return mois >= this.moisDebut && mois <= this.moisFin;
    }
    // Year wrap-around (e.g. Oct -> Feb)
    return mois >= this.moisDebut || mois <= this.moisFin;
  }

  get isDisponibleAujourdhui(): boolean {
    if (!this.moisDebut || !this.moisFin) return true;
    return this.isMoisActif(this.moisCourant);
  }

  sauvegarder(): void {
    this.saving = true;
    this.cocktailService.updateSaisonnalite(this.cocktail.id, this.moisDebut, this.moisFin).subscribe({
      next: (updatedCocktail) => {
        this.saving = false;
        this.updated.emit(updatedCocktail);
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
