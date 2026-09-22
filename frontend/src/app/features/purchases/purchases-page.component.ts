import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonContent, ModalController, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cartOutline,
  businessOutline,
  analyticsOutline,
  addOutline,
  barcodeOutline,
  sendOutline,
  checkmarkDoneOutline,
  documentTextOutline,
  closeCircleOutline,
  createOutline,
  trashOutline,
  syncOutline,
  downloadOutline,
  searchOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Supplier, SupplierCreateRequest } from '../../core/models/supplier.model';
import {
  PurchaseOrder,
  PurchaseOrderCreateRequest,
  PurchaseOrderStatus
} from '../../core/models/purchase-order.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { SupplierService } from '../../core/services/supplier.service';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { SupplierFormModalComponent } from './supplier-form-modal/supplier-form-modal.component';
import { PurchaseOrderFormModalComponent } from './purchase-order-form-modal/purchase-order-form-modal.component';
import { PurchaseOrderReceptionModalComponent } from './purchase-order-reception-modal/purchase-order-reception-modal.component';
import { PurchaseOrderDetailModalComponent } from './purchase-order-detail-modal/purchase-order-detail-modal.component';
import { BarcodeScannerModalComponent, BarcodeScannerResult } from '../../core/components/ui/barcode-scanner-modal/barcode-scanner-modal.component';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { SearchBarComponent } from '../../core/components/ui/search-bar/search-bar.component';

export type PurchasesTab = 'orders' | 'suppliers' | 'pamp';

/**
 * Main management view for suppliers, purchase orders, goods intake, and PAMP recalculation.
 */
@Component({
  selector: 'app-purchases-page',
  templateUrl: './purchases-page.component.html',
  styleUrls: ['./purchases-page.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    TranslocoPipe,
    EmptyStateComponent,
    SearchBarComponent
  ]
})
export class PurchasesPageComponent implements OnInit {
  private readonly supplierService = inject(SupplierService);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly ingredientService = inject(IngredientService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  activeTab = signal<PurchasesTab>('orders');
  statusFilter = signal<PurchaseOrderStatus | 'ALL'>('ALL');
  searchQuery = signal('');

  suppliers = signal<Supplier[]>([]);
  purchaseOrders = signal<PurchaseOrder[]>([]);
  ingredients = signal<Ingredient[]>([]);
  isLoading = signal(false);

  constructor() {
    addIcons({
      cartOutline,
      businessOutline,
      analyticsOutline,
      addOutline,
      barcodeOutline,
      sendOutline,
      checkmarkDoneOutline,
      documentTextOutline,
      closeCircleOutline,
      createOutline,
      trashOutline,
      syncOutline,
      downloadOutline,
      searchOutline
    });
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading.set(true);
    this.supplierService.getAll().subscribe({
      next: (sups) => this.suppliers.set(sups),
      error: () => {}
    });

    this.purchaseOrderService.getAll().subscribe({
      next: (orders) => {
        this.purchaseOrders.set(orders);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.ingredientService.getAll().subscribe({
      next: (ings) => this.ingredients.set(ings),
      error: () => {}
    });
  }

  /**
   * Filtered purchase orders based on status filter.
   */
  filteredOrders = computed(() => {
    const filter = this.statusFilter();
    const query = this.searchQuery().toLowerCase().trim();
    let orders = this.purchaseOrders();
    if (filter !== 'ALL') {
      orders = orders.filter(o => o.status === filter);
    }
    if (query) {
      orders = orders.filter(o =>
        o.id.toString().includes(query) ||
        Boolean(o.supplierNom?.toLowerCase().includes(query)) ||
        Boolean(o.notes?.toLowerCase().includes(query))
      );
    }
    return orders;
  });

  /**
   * Filtered suppliers based on text query.
   */
  filteredSuppliers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sups = this.suppliers();
    if (!q) return sups;
    return sups.filter(s =>
      s.nom.toLowerCase().includes(q) ||
      s.contactNom?.toLowerCase().includes(q) ||
      s.ville?.toLowerCase().includes(q) ||
      s.siret?.includes(q)
    );
  });

  /**
   * Filtered ingredients for PAMP view based on text query.
   */
  filteredIngredients = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const ings = this.ingredients();
    if (!q) return ings;
    return ings.filter(i =>
      i.nom.toLowerCase().includes(q) ||
      i.codeBarre?.toLowerCase().includes(q) ||
      i.defaultSupplierNom?.toLowerCase().includes(q)
    );
  });

