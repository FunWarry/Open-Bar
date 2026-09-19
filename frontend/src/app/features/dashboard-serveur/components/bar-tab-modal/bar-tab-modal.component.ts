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
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BarTab } from '../../../../core/models/bar-tab.model';
import { BarTabService } from '../../../../core/services/bar-tab.service';
import { InputFieldComponent } from '../../../../core/components/ui/input-field/input-field.component';

/**
 * Modal form component for creating a new bar tab or modifying an existing running tab.
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

  private readonly fb = inject(FormBuilder);
  private readonly modalCtrl = inject(ModalController);
  private readonly barTabService = inject(BarTabService);
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
    });
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      nom: [this.tab?.nom || '', [Validators.required, Validators.maxLength(100)]],
      clientReference: [this.tab?.clientReference || '', [Validators.maxLength(100)]],
      cautionMontant: [this.tab?.cautionMontant ?? null, [Validators.min(0)]],
      notes: [this.tab?.notes || '', [Validators.maxLength(500)]],
    });
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

    if (this.tab?.id) {
      // Update existing tab
      this.barTabService.updateTab(this.tab.id, {
        nom: val.nom.trim(),
        clientReference: val.clientReference?.trim() || undefined,
        cautionMontant: val.cautionMontant != null && val.cautionMontant !== '' ? Number(val.cautionMontant) : undefined,
        notes: val.notes?.trim() || undefined,
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
