import { Component, Input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  closeOutline,
  warningOutline,
  trashOutline,
  checkmarkCircleOutline,
  restaurantOutline,
  personOutline,
  pricetagOutline,
  timeOutline,
  chatbubbleEllipsesOutline,
  cubeOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Commande, CommandeItem } from '../../../models/commande.model';
import { AppCurrencyPipe } from '../../../pipes/app-currency.pipe';

/**
 * Result data payload returned when the cancel order modal is dismissed.
 */
export interface CancelOrderModalResult {
  confirmed: boolean;
  reason?: string;
}

/**
 * Modern, theme-adaptive confirmation modal for cancelling an order in OpenBar.
 * Displays order recap, affected table/waiter, warning alert, optional reason selector,
 * and clear confirmation/dismissal actions following OpenBar Design System tokens.
 */
@Component({
  selector: 'app-cancel-order-modal',
  templateUrl: './cancel-order-modal.component.html',
  styleUrl: './cancel-order-modal.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    AppCurrencyPipe,
    IonIcon
  ]
})
export class CancelOrderModalComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly translocoService = inject(TranslocoService);

  /** Target order to be cancelled (optional if individual props are passed). */
  @Input() commande?: Commande | null;
  /** Direct order ID fallback. */
  @Input() commandeId?: number;
  /** Direct table number or name fallback. */
  @Input() tableNumero?: number | string;
  /** Direct items array fallback. */
  @Input() items?: CommandeItem[];
  /** Direct total price fallback. */
  @Input() total?: number;
  /** Direct server name fallback. */
  @Input() serveurUsername?: string;
  /** Direct order notes fallback. */
  @Input() notes?: string;

  /** Signal holding selected quick cancellation reason key. */
  readonly selectedReasonKey = signal<string>('MISTAKE');
  /** Signal holding custom reason text input. */
  readonly customReason = signal<string>('');

  /** Available preset cancellation reasons. */
  readonly reasonOptions = [
    { key: 'MISTAKE', labelKey: 'COMMANDES.CONFIRM_CANCEL_REASONS.MISTAKE' },
    { key: 'CUSTOMER_CANCEL', labelKey: 'COMMANDES.CONFIRM_CANCEL_REASONS.CUSTOMER_CANCEL' },
    { key: 'OUT_OF_STOCK', labelKey: 'COMMANDES.CONFIRM_CANCEL_REASONS.OUT_OF_STOCK' },
    { key: 'DELAY', labelKey: 'COMMANDES.CONFIRM_CANCEL_REASONS.DELAY' },
    { key: 'OTHER', labelKey: 'COMMANDES.CONFIRM_CANCEL_REASONS.OTHER' },
  ];

  /** Resolved order ID. */
  readonly resolvedId = computed(() => this.commande?.id ?? this.commandeId ?? 0);

  /** Resolved table identifier. */
  readonly resolvedTable = computed(() => this.commande?.tableNumero ?? this.tableNumero ?? '-');

  /** Resolved server username. */
  readonly resolvedServer = computed(() => this.commande?.serveurUsername ?? this.serveurUsername ?? '');

  /** Resolved total amount. */
  readonly resolvedTotal = computed(() => this.commande?.total ?? this.total ?? 0);

  /** Resolved items array. */
  readonly resolvedItems = computed<CommandeItem[]>(() => {
    return this.commande?.items ?? this.items ?? [];
  });

  /** Resolved notes string. */
  readonly resolvedNotes = computed(() => this.commande?.notes ?? this.notes ?? '');

  /** Grouped items for concise display. */
  readonly groupedItems = computed(() => {
    const rawItems = this.resolvedItems();
    if (!rawItems || rawItems.length === 0) return [];

    const map = new Map<string, { cocktailNom: string; varianteNom?: string; quantite: number; prixTotal: number; notes?: string }>();
    for (const item of rawItems) {
      const key = `${item.cocktailNom || item.cocktailId}_${item.varianteNom || ''}_${item.notes || ''}`;
      const existing = map.get(key);
      const itemTotal = (item.prixUnitaire ?? 0) * (item.quantite ?? 1);
      if (existing) {
        existing.quantite += (item.quantite ?? 1);
        existing.prixTotal += itemTotal;
      } else {
        map.set(key, {
          cocktailNom: item.cocktailNom || 'Cocktail',
          varianteNom: item.varianteNom,
          quantite: item.quantite ?? 1,
          prixTotal: itemTotal,
          notes: item.notes
        });
      }
    }
    return Array.from(map.values());
  });

  constructor() {
    addIcons({
      alertCircleOutline,
      closeOutline,
      warningOutline,
      trashOutline,
      checkmarkCircleOutline,
      restaurantOutline,
      personOutline,
      pricetagOutline,
      timeOutline,
      chatbubbleEllipsesOutline,
      cubeOutline
    });
  }

  /** Selects a preset reason chip. */
  setReason(key: string): void {
    this.selectedReasonKey.set(key);
  }

  /** Dismisses modal without cancelling. */
  dismissCancel(): void {
    this.modalCtrl.dismiss({ confirmed: false }, 'cancel');
  }

  /** Confirms order cancellation and returns payload with reason. */
  confirmCancel(): void {
    const reasonTranslated = this.translocoService.translate(
      `COMMANDES.CONFIRM_CANCEL_REASONS.${this.selectedReasonKey()}`
    );
    const finalReason = this.customReason().trim()
      ? `${reasonTranslated} (${this.customReason().trim()})`
      : reasonTranslated;

    this.modalCtrl.dismiss({
      confirmed: true,
      reason: finalReason
    } satisfies CancelOrderModalResult, 'confirm');
  }
}
