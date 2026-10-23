import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  closeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  carOutline,
  callOutline
} from 'ionicons/icons';
import { ModalComponent } from '../../../../core/components/ui/modal/modal.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { InputFieldComponent } from '../../../../core/components/ui/input-field/input-field.component';
import { SafetyAlertService } from '../../../../core/services/safety-alert.service';
import {
  SafetyAlertType,
  ANGEL_SHOT_VARIANTS,
  AngelShotVariantMetadata
} from '../../../../core/models/safety-alert.model';

/**
 * Discreet Angel Shot assistance modal for patrons in uncomfortable or unsafe situations.
 * Allows silent one-tap emergency signaling without drawing attention or producing sound.
 */
@Component({
  selector: 'app-angel-shot-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    IonIcon,
    ModalComponent,
    ActionButtonComponent,
    InputFieldComponent
  ],
  templateUrl: './angel-shot-modal.component.html',
  styleUrls: ['./angel-shot-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AngelShotModalComponent {
  @Input({ required: true }) tableNumero!: number;
  @Output() closed = new EventEmitter<void>();

  private readonly safetyAlertService = inject(SafetyAlertService);
  private readonly translocoService = inject(TranslocoService);
  private readonly toastCtrl = inject(ToastController);

  readonly variants: AngelShotVariantMetadata[] = ANGEL_SHOT_VARIANTS;
  readonly isSubmitting = signal<boolean>(false);
  readonly isSent = signal<boolean>(false);
  readonly selectedType = signal<SafetyAlertType | null>(null);

  additionalNote = '';

  constructor() {
    addIcons({
      shieldCheckmarkOutline,
      closeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      carOutline,
      callOutline
    });
  }

  /**
   * Silently triggers the selected Angel Shot alert variant.
   *
   * @param type Variant code selected by the patron
   */
  triggerAlert(type: SafetyAlertType): void {
    if (this.isSubmitting() || !this.tableNumero) {
      return;
    }

    this.isSubmitting.set(true);
    this.selectedType.set(type);

    this.safetyAlertService.triggerSafetyAlert(this.tableNumero, type, this.additionalNote?.trim() || undefined).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSent.set(true);
      },
      error: () => {
        this.isSubmitting.set(false);
        void this.afficherToast('CLIENT.SAFETY.SEND_ERROR', 'danger');
      }
    });
  }

  /**
   * Closes the modal.
   */
  dismiss(): void {
    this.closed.emit();
  }

  private async afficherToast(messageKey: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translocoService.translate(messageKey),
      duration: 3500,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
