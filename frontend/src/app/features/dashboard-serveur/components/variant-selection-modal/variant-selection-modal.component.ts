import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, optionsOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { ProductItem, ProductVariant } from '../product-card/product-card.component';

@Component({
  selector: 'app-variant-selection-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>
          <ion-icon name="options-outline" class="title-icon"></ion-icon>
          Choisir une variante — {{ product.nom }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()" aria-label="Fermer">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding variant-modal-content">
      <p class="modal-subtitle">
        Veuillez sélectionner le format ou la variante souhaitée pour {{ product.nom }} :
      </p>

      <div class="variants-list">
        <button
          *ngFor="let v of product.variantes; let i = index"
          class="variant-card-btn"
          (click)="selectVariant(v)"
          (keyup.enter)="selectVariant(v)">
          <div class="variant-info">
            <span class="variant-name">{{ v.nom }}</span>
            <span class="variant-price">{{ v.prix | number:'1.2-2' }} €</span>
          </div>
          <ion-icon name="checkmark-circle-outline" class="select-icon"></ion-icon>
        </button>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --background: var(--background-surface-1, #16192b);
    }
    ion-toolbar {
      --background: var(--background-surface-2, #21263f);
      --color: var(--text-primary, #eceefb);
      .title-icon {
        color: var(--primary, #6c7fe8);
        margin-right: 6px;
      }
    }
    .variant-modal-content {
      --background: var(--background-bg-0, #0f0f1a);
      --color: var(--text-primary, #eceefb);
    }
    .modal-subtitle {
      color: var(--text-secondary, #a4add0);
      font-size: 0.9rem;
      margin-bottom: 16px;
    }
    .variants-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .variant-card-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--background-surface-1, #16192b);
      border: 1px solid var(--border-medium, #2e3450);
      border-radius: var(--radius-md, 10px);
      padding: 14px 16px;
      color: var(--text-primary, #eceefb);
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;

      &:hover {
        background: var(--background-surface-2, #21263f);
        border-color: var(--primary, #6c7fe8);
        transform: translateY(-1px);
      }

      .variant-info {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .variant-name {
          font-weight: 700;
          font-size: 1rem;
        }
        .variant-price {
          font-weight: 600;
          color: var(--semantic-success, #2fbf6b);
          font-size: 0.9rem;
        }
      }

      .select-icon {
        font-size: 1.3rem;
        color: var(--primary, #6c7fe8);
      }
    }
  `],
})
export class VariantSelectionModalComponent {
  @Input({ required: true }) product!: ProductItem;

  constructor(private readonly modalCtrl: ModalController) {
    addIcons({ closeOutline, optionsOutline, checkmarkCircleOutline });
  }

  close() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  selectVariant(variant: ProductVariant) {
    this.modalCtrl.dismiss({ selectedVariant: variant }, 'confirm');
  }
}
