import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, chatbubbleEllipsesOutline, checkmarkCircleOutline, removeCircleOutline, createOutline } from 'ionicons/icons';
import { ProductItem } from '../product-card/product-card.component';

@Component({
  selector: 'app-item-customization-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>
          <ion-icon name="chatbubble-ellipses-outline" class="title-icon"></ion-icon>
          Personnalisation — {{ product.nom }} {{ variantNom ? '(' + variantNom + ')' : '' }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()" aria-label="Fermer">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding custom-modal-content">
      <!-- Exclusions d'ingrédients -->
      <div class="section-block" *ngIf="ingredientsList.length > 0">
        <label class="section-label">
          <ion-icon name="remove-circle-outline"></ion-icon>
          Retirer des ingrédients (spécificités) :
        </label>
        <div class="ingredients-chips">
          <button
            *ngFor="let ing of ingredientsList"
            class="chip-btn"
            [class.excluded]="excludedIngredients.includes(ing)"
            (click)="toggleIngredientExclusion(ing)">
            <span class="chip-prefix">{{ excludedIngredients.includes(ing) ? '✕' : '−' }}</span>
            Sans {{ ing }}
          </button>
        </div>
      </div>

      <!-- Quick Note Chips -->
      <div class="section-block">
        <label class="section-label">
          <ion-icon name="chatbubble-ellipses-outline"></ion-icon>
          Remarques fréquentes :
        </label>
        <div class="quick-notes-chips">
          <button
            *ngFor="let note of quickNotes"
            class="chip-btn quick-chip"
            [class.active]="hasQuickNote(note)"
            (click)="toggleQuickNote(note)">
            {{ note }}
          </button>
        </div>
      </div>

      <!-- Free Comment Input -->
      <div class="section-block">
        <label class="section-label" for="custom-comment-input">
          <ion-icon name="create-outline"></ion-icon>
          Commentaire / Instruction personnalisée :
        </label>
        <textarea
          id="custom-comment-input"
          class="custom-textarea"
          rows="3"
          placeholder="Ex: Moins de glaçons, verre ballon, bien frais..."
          [(ngModel)]="commentaire">
        </textarea>
      </div>

      <!-- Submit Action Button -->
      <div class="actions-row">
        <button class="confirm-btn" (click)="save()" (keyup.enter)="save()">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          Valider la personnalisation
        </button>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      background: var(--background-surface-1, #16192b);
    }
    ion-toolbar {
      --background: var(--background-surface-2, #21263f);
      --color: var(--text-primary, #eceefb);
      flex-shrink: 0;
      .title-icon {
        color: var(--primary, #6c7fe8);
        margin-right: 6px;
      }
    }
    .custom-modal-content {
      --background: var(--background-bg-0, #0f0f1a);
      --color: var(--text-primary, #eceefb);
      max-height: calc(85vh - 56px);
      overflow-y: auto;
    }
    .section-block {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .section-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
        font-size: 0.85rem;
        color: var(--text-secondary, #a4add0);
        text-transform: uppercase;
        letter-spacing: 0.5px;

        ion-icon {
          color: var(--primary, #6c7fe8);
        }
      }
    }

    .ingredients-chips, .quick-notes-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--background-surface-2, #21263f);
      color: var(--text-primary, #eceefb);
      border: 1px solid var(--border-medium, #2e3450);
      border-radius: var(--radius-pill, 999px);
      padding: 6px 12px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: var(--background-surface-3, #2a3050);
      }

      &.excluded {
        background: rgba(229, 96, 79, 0.2);
        color: var(--semantic-danger, #e5604f);
        border-color: var(--semantic-danger, #e5604f);
        font-weight: 700;
      }

      &.quick-chip.active {
        background: rgba(79, 70, 229, 0.25);
        color: var(--primary-light, #aab4f3);
        border-color: var(--primary, #6c7fe8);
        font-weight: 700;
      }
    }

    .custom-textarea {
      width: 100%;
      background: var(--background-surface-1, #16192b);
      border: 1px solid var(--border-medium, #2e3450);
      border-radius: var(--radius-md, 10px);
      padding: 10px 12px;
      color: var(--text-primary, #eceefb);
      font-family: inherit;
      font-size: 0.9rem;
      resize: vertical;

      &:focus {
        outline: none;
        border-color: var(--primary, #6c7fe8);
        box-shadow: 0 0 0 2px rgba(108, 127, 232, 0.2);
      }
    }

    .actions-row {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;

      .confirm-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--primary-strong, #4f46e5);
        color: #ffffff;
        border: none;
        border-radius: var(--radius-md, 10px);
        padding: 12px 20px;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease;

        &:hover {
          background: #4338ca;
        }

        ion-icon {
          font-size: 1.2rem;
        }
      }
    }
  `],
})
export class ItemCustomizationModalComponent implements OnInit {
  @Input({ required: true }) product!: ProductItem;
  @Input() variantNom?: string;
  @Input() initialCommentaire?: string;
  @Input() initialExclusions: string[] = [];

  commentaire = '';
  excludedIngredients: string[] = [];

  readonly quickNotes = [
    'Sans glaçons',
    'Moins de glaçons',
    'Sur glace',
    'Tranche de citron',
    'Bien frappé',
    'Servir très frais',
    'Paille supplémentaire',
  ];

  constructor(private readonly modalCtrl: ModalController) {
    addIcons({ closeOutline, chatbubbleEllipsesOutline, checkmarkCircleOutline, removeCircleOutline, createOutline });
  }

  ngOnInit() {
    if (this.initialCommentaire) {
      this.commentaire = this.initialCommentaire;
    }
    if (this.initialExclusions) {
      this.excludedIngredients = [...this.initialExclusions];
    }
  }

  get ingredientsList(): string[] {
    if (Array.isArray(this.product.ingredients) && this.product.ingredients.length > 0) {
      return this.product.ingredients
        .map(ing => {
          if (typeof ing === 'string') return ing;
          if (typeof ing === 'object' && ing !== null) {
            return ing.ingredientNom || ing.nom || ing.name || '';
          }
          return String(ing);
        })
        .filter(s => s && s.length > 0 && !s.includes('[object'));
    }
    if (this.product.description) {
      return this.product.description
        .split(/[,·•]/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.includes('€') && !s.includes('%'));
    }
    return [];
  }

  toggleIngredientExclusion(ing: string) {
    const idx = this.excludedIngredients.indexOf(ing);
    if (idx >= 0) {
      this.excludedIngredients.splice(idx, 1);
    } else {
      this.excludedIngredients.push(ing);
    }
  }

  hasQuickNote(note: string): boolean {
    return this.commentaire.includes(note);
  }

  toggleQuickNote(note: string) {
    if (this.hasQuickNote(note)) {
      this.commentaire = this.commentaire.replace(note, '').replace(/,\s*,/g, ',').trim();
    } else {
      this.commentaire = this.commentaire ? `${this.commentaire}, ${note}` : note;
    }
  }

  close() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  save() {
    this.modalCtrl.dismiss({
      commentaire: this.commentaire.trim(),
      exclusions: this.excludedIngredients,
    }, 'confirm');
  }
}
