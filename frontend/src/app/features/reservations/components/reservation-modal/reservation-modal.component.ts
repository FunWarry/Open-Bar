import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  calendarOutline,
  checkmarkCircleOutline,
  closeOutline,
  mailOutline,
  peopleOutline,
  personOutline,
  callOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';
import {
  Reservation,
  ReservationAvailability,
  ReservationCreateRequest,
  ReservationStatut,
  ReservationUpdateRequest,
} from '../../../../core/models/reservation.model';
import { TableBar } from '../../../../core/models/table.model';
import { ReservationService } from '../../../../core/services/reservation.service';

/**
 * Modal dialog component for creating or editing a table reservation.
 * Includes party size validation, live table availability checks, and customer autocomplete.
 */
@Component({
  selector: 'app-reservation-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
  templateUrl: './reservation-modal.component.html',
  styleUrls: ['./reservation-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly reservationService = inject(ReservationService);

  @Input() isOpen = false;
  @Input() reservationToEdit?: Reservation | null = null;
  @Input() initialDate?: string;
  @Input() initialTime?: string;
  @Input() initialTableId?: number | null;
  @Input() tables: TableBar[] = [];

  @Output() modalClose = new EventEmitter<void>();
  @Output() reservationSaved = new EventEmitter<Reservation>();

  reservationForm!: FormGroup;
  isSaving = false;
  availabilityCheck: ReservationAvailability | null = null;
  isCheckingAvailability = false;

  customerSuggestions: Reservation[] = [];
  showSuggestions = false;

  readonly durationOptions = [
    { label: '45 min', value: 45 },
    { label: '1h00', value: 60 },
    { label: '1h30 (défaut)', value: 90 },
    { label: '2h00', value: 120 },
    { label: '2h30', value: 150 },
    { label: '3h00', value: 180 },
  ];

  readonly statusOptions: ReservationStatut[] = [
    'CONFIRMED',
    'PENDING',
    'SEATED',
    'CANCELLED',
    'NO_SHOW',
  ];

  constructor() {
    addIcons({
      closeOutline,
      personOutline,
      callOutline,
      mailOutline,
      calendarOutline,
      timeOutline,
      peopleOutline,
      checkmarkCircleOutline,
      warningOutline,
      alertCircleOutline,
    });
  }

  ngOnInit(): void {
    this.initForm();
  }

  /**
   * Initializes the reactive form with default or edited reservation values.
   */
  initForm(): void {
    const today = new Date().toISOString().substring(0, 10);
    const defaultTime = this.initialTime || '19:30';

    this.reservationForm = this.fb.group({
      nomClient: [
        this.reservationToEdit?.nomClient || '',
        [Validators.required, Validators.maxLength(100)],
      ],
      telephone: [this.reservationToEdit?.telephone || '', [Validators.maxLength(50)]],
      email: [this.reservationToEdit?.email || '', [Validators.email, Validators.maxLength(150)]],
      dateReservation: [
        this.reservationToEdit?.dateReservation || this.initialDate || today,
        [Validators.required],
      ],
      heureReservation: [
        this.reservationToEdit ? this.formatTimeForInput(this.reservationToEdit.heureReservation) : defaultTime,
        [Validators.required],
      ],
      dureeMinutes: [this.reservationToEdit?.dureeMinutes || 90, [Validators.required, Validators.min(15)]],
      nombrePersonnes: [this.reservationToEdit?.nombrePersonnes || 2, [Validators.required, Validators.min(1)]],
      tableId: [this.reservationToEdit?.tableId ?? this.initialTableId ?? null],
      notes: [this.reservationToEdit?.notes || ''],
      statut: [this.reservationToEdit?.statut || 'CONFIRMED', [Validators.required]],
    });

    if (this.reservationForm.get('tableId')?.value) {
      this.checkTableAvailability();
    }
  }

  /**
   * Evaluates table availability for the selected slot and party size.
   */
  checkTableAvailability(): void {
    const tableId = this.reservationForm.get('tableId')?.value;
    const date = this.reservationForm.get('dateReservation')?.value;
    const heure = this.reservationForm.get('heureReservation')?.value;
    const dureeMinutes = this.reservationForm.get('dureeMinutes')?.value || 90;
    const nombrePersonnes = this.reservationForm.get('nombrePersonnes')?.value || 1;

    if (!tableId || !date || !heure) {
      this.availabilityCheck = null;
      this.cdr.markForCheck();
      return;
    }

    this.isCheckingAvailability = true;
    this.reservationService
      .checkAvailability({
        tableId: Number(tableId),
        date,
        heure,
        dureeMinutes,
        nombrePersonnes,
        excludeId: this.reservationToEdit?.id,
      })
      .subscribe({
        next: (result) => {
          this.availabilityCheck = result;
          this.isCheckingAvailability = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.availabilityCheck = null;
          this.isCheckingAvailability = false;
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Handles customer name input to fetch autocomplete suggestions.
   */
  onCustomerNameInput(): void {
    const query = this.reservationForm.get('nomClient')?.value?.trim();
    if (!query || query.length < 2) {
      this.customerSuggestions = [];
      this.showSuggestions = false;
      this.cdr.markForCheck();
      return;
    }

    this.reservationService.getSuggestions(query).subscribe({
      next: (suggestions) => {
        // Deduplicate suggestions by name & phone
        const seen = new Set<string>();
        this.customerSuggestions = suggestions.filter((s) => {
          const key = `${s.nomClient.toLowerCase()}-${s.telephone || ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        this.showSuggestions = this.customerSuggestions.length > 0;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Applies an autocomplete suggestion to the form fields.
   *
   * @param suggestion Selected past customer reservation
   */
  selectSuggestion(suggestion: Reservation): void {
    this.reservationForm.patchValue({
      nomClient: suggestion.nomClient,
      telephone: suggestion.telephone || '',
      email: suggestion.email || '',
    });
    this.showSuggestions = false;
    this.cdr.markForCheck();
  }

  /**
   * Submits the reservation form to create or update.
   */
  saveReservation(): void {
    if (this.reservationForm.invalid || this.isSaving) {
      this.reservationForm.markAllAsTouched();
      return;
    }

    const raw = this.reservationForm.value;
    const tableIdValue = raw.tableId ? Number(raw.tableId) : null;

    this.isSaving = true;
    this.cdr.markForCheck();

    if (this.reservationToEdit?.id) {
      const updatePayload: ReservationUpdateRequest = {
        nomClient: raw.nomClient.trim(),
        telephone: raw.telephone?.trim() || null,
        email: raw.email?.trim() || null,
        dateReservation: raw.dateReservation,
        heureReservation: raw.heureReservation,
        dureeMinutes: Number(raw.dureeMinutes),
        nombrePersonnes: Number(raw.nombrePersonnes),
        notes: raw.notes?.trim() || null,
        statut: raw.statut,
        tableId: tableIdValue,
      };

      this.reservationService.updateReservation(this.reservationToEdit.id, updatePayload).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.reservationSaved.emit(updated);
          this.close();
        },
        error: () => {
          this.isSaving = false;
          this.cdr.markForCheck();
        },
      });
    } else {
      const createPayload: ReservationCreateRequest = {
        nomClient: raw.nomClient.trim(),
        telephone: raw.telephone?.trim() || null,
        email: raw.email?.trim() || null,
        dateReservation: raw.dateReservation,
        heureReservation: raw.heureReservation,
        dureeMinutes: Number(raw.dureeMinutes),
        nombrePersonnes: Number(raw.nombrePersonnes),
        notes: raw.notes?.trim() || null,
        statut: raw.statut || 'CONFIRMED',
        tableId: tableIdValue,
      };

      this.reservationService.createReservation(createPayload).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.reservationSaved.emit(created);
          this.close();
        },
        error: () => {
          this.isSaving = false;
          this.cdr.markForCheck();
        },
      });
    }
  }

  close(): void {
    this.isOpen = false;
    this.showSuggestions = false;
    this.modalClose.emit();
  }

  private formatTimeForInput(timeStr: string): string {
    if (!timeStr) return '19:30';
    return timeStr.length > 5 ? timeStr.substring(0, 5) : timeStr;
  }
}
