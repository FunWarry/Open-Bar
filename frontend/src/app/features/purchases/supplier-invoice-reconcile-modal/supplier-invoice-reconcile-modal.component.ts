import {
  Component,
  Input,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, ModalController, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkDoneOutline,
  closeOutline,
  trendingUpOutline,
  trendingDownOutline,
  alertCircleOutline,
  documentTextOutline,
  syncOutline,
  downloadOutline,
  cartOutline,
  shieldCheckmarkOutline,
  swapHorizontalOutline,
  warningOutline,
  cubeOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  SupplierInvoice,
  SupplierInvoiceReconciliation,
  SupplierInvoiceItemReconcileAdjustment,
  ReconciliationLineDiff
} from '../../../core/models/supplier-invoice.model';
import { SupplierInvoiceService } from '../../../core/services/supplier-invoice.service';
import { IngredientService } from '../../../core/services/ingredient.service';
import { Ingredient } from '../../../core/models/ingredient.model';
import { ModalComponent } from '../../../core/components/ui/modal/modal.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';

/**
 * Modal dialog for inspecting and executing supplier invoice reconciliation,
 * discrepancy analysis against Purchase Orders, and 1-click stock intake with PAMP recalculation.
 */
@Component({
  selector: 'app-supplier-invoice-reconcile-modal',
  templateUrl: './supplier-invoice-reconcile-modal.component.html',
  styleUrls: ['./supplier-invoice-reconcile-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    TranslocoPipe,
    ModalComponent,
    ActionButtonComponent,
    SearchableSelectComponent,
    InputFieldComponent
  ]
})
export class SupplierInvoiceReconcileModalComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  private readonly invoiceService = inject(SupplierInvoiceService);
  private readonly ingredientService = inject(IngredientService);

  @Input() invoice!: SupplierInvoice;

  reconciliation = signal<SupplierInvoiceReconciliation | null>(null);
  ingredients = signal<Ingredient[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  isApplying = signal(false);

  selectedPoId = signal<number | null>(null);
  notes = signal<string>('');
  adjustments = signal<Map<number, SupplierInvoiceItemReconcileAdjustment>>(new Map());

  poOptions = computed<SearchableOption<number>[]>(() => {
    const rec = this.reconciliation();
    if (!rec?.candidatePurchaseOrders) return [];
    return rec.candidatePurchaseOrders.map((po) => ({
      value: po.id,
      label: `${po.reference} (${po.statut})`,
      subLabel: `${po.dateCommande?.split('T')[0] || ''} — ${po.totalHt.toFixed(2)} € HT`,
      badge: po.statut,
      badgeType: po.statut === 'ORDERED' ? 'warning' : 'neutral'
    }));
  });

  ingredientOptions = computed<SearchableOption<number>[]>(() => {
    return this.ingredients().map((ing) => ({
      value: ing.id,
      label: ing.nom,
      subLabel: `${ing.quantiteStock} ${ing.uniteMesure} en stock — PAMP: ${(ing.prixUnitaire ?? 0).toFixed(2)} €`,
      badge: ing.uniteMesure
    }));
  });

  constructor() {
    addIcons({
      checkmarkDoneOutline,
      closeOutline,
      trendingUpOutline,
      trendingDownOutline,
      alertCircleOutline,
      documentTextOutline,
      syncOutline,
      downloadOutline,
      cartOutline,
      shieldCheckmarkOutline,
      swapHorizontalOutline,
      warningOutline,
      cubeOutline
    });
  }

  ngOnInit(): void {
    this.notes.set(this.invoice.reconciliationNotes || '');
    this.loadCatalogIngredients();
    this.loadReconciliation();
  }

  private loadCatalogIngredients(): void {
    this.ingredientService.getAll().subscribe({
      next: (list) => this.ingredients.set(list),
      error: (err: unknown) => console.error('Failed to load ingredients', err)
    });
  }

  loadReconciliation(poId?: number): void {
    this.isLoading.set(true);
    this.invoiceService.getReconciliationPreview(this.invoice.id, poId).subscribe({
      next: (rec) => {
        this.reconciliation.set(rec);
        this.selectedPoId.set(rec.selectedPurchaseOrderId || null);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        const error = err as { error?: { message?: string } };
        void this.showToast(error?.error?.message || 'Failed to load reconciliation diff', 'danger');
      }
    });
  }

  onPurchaseOrderSelected(poId: number | null): void {
    if (poId) {
      this.selectedPoId.set(poId);
      this.loadReconciliation(poId);
    }
  }

  onIngredientSelected(line: ReconciliationLineDiff, ingredientId: number | null): void {
    if (!line.invoiceItemId || !ingredientId) return;

    const currentMap = new Map(this.adjustments());
    const existing = currentMap.get(line.invoiceItemId) || {
      itemId: line.invoiceItemId,
      effectiveReceivedQuantity: line.quantityInvoiced,
      effectiveUnitPriceHt: line.unitPriceInvoiced
    };

    existing.matchedIngredientId = ingredientId;
    currentMap.set(line.invoiceItemId, existing);
    this.adjustments.set(currentMap);
  }

  onQuantityChanged(line: ReconciliationLineDiff, event: Event): void {
    if (!line.invoiceItemId) return;
    const input = event.target as HTMLInputElement;
    const val = Number.parseFloat(input.value);
    if (Number.isNaN(val) || val < 0) return;

    const currentMap = new Map(this.adjustments());
    const existing = currentMap.get(line.invoiceItemId) || {
      itemId: line.invoiceItemId,
      matchedIngredientId: line.matchedIngredientId,
      effectiveUnitPriceHt: line.unitPriceInvoiced
    };
    existing.effectiveReceivedQuantity = val;
    currentMap.set(line.invoiceItemId, existing);
    this.adjustments.set(currentMap);
  }

  saveReconciliation(): void {
    this.isSaving.set(true);
    const adjustmentsList = Array.from(this.adjustments().values());
    this.invoiceService.reconcileInvoice(this.invoice.id, {
      purchaseOrderId: this.selectedPoId() || undefined,
      reconciliationNotes: this.notes(),
      itemAdjustments: adjustmentsList
    }).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.invoice = updated;
        void this.showToast(this.transloco.translate('purchases.invoices.reconciliationSaved'), 'success');
        this.loadReconciliation(this.selectedPoId() || undefined);
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const error = err as { error?: { message?: string } };
        void this.showToast(error?.error?.message || 'Failed to save reconciliation', 'danger');
      }
    });
  }

  async confirmAndApply(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.transloco.translate('purchases.invoices.applyModal.title'),
      message: this.transloco.translate('purchases.invoices.applyModal.message', {
        invoiceNumber: this.invoice.invoiceNumber,
        totalHt: this.invoice.totalHt.toFixed(2)
      }),
      buttons: [
        {
          text: this.transloco.translate('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.transloco.translate('purchases.invoices.applyModal.confirmBtn'),
          handler: () => {
            this.executeApply();
          }
        }
      ]
    });
    await alert.present();
  }

  private executeApply(): void {
    this.isApplying.set(true);
    this.invoiceService.applyInvoice(this.invoice.id).subscribe({
      next: (applied) => {
        this.isApplying.set(false);
        void this.showToast(this.transloco.translate('purchases.invoices.applySuccess'), 'success');
        void this.modalCtrl.dismiss(applied, 'applied');
      },
      error: (err: unknown) => {
        this.isApplying.set(false);
        const error = err as { error?: { message?: string } };
        void this.showToast(error?.error?.message || 'Failed to apply invoice into inventory', 'danger');
      }
    });
  }

  downloadXml(): void {
    this.invoiceService.downloadXml(this.invoice.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factur-x-${this.invoice.invoiceNumber}.xml`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        const error = err as { error?: { message?: string } };
        void this.showToast(error?.error?.message || 'XML not available', 'warning');
      }
    });
  }

  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
