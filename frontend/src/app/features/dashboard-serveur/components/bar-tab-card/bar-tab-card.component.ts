import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  receiptOutline,
  timeOutline,
  cardOutline,
  swapHorizontalOutline,
  cashOutline,
  closeCircleOutline,
  addOutline,
  eyeOutline,
  shieldCheckmarkOutline,
  restaurantOutline,
  chatbubbleEllipsesOutline,
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { BarTab } from '../../../../core/models/bar-tab.model';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';

/**
 * Visual card representing a customer running bar tab in server and manager views.
 * Displays customer identifier, running duration, consolidated balance, and action buttons.
 */
@Component({
  selector: 'app-bar-tab-card',
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    TranslocoPipe,
    AppCurrencyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bar-tab-card.component.html',
  styleUrls: ['./bar-tab-card.component.scss'],
})
export class BarTabCardComponent {
  /** The bar tab entity displayed by this card */
  @Input({ required: true }) tab!: BarTab;

  /** Event emitted when the server clicks to add a new order to this tab */
  @Output() addOrder = new EventEmitter<BarTab>();

  /** Event emitted to view full consumption breakdown and items */
  @Output() viewDetails = new EventEmitter<BarTab>();

  /** Event emitted to transfer orders to/from this tab */
  @Output() transfer = new EventEmitter<BarTab>();

  /** Event emitted to initiate bill settlement for this tab */
  @Output() settle = new EventEmitter<BarTab>();

  /** Event emitted to cancel or close this tab */
  @Output() cancelTab = new EventEmitter<BarTab>();

  constructor() {
    addIcons({
      receiptOutline,
      timeOutline,
      cardOutline,
      swapHorizontalOutline,
      cashOutline,
      closeCircleOutline,
      addOutline,
      eyeOutline,
      shieldCheckmarkOutline,
      restaurantOutline,
      chatbubbleEllipsesOutline,
    });
  }

  /**
   * Formats elapsed duration since tab opened into a human-readable string.
   */
  get elapsedFormatted(): string {
    if (!this.tab?.openedAt) {
      return '';
    }
    const opened = new Date(this.tab.openedAt).getTime();
    const now = Date.now();
    const diffMinutes = Math.max(0, Math.floor((now - opened) / 60000));
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  }
}
