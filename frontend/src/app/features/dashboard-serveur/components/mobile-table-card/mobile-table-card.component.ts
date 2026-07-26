import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TableView } from '../../models/table-view.model';
import { StatusBadgeComponent } from '../../../../core/components/ui/status-badge/status-badge.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';

import { addIcons } from 'ionicons';
import { restaurantOutline, peopleOutline, locationOutline, timeOutline, addCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-mobile-table-card',
  standalone: true,
  imports: [CommonModule, IonicModule, StatusBadgeComponent, ActionButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-table-card.component.html',
  styleUrls: ['./mobile-table-card.component.scss'],
})
export class MobileTableCardComponent {
  @Input({ required: true }) table!: TableView;
  @Input() pendingOrdersCount = 0;
  @Input() activeTotal = 0;

  @Output() select = new EventEmitter<TableView>();
  @Output() newOrder = new EventEmitter<TableView>();

  constructor() {
    addIcons({ restaurantOutline, peopleOutline, locationOutline, timeOutline, addCircleOutline });
  }

  get StatusColor(): string {
    if (this.table.occupee) return 'var(--table-occupied, #e67e22)';
    return 'var(--table-free, #26ae60)';
  }

  get StatusLabel(): string {
    return this.table.occupee ? 'Occupée' : 'Libre';
  }
}
