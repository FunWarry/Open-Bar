import {
  Component,
  Input,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon, ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkDoneOutline,
  closeOutline,
  barcodeOutline,
  trendingUpOutline,
  trendingDownOutline,
  alertCircleOutline,
  documentTextOutline,
  calendarOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  PriceVariation,
  PurchaseOrder,
  PurchaseOrderReceptionItemRequest,
  PurchaseOrderReceptionRequest
} from '../../../core/models/purchase-order.model';
import { PurchaseOrderService } from '../../../core/services/purchase-order.service';
import { IngredientService } from '../../../core/services/ingredient.service';
import { BarcodeScannerModalComponent, BarcodeScannerResult } from '../../../core/components/ui/barcode-scanner-modal/barcode-scanner-modal.component';

/**
 * Modal dialog for receiving a delivery note (Bon de Livraison) against a purchase order.
 * Updates stock levels, registers lot / expiry dates, and calculates new weighted average cost (PAMP).
 */
@Component({
  selector: 'app-purchase-order-reception-modal',
  templateUrl: './purchase-order-reception-modal.component.html',
  styleUrls: ['./purchase-order-reception-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonIcon,
    TranslocoPipe
  ]
})
export class PurchaseOrderReceptionModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly ingredientService = inject(IngredientService);

  @Input() order!: PurchaseOrder;

  form!: FormGroup;
  isSubmitting = signal(false);
  priceVariations = signal<PriceVariation[] | null>(null);

  constructor() {
    addIcons({
      checkmarkDoneOutline,
      closeOutline,
      barcodeOutline,
      trendingUpOutline,
      trendingDownOutline,
      alertCircleOutline,
      documentTextOutline,
      calendarOutline
    });
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      numeroBonLivraison: ['', [Validators.required]],
      notes: [''],
      items: this.fb.array([])
    });

    if (this.order?.items) {
      this.order.items.forEach(it => {
        const remaining = Math.max(0, (it.quantiteCommandee || 0) - (it.quantiteRecue || 0));
        const itemGroup = this.fb.group({
          purchaseOrderItemId: [it.id],
          ingredientId: [it.ingredientId],
          ingredientNom: [it.ingredientNom],
          ingredientUnite: [it.ingredientUnite],
          purchaseUnit: [it.purchaseUnit || it.ingredientUnite],
          packagingCapacity: [it.packagingCapacity || 1],
          quantiteCommandee: [it.quantiteCommandee],
          quantiteRecue: [it.quantiteRecue || 0],
          quantiteLivree: [remaining, [Validators.required, Validators.min(0)]],
          prixUnitaireHt: [it.prixUnitaireHt, [Validators.required, Validators.min(0)]],
          numeroLot: [''],
          datePeremption: ['']
        });
        this.items.push(itemGroup);
      });
    }
  }

  /**
   * Computes equivalent quantity credited to inventory stock units.
   */
  getEquivalentStockCredit(item: any): number {
    const qty = Number(item.get('quantiteLivree')?.value) || 0;
    const capacity = Number(item.get('packagingCapacity')?.value) || 1;
    return Math.round(qty * capacity * 100) / 100;
  }

  /**
   * Opens barcode scanner to point and increment delivered quantity on matching line.
   */
  async openBarcodeScanner(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BarcodeScannerModalComponent,
      componentProps: {
        title: 'PURCHASES.SCAN_RECEPTION_TITLE',
        subtitle: 'PURCHASES.SCAN_RECEPTION_SUBTITLE'
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<BarcodeScannerResult>();

    if (data && !data.cancelled && data.barcode) {
      this.handleBarcodeScanned(data.barcode);
    }
  }

  private handleBarcodeScanned(code: string): void {
    this.ingredientService.getByBarcode(code).subscribe({
      next: (ingredient) => {
        const matchingIndex = this.items.controls.findIndex(
          ctrl => Number(ctrl.get('ingredientId')?.value) === ingredient.id
        );

        if (matchingIndex >= 0) {
          const ctrl = this.items.at(matchingIndex);
          const currentLivree = Number(ctrl.get('quantiteLivree')?.value || 0);
          ctrl.patchValue({ quantiteLivree: currentLivree + 1 });
          this.showToast(
            this.transloco.translate('PURCHASES.RECEPTION_ITEM_POINTED', { name: ingredient.nom }),
            'success'
          );
        } else {
          this.showToast(
            this.transloco.translate('PURCHASES.BARCODE_NOT_IN_ORDER', { name: ingredient.nom }),
            'warning'
          );
        }
      },
      error: () => {
        this.showToast(
          this.transloco.translate('PURCHASES.BARCODE_NOT_FOUND', { code }),
          'warning'
        );
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const receptionItems: PurchaseOrderReceptionItemRequest[] = val.items
      .filter((it: any) => Number(it.quantiteLivree) > 0)
      .map((it: any) => ({
        purchaseOrderItemId: Number(it.purchaseOrderItemId),
        quantiteLivree: Number(it.quantiteLivree),
        prixUnitaireHt: Number(it.prixUnitaireHt),
        numeroLot: it.numeroLot ? it.numeroLot.trim() : undefined,
        datePeremption: it.datePeremption ? new Date(it.datePeremption).toISOString() : undefined
      }));

    if (receptionItems.length === 0) {
      this.showToast(this.transloco.translate('PURCHASES.ERROR_NO_ITEMS_RECEIVED'), 'warning');
      return;
    }

    const payload: PurchaseOrderReceptionRequest = {
      numeroBonLivraison: val.numeroBonLivraison.trim(),
      notes: val.notes ? val.notes.trim() : undefined,
      receptions: receptionItems
    };

    this.isSubmitting.set(true);
    this.purchaseOrderService.receive(this.order.id, payload).subscribe({
      next: (variations) => {
        this.isSubmitting.set(false);
        this.priceVariations.set(variations);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message || this.transloco.translate('PURCHASES.RECEPTION_ERROR');
        this.showToast(msg, 'danger');
      }
    });
  }

  closeWithSuccess(): void {
    this.modalCtrl.dismiss({ confirmed: true, variations: this.priceVariations() });
  }

  onCancel(): void {
    this.modalCtrl.dismiss({ confirmed: false });
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
