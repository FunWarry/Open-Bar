import { Component, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  ModalController,
  AlertController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  receiptOutline,
  walletOutline,
  refreshOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BarTabService } from '../../../../core/services/bar-tab.service';
import { BarTab } from '../../../../core/models/bar-tab.model';
import { SearchBarComponent } from '../../../../core/components/ui/search-bar/search-bar.component';
import { EmptyStateComponent } from '../../../../core/components/ui/empty-state/empty-state.component';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';
import { BarTabCardComponent } from '../bar-tab-card/bar-tab-card.component';
import { BarTabModalComponent } from '../bar-tab-modal/bar-tab-modal.component';
import { BarTabTransferModalComponent } from '../bar-tab-transfer-modal/bar-tab-transfer-modal.component';
import { fastModalEnterAnimation, fastModalLeaveAnimation } from '../../../../core/utils/modal-animation.utils';

/**
 * Server and manager dashboard view component displaying active bar tabs,
 * running totals, search filters, and management actions.
 */
@Component({
  selector: 'app-bar-tabs-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonSpinner,
    TranslocoPipe,
    AppCurrencyPipe,
    SearchBarComponent,
    EmptyStateComponent,
    BarTabCardComponent,
  ],
  templateUrl: './bar-tabs-list.component.html',
  styleUrls: ['./bar-tabs-list.component.scss'],
})
export class BarTabsListComponent {
  readonly barTabService = inject(BarTabService);
  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  /** Emits when waiter wants to add drinks/food to a specific tab */
  @Output() orderForTab = new EventEmitter<BarTab>();

  /** Emits when waiter initiates bill payment for a specific tab */
  @Output() settleTab = new EventEmitter<BarTab>();

  /** Search query signal */
  readonly searchTerm = signal('');

  /** Computed filtered tabs based on search term */
  readonly filteredTabs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const active = this.barTabService.activeTabs();
    if (!term) {
      return active;
    }
    return active.filter(
      (tab) =>
        tab.nom.toLowerCase().includes(term) ||
        (tab.clientReference?.toLowerCase()?.includes(term) ?? false)
    );
  });

  constructor() {
    addIcons({
      addOutline,
      receiptOutline,
      walletOutline,
      refreshOutline,
    });
  }

  onSearchChange(query: string): void {
    this.searchTerm.set(query);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  /**
   * Opens the creation modal for a new bar tab.
   */
  async openCreateModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BarTabModalComponent,
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });
    await modal.present();
  }

  /**
   * Opens the edit modal for an existing bar tab.
   */
  async openEditModal(tab: BarTab): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BarTabModalComponent,
      componentProps: { tab },
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });
    await modal.present();
  }

  /**
   * Opens the transfer modal for this tab.
   */
  async openTransferModal(tab: BarTab): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BarTabTransferModalComponent,
      componentProps: { sourceTab: tab },
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });
    await modal.present();
  }

  /**
   * Handler when server clicks "+ Commande" on a tab card.
   */
  onAddOrder(tab: BarTab): void {
    this.orderForTab.emit(tab);
  }

  /**
   * Handler when server clicks "Encaisser" on a tab card.
   */
  onSettle(tab: BarTab): void {
    this.settleTab.emit(tab);
  }

  /**
   * Confirms and cancels/closes an active tab.
   */
  async onCancelTab(tab: BarTab): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.transloco.translate('TABS.CANCEL_CONFIRM_TITLE'),
      message: this.transloco.translate('TABS.CANCEL_CONFIRM_MSG', { name: tab.nom }),
      buttons: [
        {
          text: this.transloco.translate('TABS.BTN_CANCEL'),
          role: 'cancel',
        },
        {
          text: this.transloco.translate('TABS.CARD_BTN_CANCEL'),
          role: 'destructive',
          handler: () => {
            this.barTabService.cancelTab(tab.id).subscribe({
              next: async () => {
                const toast = await this.toastCtrl.create({
                  message: this.transloco.translate('TABS.SUCCESS_CANCELLED'),
                  duration: 2500,
                  color: 'success',
                });
                await toast.present();
              },
              error: async (err) => {
                console.error('[BarTabsList] Error cancelling tab:', err);
                const toast = await this.toastCtrl.create({
                  message: this.transloco.translate('TABS.ERROR_CANCEL'),
                  duration: 2500,
                  color: 'danger',
                });
                await toast.present();
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  refreshTabs(): void {
    this.barTabService.loadTabs().subscribe();
  }
}
