import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';
import { TableView } from '../../models/table-view.model';

import { addIcons } from 'ionicons';
import {
  restaurantOutline, peopleOutline, locationOutline,
  timeOutline, addCircleOutline, personAddOutline, checkmarkDoneOutline,
} from 'ionicons/icons';

/**
 * Mobile table card component for waiter dashboard.
 * Displays compact table details, occupancy status, active total, and waiting timer indicator.
 */
@Component({
  selector: 'app-mobile-table-card',
  standalone: true,
  imports: [CommonModule, IonIcon, TranslocoPipe, AppCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-table-card.component.html',
  styleUrls: ['./mobile-table-card.component.scss'],
})
export class MobileTableCardComponent {
  /** Target table view data */
  @Input({ required: true }) table!: TableView;
  /** Count of pending orders for this table */
  @Input() pendingOrdersCount = 0;
  /** Total amount for active orders */
  @Input() activeTotal = 0;
  /** Elapsed wait time in minutes for table service/preparation */
  @Input() waitTimeMinutes = 0;

  /** Emits when card is selected */
  @Output() tableSelect = new EventEmitter<TableView>();
  /** Emits when new order button is clicked */
  @Output() newOrder = new EventEmitter<TableView>();
  /** Emits when occupy button is clicked */
  @Output() occupyTable = new EventEmitter<TableView>();
  /** Emits when free button is clicked */
  @Output() freeTable = new EventEmitter<TableView>();

  constructor(private readonly translocoService: TranslocoService) {
    addIcons({
      restaurantOutline, peopleOutline, locationOutline,
      timeOutline, addCircleOutline, personAddOutline, checkmarkDoneOutline,
    });
  }

  /**
   * Status color hex for custom status badge.
   */
  get StatusColor(): string {
    if (this.table.occupee) return 'var(--table-occupied, #e67e22)';
    return 'var(--table-free, #26ae60)';
  }

  /**
   * Status translated label for table status badge.
   */
  get StatusLabel(): string {
    const key = this.table.occupee ? 'SERVEUR_MOBILE.CARD.STATUS_OCCUPIED' : 'SERVEUR_MOBILE.CARD.STATUS_FREE';
    return this.translocoService.translate(key);
  }

  /**
   * Dynamic CSS class based on waiting time severity.
   */
  get WaitTimeClass(): string {
    if (this.waitTimeMinutes >= 20) return 'wait-danger';
    if (this.waitTimeMinutes >= 10) return 'wait-warning';
    return 'wait-normal';
  }
}
