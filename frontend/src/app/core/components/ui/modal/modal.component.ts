import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ElementRef,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, ModalController } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

/**
 * Standard modal sizing presets for the OpenBar design system.
 * - 'sm': compact alerts, confirm dialogs (~460px)
 * - 'md': standard CRUD forms, quick actions (~640px)
 * - 'lg': rich configuration views, detail dialogs (~860px)
 * - 'xl': multi-step builders, complex recipe & table managers (~1120px)
 * - 'full': immersive full-screen modal (~98vw x 96vh)
 */
export const MODAL_SIZES = ['sm', 'md', 'lg', 'xl', 'full'] as const;
export type ModalSize = (typeof MODAL_SIZES)[number];

/**
 * Universal, theme-adaptive modal container component for OpenBar.
 * Encapsulates standard header typography, icon badges, scrollable content area,
 * optional live summary bar, and footer action slots with consistent sizing presets.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, IonIcon, TranslocoPipe],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent implements OnInit, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly modalCtrl = inject(ModalController, { optional: true });

  /** Size preset of the modal dialog */
  @Input() size: ModalSize = 'md';

  /** Main title displayed in the modal header */
  @Input() title = '';

  /** Ionic icon name displayed next to the title (optional) */
  @Input() icon?: string;

  /** Subtitle or secondary contextual description */
  @Input() subtitle?: string;

  /** Badge text displayed next to the title (e.g., base cocktail name) */
  @Input() badgeText?: string;

  /** Whether to show the top-right close icon button */
  @Input() showCloseButton = true;

  /** Emitted when the modal close button is clicked */
  @Output() readonly dismiss = new EventEmitter<void>();

  constructor() {
    addIcons({ closeOutline });
  }

  /** @inheritdoc */
  ngOnInit(): void {
    this.applySizeToHostModal();
  }

  /** @inheritdoc */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['size']) {
      this.applySizeToHostModal();
    }
  }

  /**
   * Handles close button click, emitting dismiss event and closing parent ion-modal if present.
   */
  onDismiss(): void {
    this.dismiss.emit();
    if (this.modalCtrl) {
      this.modalCtrl.dismiss(null, 'cancel').catch(() => {
        // Ignored if modal was already dismissed or handled by parent component
      });
    }
  }

  /**
   * Automatically synchronizes the selected size CSS class onto the parent <ion-modal> element.
   */
  private applySizeToHostModal(): void {
    const host = this.elementRef.nativeElement as HTMLElement;
    const ionModal = host.closest('ion-modal');
    if (!ionModal) return;

    // Remove any previous size classes
    MODAL_SIZES.forEach((preset) => ionModal.classList.remove(`modal-${preset}`));
    ionModal.classList.add(`modal-${this.size}`, 'app-modal-host');
  }
}