  selectTab(tab: PurchasesTab): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
  }

  // --- Purchase Order Actions ---

  async openCreateOrderModal(): Promise<void> {
    const activeSuppliers = this.suppliers().filter(s => s.actif);
    if (activeSuppliers.length === 0) {
      this.showToast(this.transloco.translate('PURCHASES.ERROR_NO_ACTIVE_SUPPLIERS'), 'warning');
      return;
    }

    const modal = await this.modalCtrl.create({
      component: PurchaseOrderFormModalComponent,
      componentProps: {
        suppliers: activeSuppliers,
        ingredients: this.ingredients()
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<{ order: PurchaseOrderCreateRequest; confirmed: boolean }>();

    if (data?.confirmed && data.order) {
      this.purchaseOrderService.create(data.order).subscribe({
        next: () => {
          this.showToast(this.transloco.translate('PURCHASES.ORDER_CREATED_SUCCESS'), 'success');
          this.loadAllData();
        },
        error: () => this.showToast(this.transloco.translate('PURCHASES.ORDER_CREATED_ERROR'), 'danger')
      });
    }
  }

  sendOrder(order: PurchaseOrder): void {
    this.purchaseOrderService.send(order.id).subscribe({
      next: () => {
        this.showToast(this.transloco.translate('PURCHASES.ORDER_SENT_SUCCESS'), 'success');
        this.loadAllData();
      },
      error: () => this.showToast(this.transloco.translate('PURCHASES.ORDER_SENT_ERROR'), 'danger')
    });
  }

  async openOrderDetailModal(order: PurchaseOrder): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PurchaseOrderDetailModalComponent,
      componentProps: { order }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<{ action: string; order?: PurchaseOrder }>();
    if (!data?.action) return;

    switch (data.action) {
      case 'send':
        this.sendOrder(data.order || order);
        break;
      case 'cancel':
        this.cancelOrder(data.order || order);
        break;
      case 'receive':
        this.openReceptionModal(data.order || order);
        break;
      case 'pdf':
        this.downloadPdf(data.order || order);
        break;
    }
  }

  onOrderCardKeyDown(event: KeyboardEvent, order: PurchaseOrder): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openOrderDetailModal(order);
    }
  }

  async openReceptionModal(order: PurchaseOrder): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PurchaseOrderReceptionModalComponent,
      componentProps: { order }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<{ confirmed: boolean }>();
    if (data?.confirmed) {
      this.loadAllData();
    }
  }

  cancelOrder(order: PurchaseOrder): void {
    this.purchaseOrderService.cancel(order.id).subscribe({
      next: () => {
        this.showToast(this.transloco.translate('PURCHASES.ORDER_CANCELLED_SUCCESS'), 'success');
        this.loadAllData();
      },
      error: () => this.showToast(this.transloco.translate('PURCHASES.ORDER_CANCELLED_ERROR'), 'danger')
    });
  }

  downloadPdf(order: PurchaseOrder): void {
    this.purchaseOrderService.downloadPdf(order.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bon_Commande_${order.numeroCommande}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.showToast(this.transloco.translate('PURCHASES.PDF_DOWNLOAD_ERROR'), 'danger')
    });
  }

  // --- Supplier Actions ---

  async openCreateSupplierModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: SupplierFormModalComponent
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<{ supplier: SupplierCreateRequest; confirmed: boolean }>();

    if (data?.confirmed && data.supplier) {
      this.supplierService.create(data.supplier).subscribe({
        next: () => {
          this.showToast(this.transloco.translate('SUPPLIERS.CREATE_SUCCESS'), 'success');
          this.loadAllData();
        },
        error: () => this.showToast(this.transloco.translate('SUPPLIERS.CREATE_ERROR'), 'danger')
      });
    }
  }

  async openEditSupplierModal(supplier: Supplier): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: SupplierFormModalComponent,
      componentProps: { supplier }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<{ supplier: SupplierCreateRequest; confirmed: boolean }>();

    if (data?.confirmed && data.supplier) {
      this.supplierService.update(supplier.id, data.supplier).subscribe({
        next: () => {
          this.showToast(this.transloco.translate('SUPPLIERS.UPDATE_SUCCESS'), 'success');
          this.loadAllData();
        },
        error: () => this.showToast(this.transloco.translate('SUPPLIERS.UPDATE_ERROR'), 'danger')
      });
    }
  }

  async confirmDeleteSupplier(supplier: Supplier): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.transloco.translate('SUPPLIERS.CONFIRM_DELETE_TITLE'),
      message: this.transloco.translate('SUPPLIERS.CONFIRM_DELETE_MSG', { name: supplier.nom }),
      buttons: [
        { text: this.transloco.translate('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.transloco.translate('COMMON.DELETE'),
          role: 'destructive',
          handler: () => {
            this.supplierService.delete(supplier.id).subscribe({
              next: () => {
                this.showToast(this.transloco.translate('SUPPLIERS.DELETE_SUCCESS'), 'success');
                this.loadAllData();
              },
              error: () => this.showToast(this.transloco.translate('SUPPLIERS.DELETE_ERROR'), 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  migrateLegacySuppliers(): void {
    this.supplierService.migrateLegacy().subscribe({
      next: (count) => {
        this.showToast(this.transloco.translate('SUPPLIERS.MIGRATE_SUCCESS', { count }), 'success');
        this.loadAllData();
      },
      error: () => this.showToast(this.transloco.translate('SUPPLIERS.MIGRATE_ERROR'), 'danger')
    });
  }

  // --- Barcode quick lookup ---

  async openGlobalBarcodeScanner(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BarcodeScannerModalComponent,
      componentProps: {
        title: 'PURCHASES.SCAN_BARCODE_TITLE',
        subtitle: 'PURCHASES.SCAN_BARCODE_SUBTITLE'
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<BarcodeScannerResult>();

    if (data && !data.cancelled && data.barcode) {
      this.searchQuery.set(data.barcode);
      this.activeTab.set('pamp');
    }
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
