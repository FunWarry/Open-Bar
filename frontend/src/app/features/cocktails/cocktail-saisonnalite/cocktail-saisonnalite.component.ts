import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonItem, IonLabel, IonSelect, IonSelectOption,
  IonButton, IonIcon, IonNote, IonChip, IonToggle, IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { CocktailService } from '../../../core/services/cocktail.service';
import { Cocktail } from '../../../core/models/cocktail.model';

const MOIS = [
  { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' }, { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' }, { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' }
];

@Component({
  selector: 'app-cocktail-saisonnalite',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonItem, IonLabel, IonSelect, IonSelectOption,
    IonButton, IonIcon, IonNote, IonChip, IonToggle, IonText
  ],
  template: `
    <div class="saisonnalite-container">
      <!-- Toggle disponibilité toute l'année -->
      <ion-item lines="none">
        <ion-label>Disponible toute l'année</ion-label>
        <ion-toggle slot="end" [(ngModel)]="touteAnnee" (ionChange)="onTouteAnneeChange()"></ion-toggle>
      </ion-item>

      <!-- Sélecteurs mois si saisonnier -->
      @if (!touteAnnee) {
        <ion-item>
          <ion-label position="stacked">Mois de début</ion-label>
          <ion-select [(ngModel)]="moisDebut" placeholder="Sélectionner">
            @for (mois of listeMois; track mois.value) {
              <ion-select-option [value]="mois.value">{{ mois.label }}</ion-select-option>
            }
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Mois de fin</ion-label>
          <ion-select [(ngModel)]="moisFin" placeholder="Sélectionner">
            @for (mois of listeMois; track mois.value) {
              <ion-select-option [value]="mois.value">{{ mois.label }}</ion-select-option>
            }
          </ion-select>
        </ion-item>

        <!-- Aperçu visuel 12 cases -->
        <div class="saison-preview">
          <ion-note>Aperçu de la période</ion-note>
          <div class="mois-grid">
            @for (mois of listeMois; track mois.value) {
              <div
                class="mois-cell"
                [class.actif]="isMoisActif(mois.value)"
                [class.courant]="mois.value === moisCourant">
                {{ mois.label.slice(0, 3) }}
              </div>
            }
          </div>
        </div>

        <!-- Badge disponibilité aujourd'hui -->
        <div class="disponibilite-badge">
          @if (isDisponibleAujourdhui) {
            <ion-chip color="success">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              <ion-label>Disponible ce mois-ci</ion-label>
            </ion-chip>
          } @else {
            <ion-chip color="warning">
              <ion-icon name="close-circle-outline"></ion-icon>
              <ion-label>Hors saison</ion-label>
            </ion-chip>
          }
        </div>
      }

      <ion-button expand="block" (click)="sauvegarder()" [disabled]="saving" class="save-btn">
        {{ saving ? 'Enregistrement...' : 'Enregistrer la saisonnalité' }}
      </ion-button>
    </div>
  `,
  styles: [`
    .saisonnalite-container { padding: 8px 0; }

    .saison-preview {
      padding: 12px 16px;
    }

    .mois-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      margin-top: 8px;
    }

    .mois-cell {
      padding: 8px 4px;
      text-align: center;
      border-radius: 4px;
      font-size: 12px;
      background: rgba(255,255,255,0.05);
      color: var(--ion-color-medium);
      border: 2px solid transparent;
      transition: background 0.2s, color 0.2s;
    }

    .mois-cell.actif {
      background: rgba(var(--ion-color-primary-rgb), 0.2);
      color: var(--ion-color-primary);
      font-weight: 600;
    }

    .mois-cell.courant {
      border-color: var(--ion-color-primary);
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

  listeMois = MOIS;
  moisDebut: number | null = null;
  moisFin: number | null = null;
  touteAnnee = true;
  saving = false;
  moisCourant = new Date().getMonth() + 1;

  constructor(private cocktailService: CocktailService) {
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
    // Chevauchement d'année (ex: Oct → Fév)
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
