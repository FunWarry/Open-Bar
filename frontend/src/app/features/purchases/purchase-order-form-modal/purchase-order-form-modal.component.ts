import {
  Component,
  Input,
  OnInit,
  OnChanges,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon, ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cartOutline,
  closeOutline,
  addOutline,
  trashOutline,
  barcodeOutline,
  saveOutline,
  calculatorOutline,
  calendarOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Supplier } from '../../../core/models/supplier.model';
import { Ingredient } from '../../../core/models/ingredient.model';
import { PurchaseOrder, PurchaseOrderCreateRequest, PurchaseOrderItemRequest } from '../../../core/models/purchase-order.model';
import { IngredientService } from '../../../core/services/ingredient.service';
import { BarcodeScannerModalComponent, BarcodeScannerResult } from '../../../core/components/ui/barcode-scanner-modal/barcode-scanner-modal.component';
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Modal dialog for preparing and drafting a supplier purchase order.
 * Features line item calculations, quick ingredient selection via searchable dropdown, and barcode scanning intake.
 */
@Component({
  selector: 'app-purchase-order-form-modal',
  templateUrl: './purchase-order-form-modal.component.html',
  styleUrls: ['./purchase-order-form-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonIcon,
    TranslocoPipe,
    SearchableSelectComponent
  ]
})
export class PurchaseOrderFormModalComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly ingredientService = inject(IngredientService);

  @Input() suppliers: Supplier[] = [];
  @Input() ingredients: Ingredient[] = [];
  @Input() order?: PurchaseOrder;

  form!: FormGroup;
  supplierOptions: SearchableOption<number>[] = [];
  ingredientOptions: SearchableOption<number>[] = [];

  get isEditing(): boolean {
    return !!this.order;
  }

  constructor() {
    addIcons({
      cartOutline,
      closeOutline,
      addOutline,
      trashOutline,
      barcodeOutline,
      saveOutline,
      calculatorOutline,
      calendarOutline
    });
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.initOptions();

    const defaultSupplierId = this.order?.supplierId ?? (this.suppliers.length > 0 ? this.suppliers[0].id : null);
    const defaultDate = this.order?.dateLivraisonPrevue?.substring(0, 10) ?? '';
    const defaultRef = this.order?.referenceFactureFournisseur ?? '';
    const defaultNotes = this.order?.notes ?? '';

    this.form = this.fb.group({
      supplierId: [defaultSupplierId, [Validators.required]],
      dateLivraisonPrevue: [defaultDate],
      referenceFactureFournisseur: [defaultRef],
      notes: [defaultNotes],
      items: this.fb.array([])
    });

    const orderItems = this.order?.items;
    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        this.addItem(
          item.ingredientId,
          item.prixUnitaireHt,
          item.tauxTva ?? 20,
          item.quantiteCommandee,
          item.purchaseUnit ?? '',
          item.packagingCapacity ?? 1
        );
      }
    } else if (this.items.length === 0) {
      this.addItem();
    }
  }

  ngOnChanges(): void {
    this.initOptions();
  }

  /**
   * Transforms raw suppliers and ingredients into SearchableOption models for the dropdowns.
   */
  private initOptions(): void {
    this.supplierOptions = (this.suppliers || []).map((s) => ({
      value: s.id,
      label: s.nom,
      subLabel: s.email || s.telephone || undefined
    }));

    this.ingredientOptions = (this.ingredients || []).map((ing) => ({
      value: ing.id,
      label: ing.nom,
      subLabel: `${ing.uniteMesure}${ing.prixUnitaire != null ? ' · ' + ing.prixUnitaire + ' €' : ''}`
    }));
  }

  /**
   * Appends an item line to the order form.
   */
  addItem(
    ingredientId?: number,
    unitCost = 0,
    defaultVat = 20,
    qty = 1,
    purchaseUnit = '',
    packagingCapacity = 1
  ): void {
    const itemGroup = this.fb.group({
      ingredientId: [ingredientId ?? null, [Validators.required]],
      quantiteCommandee: [qty, [Validators.required, Validators.min(0.001)]],
      prixUnitaireHt: [unitCost, [Validators.required, Validators.min(0)]],
      tauxTva: [defaultVat, [Validators.required, Validators.min(0)]],
      purchaseUnit: [purchaseUnit],
      packagingCapacity: [packagingCapacity, [Validators.min(0.001)]]
    });

    this.items.push(itemGroup);
  }

  /**
   * Removes an item line from the order form.
   */
  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  /**
   * Handles ingredient change to automatically preload unit cost and packaging details.
   */
  onIngredientSelected(index: number, optionOrId: any): void {
    const ingId = typeof optionOrId === 'object' && optionOrId !== null
      ? Number(optionOrId.value)
      : Number(optionOrId);

    if (!ingId) {
      return;
    }

    const selectedIng = this.ingredients.find(i => i.id === ingId);
    if (selectedIng) {
      const line = this.items.at(index);
      const defaultCost = selectedIng.packagingPriceHt || selectedIng.unitCost || selectedIng.prixUnitaire || 0;
      const defaultUnit = selectedIng.purchaseUnit || selectedIng.uniteMesure || '';
      const defaultCapacity = selectedIng.packagingCapacity || 1;
      line.patchValue({
        prixUnitaireHt: defaultCost,
        purchaseUnit: defaultUnit,
        packagingCapacity: defaultCapacity
      });
    }
  }

  /**
   * Computes the calculated equivalent inventory stock quantity for an order line item.
   */
  getEquivalentStock(ctrl: any): { qty: number; unit: string } {
    const ingId = Number(ctrl.get('ingredientId')?.value);
    const qty = Number(ctrl.get('quantiteCommandee')?.value) || 0;
    const capacity = Number(ctrl.get('packagingCapacity')?.value) || 1;
    const ing = this.ingredients.find(i => i.id === ingId);
    const unit = ing?.uniteMesure || '';
    return {
      qty: Math.round(qty * capacity * 100) / 100,
      unit
    };
  }

  /**
   * Opens the barcode scanner modal to quickly identify and add an ingredient.
   */
  async openBarcodeScanner(): Promise<void> {
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
      this.handleBarcodeScanned(data.barcode);
    }
  }

  /**
   * Finds ingredient by barcode and adds to order or increments quantity.
   */
  private handleBarcodeScanned(code: string): void {
    this.ingredientService.getByBarcode(code).subscribe({
      next: (ingredient) => {
        // Check if ingredient is already in items
        const existingIndex = this.items.controls.findIndex(
          ctrl => Number(ctrl.get('ingredientId')?.value) === ingredient.id
        );

        if (existingIndex >= 0) {
          const ctrl = this.items.at(existingIndex);
          const currentQty = Number(ctrl.get('quantiteCommandee')?.value || 0);
          ctrl.patchValue({ quantiteCommandee: currentQty + 1 });
          this.showToast(
            this.transloco.translate('PURCHASES.BARCODE_QTY_INCREMENTED', { name: ingredient.nom }),
            'success'
          );
        } else {
          // If first row is empty, replace it
          if (this.items.length === 1 && !this.items.at(0).get('ingredientId')?.value) {
            this.items.at(0).patchValue({
              ingredientId: ingredient.id,
              quantiteCommandee: 1,
              prixUnitaireHt: ingredient.unitCost || ingredient.prixUnitaire || 0
            });
          } else {
            this.addItem(
              ingredient.id,
              ingredient.unitCost || ingredient.prixUnitaire || 0,
              20
            );
          }
          this.showToast(
            this.transloco.translate('PURCHASES.BARCODE_ITEM_ADDED', { name: ingredient.nom }),
            'success'
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

  /**
   * Calculates total HT of the entire order.
   */
  get totalHt(): number {
    return this.items.controls.reduce((sum, ctrl) => {
      const qty = Number(ctrl.get('quantiteCommandee')?.value) || 0;
      const pu = Number(ctrl.get('prixUnitaireHt')?.value) || 0;
      return sum + (qty * pu);
    }, 0);
  }

  /**
   * Calculates total TVA of the order.
   */
  get totalTva(): number {
    return this.items.controls.reduce((sum, ctrl) => {
      const qty = Number(ctrl.get('quantiteCommandee')?.value) || 0;
      const pu = Number(ctrl.get('prixUnitaireHt')?.value) || 0;
      const tva = Number(ctrl.get('tauxTva')?.value) || 0;
      return sum + (qty * pu * (tva / 100));
    }, 0);
  }

  get totalTtc(): number {
    return this.totalHt + this.totalTva;
  }

  onSubmit(): void {
    if (this.form.invalid || this.items.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const requestItems: PurchaseOrderItemRequest[] = val.items.map((it: any) => ({
      ingredientId: Number(it.ingredientId),
      quantiteCommandee: Number(it.quantiteCommandee),
      prixUnitaireHt: Number(it.prixUnitaireHt),
      tauxTva: Number(it.tauxTva),
      purchaseUnit: it.purchaseUnit || undefined,
      packagingCapacity: it.packagingCapacity ? Number(it.packagingCapacity) : undefined
    }));

    const payload: PurchaseOrderCreateRequest = {
      supplierId: Number(val.supplierId),
      dateLivraisonPrevue: val.dateLivraisonPrevue ? new Date(val.dateLivraisonPrevue).toISOString() : undefined,
      referenceFactureFournisseur: val.referenceFactureFournisseur || undefined,
      notes: val.notes || undefined,
      items: requestItems
    };

    this.modalCtrl.dismiss({ order: payload, confirmed: true, orderId: this.order?.id });
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
