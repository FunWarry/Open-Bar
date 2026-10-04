import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import {
  callOutline,
  closeOutline,
  peopleOutline,
  personOutline,
  restaurantOutline,
  timeOutline,
} from 'ionicons/icons';
import { Reservation } from '../../../../core/models/reservation.model';
import { ReservationService } from '../../../../core/services/reservation.service';

/**
 * Quick-action modal displaying upcoming reservation details and 1-click seating action.
 */
@Component({
  selector: 'app-reservation-quick-seat-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
  ],
  templateUrl: './reservation-quick-seat-modal.component.html',
  styleUrls: ['./reservation-quick-seat-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationQuickSeatModalComponent {
  private readonly reservationService = inject(ReservationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly modalCtrl = inject(ModalController, { optional: true });

  @Input() isOpen = false;
  @Input() reservation?: Reservation | null = null;
  @Input() tableNumero?: number | null = null;
  @Input() table?: { id?: number; numero?: number } | null = null;

  @Output() modalClose = new EventEmitter<void>();
  @Output() seated = new EventEmitter<Reservation>();

  isSeating = false;

  get displayTableNumero(): number | string {
    return this.tableNumero ?? this.table?.numero ?? this.reservation?.tableNumero ?? '';
  }

  constructor() {
    addIcons({
      closeOutline,
      personOutline,
      callOutline,
      peopleOutline,
      timeOutline,
      restaurantOutline,
    });
  }

  /**
   * Triggers the 1-click seating action.
   */
  seatGuests(): void {
    if (!this.reservation?.id || this.isSeating) {
      return;
    }

    this.isSeating = true;
    this.cdr.markForCheck();

    this.reservationService.seatReservation(this.reservation.id).subscribe({
      next: (updated) => {
        this.isSeating = false;
        this.seated.emit(updated);
        void this.modalCtrl?.dismiss({ seated: true, reservation: updated });
        this.close();
      },
      error: () => {
        this.isSeating = false;
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    this.isOpen = false;
    this.modalClose.emit();
    void this.modalCtrl?.dismiss({ seated: false });
  }
}
