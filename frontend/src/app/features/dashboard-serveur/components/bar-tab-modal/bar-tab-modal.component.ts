import { Component, Input, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ModalController,
  IonIcon,
  IonSpinner,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  receiptOutline,
  checkmarkOutline,
  personOutline,
  cardOutline,
  shieldCheckmarkOutline,
  chatboxEllipsesOutline,
  createOutline,
  addCircleOutline,
  timeOutline,
  restaurantOutline,
  wineOutline,
  gridOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BarTab } from '../../../../core/models/bar-tab.model';
import { TableBar } from '../../../../core/models/table.model';
import { BarTabService } from '../../../../core/services/bar-tab.service';
import { TableService } from '../../../../core/services/table.service';
import { InputFieldComponent } from '../../../../core/components/ui/input-field/input-field.component';
import {
  SearchableSelectComponent,
  SearchableOption,
} from '../../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Modal dialog for opening a new bar tab or modifying an existing one.
 * Supports mandatory attachment to either the Bar/Counter or a physical table.
 */
@Component({
  selector: 'app-bar-tab-modal',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    IonIcon,
    IonSpinner,
    TranslocoPipe,
    InputFieldComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './bar-tab-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./bar-tab-modal.component.scss'],
})
export class BarTabModalComponent implements OnInit {
  /** Optional bar tab to edit. If null or undefined, the modal operates in creation mode. */
  @Input() tab?: BarTab;

  form!: FormGroup;
  isSubmitting = false;
  tables: TableBar[] = [];
  tableOptions: SearchableOption<number>[] = [];

  private readonly fb = inject(FormBuilder);
  private readonly modalCtrl = inject(ModalController);
  private readonly barTabService = inject(BarTabService);
  private readonly tableService = inject(TableService);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    addIcons({
      closeOutline,
      receiptOutline,
      checkmarkOutline,
      personOutline,
      cardOutline,
      shieldCheckmarkOutline,
      chatboxEllipsesOutline,
      createOutline,
      addCircleOutline,
      timeOutline,
      restaurantOutline,
      wineOutline,
      gridOutline,
    });
  }

  ngOnInit(): void {
    const initialLocation = this.tab?.tableOriginaleId ? 'TABLE' : 'BAR';
    this.form = this.fb.group({
      nom: [this.tab?.nom || '', [Validators.required, Validators.maxLength(100)]],
      clientReference: [this.tab?.clientReference || '', [Validators.maxLength(100)]],
      cautionMontant: [this.tab?.cautionMontant ?? null, [Validators.min(0)]],
      locationType: [initialLocation, [Validators.required]],
      tableOriginaleId: [this.tab?.tableOriginaleId ?? null, initialLocation === 'TABLE' ? [Validators.required] : []],
      notes: [this.tab?.notes || '', [Validators.maxLength(500)]],
    });

    this.tableService.getAll().subscribe({
      next: (tables) => {
        this.tables = tables || [];
        this.tableOptions = this.tables.map(t => ({
          value: t.id,
          label: `Table ${t.numero}`,
          subLabel: t.zone ? `Zone: ${t.zone}` : undefined,
          icon: 'restaurant-outline',
        }));
      },
      error: (err) => {
        console.error('[BarTabModal] Error loading tables:', err);
      },
    });
  }

  /**
   * Switches location type between Bar and physical table.
   */
  setLocationType(type: 'BAR' | 'TABLE'): void {
    this.form.patchValue({ locationType: type });
    const tableControl = this.form.get('tableOriginaleId');
    if (type === 'TABLE') {
      tableControl?.setValidators([Validators.required]);
    } else {
      tableControl?.clearValidators();
      tableControl?.setValue(null);
    }
    tableControl?.updateValueAndValidity();
  }

  /**
   * Closes the modal dialog without saving.
   */
  dismiss(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  /**
   * Submits the form to either create or update the bar tab.
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const val = this.form.value;
    const targetTableId = val.locationType === 'TABLE' ? (Number(val.tableOriginaleId) || null) : null;

    if (this.tab?.id) {
      // Update existing tab
      this.barTabService.updateTab(this.tab.id, {
        nom: val.nom.trim(),
        clientReference: val.clientReference?.trim() || undefined,
        cautionMontant: val.cautionMontant != null && val.cautionMontant !== '' ? Number(val.cautionMontant) : undefined,
        notes: val.notes?.trim() || undefined,
        tableOriginaleId: targetTableId ?? -1,
      }).subscribe({
        next: async (updated) => {
          this.isSubmitting = false;
          await this.showToast(this.transloco.translate('TABS.SUCCESS_UPDATED'), 'success');
          this.modalCtrl.dismiss(updated, 'confirm');
        },
        error: async (err) => {
          this.isSubmitting = false;
          console.error('[BarTabModal] Error updating tab:', err);
          await this.showToast(this.transloco.translate('TABS.ERROR_UPDATE'), 'danger');
        },
      });
    } else {
      // Create new tab
      this.barTabService.createTab({
        nom: val.nom.trim(),
        clientReference: val.clientReference?.trim() || undefined,
        cautionMontant: val.cautionMontant != null && val.cautionMontant !== '' ? Number(val.cautionMontant) : undefined,
        notes: val.notes?.trim() || undefined,
        tableOriginaleId: targetTableId || undefined,
      }).subscribe({
        next: async (created) => {
          this.isSubmitting = false;
          await this.showToast(this.transloco.translate('TABS.SUCCESS_CREATED'), 'success');
          this.modalCtrl.dismiss(created, 'confirm');
        },
        error: async (err) => {
          this.isSubmitting = false;
          console.error('[BarTabModal] Error creating tab:', err);
          await this.showToast(this.transloco.translate('TABS.ERROR_CREATE'), 'danger');
        },
      });
    }
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
    });
    await toast.present();
  }
}
