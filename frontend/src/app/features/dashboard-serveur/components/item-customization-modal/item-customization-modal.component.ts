import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, chatbubbleEllipsesOutline, checkmarkCircleOutline, removeCircleOutline, createOutline } from 'ionicons/icons';
import { ProductItem } from '../product-card/product-card.component';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

/**
 * Modal for customizing beverage recipes and adding notes.
 */
@Component({
  selector: 'app-item-customization-modal',
  standalone: true,
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>
          <ion-icon name="chatbubble-ellipses-outline" class="title-icon"></ion-icon>
          {{ 'SERVEUR.CUSTOMIZATION_TITLE' | transloco: { product: product.nom + (variantNom ? ' (' + variantNom + ')' : '') } }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()" [attr.aria-label]="'COMMON.CLOSE' | transloco">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding custom-modal-content">
      <!-- Exclusions d'ingrédients -->
      @if (ingredientsList.length > 0) {
        <div class="section-block">
          <label class="section-label">
            <ion-icon name="remove-circle-outline"></ion-icon>
            {{ 'SERVEUR.REMOVE_INGREDIENTS' | transloco }}
          </label>
          <div class="ingredients-chips">
            @for (ing of ingredientsList; track ing) {
              <button
                class="chip-btn"
                [class.excluded]="excludedIngredients.includes(ing)"
                (click)="toggleIngredientExclusion(ing)">
                <span class="chip-prefix">{{ excludedIngredients.includes(ing) ? '✕' : '−' }}</span>
                {{ ('COCKTAILS.ALLERGENS.SANS_PREFIX' | transloco) + ' ' + ing }}
              </button>
            }
          </div>
        </div>
      }
    
      <!-- Quick Note Chips -->
      <div class="section-block">
        <label class="section-label">
          <ion-icon name="chatbubble-ellipses-outline"></ion-icon>
          {{ 'SERVEUR.QUICK_NOTES' | transloco }}
        </label>
        <div class="quick-notes-chips">
          @for (noteKey of quickNoteKeys; track noteKey) {
            <button
              class="chip-btn quick-chip"
              [class.active]="hasQuickNoteKey(noteKey)"
              (click)="toggleQuickNoteKey(noteKey)">
              {{ noteKey | transloco }}
            </button>
          }
        </div>
      </div>
    
      <!-- Free Comment Input -->
      <div class="section-block">
        <label class="section-label" for="custom-comment-input">
          <ion-icon name="create-outline"></ion-icon>
          {{ 'SERVEUR.CUSTOM_NOTE' | transloco }}
        </label>
        <textarea
          id="custom-comment-input"
          class="custom-textarea"
          rows="3"
          [placeholder]="'SERVEUR.CUSTOM_NOTE_PLACEHOLDER' | transloco"
          [(ngModel)]="commentaire">
        </textarea>
      </div>
    
      <!-- Submit Action Button -->
      <div class="actions-row">
        <button class="confirm-btn" (click)="save()" (keyup.enter)="save()">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          {{ 'SERVEUR.CONFIRM_CUSTOMIZATION' | transloco }}
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

  readonly quickNoteKeys = [
    'SERVEUR.QUICK_NOTES_OPTIONS.NO_ICE',
    'SERVEUR.QUICK_NOTES_OPTIONS.LESS_ICE',
    'SERVEUR.QUICK_NOTES_OPTIONS.ON_THE_ROCKS',
    'SERVEUR.QUICK_NOTES_OPTIONS.LEMON_SLICE',
    'SERVEUR.QUICK_NOTES_OPTIONS.EXTRA_SHAKEN',
    'SERVEUR.QUICK_NOTES_OPTIONS.SERVE_VERY_COLD',
    'SERVEUR.QUICK_NOTES_OPTIONS.EXTRA_STRAW',
  ];

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly translocoService: TranslocoService
  ) {
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

  hasQuickNoteKey(noteKey: string): boolean {
    const text = this.translocoService.translate(noteKey);
    return this.hasQuickNote(text);
  }

  toggleQuickNoteKey(noteKey: string) {
    const note = this.translocoService.translate(noteKey);
    this.toggleQuickNote(note);
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
