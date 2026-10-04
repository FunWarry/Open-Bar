import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
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
import { ModalComponent } from '../../../../core/components/ui/modal/modal.component';
import {
  SearchableOption,
  SearchableSelectComponent,
} from '../../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Modal dialog component for creating or editing a table reservation.
 * Includes party size validation, live table availability checks, customer autocomplete,
 * and design system searchable select dropdowns.
 */
@Component({
  selector: 'app-reservation-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslocoPipe,
    IonModal,
    IonIcon,
    ModalComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './reservation-modal.component.html',
  styleUrls: ['./reservation-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationModalComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly reservationService = inject(ReservationService);
  private readonly translocoService = inject(TranslocoService);

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

  get durationSelectOptions(): SearchableOption<number>[] {
    const defaultSuffix = this.translocoService.translate('RESERVATIONS.DURATION_DEFAULT_SUFFIX');
    return [
      { value: 45, label: '45 min' },
      { value: 60, label: '1h00' },
      { value: 90, label: `1h30${defaultSuffix}` },
      { value: 120, label: '2h00' },
      { value: 150, label: '2h30' },
      { value: 180, label: '3h00' },
      { value: 240, label: '4h00' },
    ];
  }

  get statusSelectOptions(): SearchableOption<ReservationStatut>[] {
    const confirmed = this.translocoService.translate('RESERVATIONS.STATUS_CONFIRMED');
    const pending = this.translocoService.translate('RESERVATIONS.STATUS_PENDING');
    const seated = this.translocoService.translate('RESERVATIONS.STATUS_SEATED');
    const cancelled = this.translocoService.translate('RESERVATIONS.STATUS_CANCELLED');
    const noShow = this.translocoService.translate('RESERVATIONS.STATUS_NO_SHOW');

    return [
      { value: 'CONFIRMED', label: confirmed, badge: confirmed, badgeType: 'primary' },
      { value: 'PENDING', label: pending, badge: pending, badgeType: 'warning' },
      { value: 'SEATED', label: seated, badge: seated, badgeType: 'success' },
      { value: 'CANCELLED', label: cancelled, badge: cancelled, badgeType: 'danger' },
      { value: 'NO_SHOW', label: noShow, badge: noShow, badgeType: 'neutral' },
    ];
  }

  get tableSelectOptions(): SearchableOption<number | null>[] {
    const defaultOpt: SearchableOption<number | null> = {
      value: null,
      label: this.translocoService.translate('RESERVATIONS.TABLE_UNASSIGNED_OPTION'),
      badge: this.translocoService.translate('RESERVATIONS.TABLE_FREE_BADGE'),
      badgeType: 'neutral',
    };
    const guestsUnit = this.translocoService.translate('RESERVATIONS.GUESTS_UNIT');
    const tableOpts: SearchableOption<number | null>[] = (this.tables || []).map((t) => ({
      value: t.id,
      label: `Table ${t.numero} (${t.capacite} ${guestsUnit} - ${t.zone})`,
      badge: `${t.capacite} ${guestsUnit}`,
      badgeType: t.occupee ? 'warning' : 'success',
      subLabel: t.zone,
    }));
    return [defaultOpt, ...tableOpts];
  }

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

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['isOpen'] ||
      changes['reservationToEdit'] ||
      changes['initialDate'] ||
      changes['initialTime'] ||
      changes['initialTableId']
    ) {
      if (this.isOpen) {
        this.populateForm();
      }
    }
  }

  /**
   * Initializes the reactive form structure.
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
   * Populates form fields with existing reservation or default new values.
   */
  populateForm(): void {
    if (!this.reservationForm) {
      this.initForm();
      return;
    }

    const today = new Date().toISOString().substring(0, 10);

    if (this.reservationToEdit) {
      this.reservationForm.patchValue({
        nomClient: this.reservationToEdit.nomClient,
        telephone: this.reservationToEdit.telephone || '',
        email: this.reservationToEdit.email || '',
        dateReservation: this.reservationToEdit.dateReservation,
        heureReservation: this.formatTimeForInput(this.reservationToEdit.heureReservation),
        dureeMinutes: this.reservationToEdit.dureeMinutes || 90,
        nombrePersonnes: this.reservationToEdit.nombrePersonnes || 2,
        tableId: this.reservationToEdit.tableId ?? null,
        notes: this.reservationToEdit.notes || '',
        statut: this.reservationToEdit.statut || 'CONFIRMED',
      });
      if (this.reservationToEdit.tableId) {
        this.checkTableAvailability();
      } else {
        this.availabilityCheck = null;
      }
    } else {
      this.reservationForm.patchValue({
        nomClient: '',
        telephone: '',
        email: '',
        dateReservation: this.initialDate || today,
        heureReservation: this.initialTime || '19:30',
        dureeMinutes: 90,
        nombrePersonnes: 2,
        tableId: this.initialTableId ?? null,
        notes: '',
        statut: 'CONFIRMED',
      });
      if (this.initialTableId) {
        this.checkTableAvailability();
      } else {
        this.availabilityCheck = null;
      }
    }

    this.reservationForm.markAsPristine();
    this.reservationForm.markAsUntouched();
    this.cdr.markForCheck();
  }

  /**
   * Evaluates table availability for the selected slot and party size.
   */
  checkTableAvailability(): void {
    const tableId = this.reservationForm?.get('tableId')?.value;
    const date = this.reservationForm?.get('dateReservation')?.value;
    const heure = this.reservationForm?.get('heureReservation')?.value;
    const dureeMinutes = this.reservationForm?.get('dureeMinutes')?.value || 90;
    const nombrePersonnes = this.reservationForm?.get('nombrePersonnes')?.value || 1;

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

  onTableSelected(option: SearchableOption<number | null> | null): void {
    const val = option ? option.value : null;
    this.reservationForm.get('tableId')?.setValue(val);
    this.checkTableAvailability();
  }

  onDurationSelected(option: SearchableOption<number> | null): void {
    if (option) {
      this.reservationForm.get('dureeMinutes')?.setValue(option.value);
      this.checkTableAvailability();
    }
  }

  onStatusSelected(option: SearchableOption<ReservationStatut> | null): void {
    if (option) {
      this.reservationForm.get('statut')?.setValue(option.value);
    }
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
