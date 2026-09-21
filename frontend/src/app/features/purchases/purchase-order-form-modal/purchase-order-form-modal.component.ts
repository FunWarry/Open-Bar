import {
  Component,
  Input,
  OnInit,
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
import { PurchaseOrderCreateRequest, PurchaseOrderItemRequest } from '../../../core/models/purchase-order.model';
import { IngredientService } from '../../../core/services/ingredient.service';
import { BarcodeScannerModalComponent, BarcodeScannerResult } from '../../../core/components/ui/barcode-scanner-modal/barcode-scanner-modal.component';

/**
 * Modal dialog for preparing and drafting a supplier purchase order.
 * Features line item calculations, quick ingredient selection, and barcode scanning intake.
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
    TranslocoPipe
  ]
})
export class PurchaseOrderFormModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly ingredientService = inject(IngredientService);

  @Input() suppliers: Supplier[] = [];
  @Input() ingredients: Ingredient[] = [];

  form!: FormGroup;

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
    const defaultSupplierId = this.suppliers.length > 0 ? this.suppliers[0].id : null;

    this.form = this.fb.group({
      supplierId: [defaultSupplierId, [Validators.required]],
      dateLivraisonPrevue: [''],
      referenceFactureFournisseur: [''],
      notes: [''],
      items: this.fb.array([])
    });

    if (this.items.length === 0) {
      this.addItem();
    }
  }

  /**
   * Appends an item line to the order form.
   */
  addItem(ingredientId?: number, unitCost = 0, defaultVat = 20): void {
    const itemGroup = this.fb.group({
      ingredientId: [ingredientId || '', [Validators.required]],
      quantiteCommandee: [1, [Validators.required, Validators.min(0.001)]],
      prixUnitaireHt: [unitCost, [Validators.required, Validators.min(0)]],
      tauxTva: [defaultVat, [Validators.required, Validators.min(0)]]
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
   * Handles ingredient change to automatically preload unit cost.
   */
  onIngredientSelected(index: number, ingredientIdValue: any): void {
    const ingId = Number(ingredientIdValue);
    const selectedIng = this.ingredients.find(i => i.id === ingId);
    if (selectedIng) {
      const line = this.items.at(index);
      const defaultCost = selectedIng.unitCost || selectedIng.prixUnitaire || 0;
      line.patchValue({ prixUnitaireHt: defaultCost });
    }
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
      tauxTva: Number(it.tauxTva)
    }));

    const payload: PurchaseOrderCreateRequest = {
      supplierId: Number(val.supplierId),
      dateLivraisonPrevue: val.dateLivraisonPrevue ? new Date(val.dateLivraisonPrevue).toISOString() : undefined,
      referenceFactureFournisseur: val.referenceFactureFournisseur || undefined,
      notes: val.notes || undefined,
      items: requestItems
    };

    this.modalCtrl.dismiss({ order: payload, confirmed: true });
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
