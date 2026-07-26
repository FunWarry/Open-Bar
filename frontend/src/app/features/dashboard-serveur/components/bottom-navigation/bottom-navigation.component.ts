import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { addIcons } from 'ionicons';
import { restaurantOutline, cartOutline, listOutline } from 'ionicons/icons';

export type ServeurTab = 'tables' | 'commande' | 'suivi';

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bottom-navigation.component.html',
  styleUrls: ['./bottom-navigation.component.scss'],
})
export class BottomNavigationComponent {
  @Input() activeTab: ServeurTab = 'tables';
  @Input() cartBadgeCount = 0;
  @Input() pendingOrdersCount = 0;

  @Output() tabSelect = new EventEmitter<ServeurTab>();

  constructor() {
    addIcons({ restaurantOutline, cartOutline, listOutline });
  }

  onSelect(tab: ServeurTab) {
    this.tabSelect.emit(tab);
  }
}
