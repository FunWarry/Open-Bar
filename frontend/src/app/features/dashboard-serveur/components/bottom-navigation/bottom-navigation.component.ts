import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

import { addIcons } from 'ionicons';
import { restaurantOutline, cartOutline, listOutline } from 'ionicons/icons';

/**
 * Identifier for active tab in Waiter mobile view.
 */
export type ServeurTab = 'tables' | 'commande' | 'suivi';

/**
 * Bottom navigation bar component for waiter mobile view (< 768px).
 * Provides quick access to tables, fast order entry, and active order tracking.
 */
@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [CommonModule, IonIcon, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bottom-navigation.component.html',
  styleUrls: ['./bottom-navigation.component.scss'],
})
export class BottomNavigationComponent {
  /** Currently active navigation tab */
  @Input() activeTab: ServeurTab = 'tables';
  /** Badge count for items currently in cart */
  @Input() cartBadgeCount = 0;
  /** Badge count for pending/active orders */
  @Input() pendingOrdersCount = 0;

  /** Event emitted when user selects a navigation tab */
  @Output() tabSelect = new EventEmitter<ServeurTab>();

  constructor() {
    addIcons({ restaurantOutline, cartOutline, listOutline });
  }

  /**
   * Emits tab selection event.
   *
   * @param tab Target navigation tab.
   */
  onSelect(tab: ServeurTab): void {
    this.tabSelect.emit(tab);
  }
}
