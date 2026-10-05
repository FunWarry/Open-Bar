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
  addOutline,
  alertCircleOutline,
  calendarOutline,
  checkmarkCircleOutline,
  closeOutline,
  gridOutline,
  listOutline,
  mailOutline,
  mapOutline,
  peopleOutline,
  personOutline,
  callOutline,
  removeOutline,
  restaurantOutline,
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
import { PlanSalleService } from '../../../plan-salle/services/plan-salle.service';
import { TablePosition, ZoneArea } from '../../../plan-salle/models/table-position.model';
import { EtageService, EtageBar } from '../../../../core/services/etage.service';
import { ModalComponent } from '../../../../core/components/ui/modal/modal.component';
import { catchError, of } from 'rxjs';
import {
  SearchableOption,
  SearchableSelectComponent,
} from '../../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Modal dialog component for creating or editing a table reservation.
 * Includes party size validation, live table availability checks, customer autocomplete,
 * interactive instant-T floor plan picker, and 1-click seating action.
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
  private readonly planSalleService = inject(PlanSalleService);
  private readonly etageService = inject(EtageService);
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

  showFloorPlanPicker = false;
  selectedFloor = 'RDC';
  selectedFloorPlanZone = 'ALL';
  etages: EtageBar[] = [];
  dayReservations: Reservation[] = [];
  tablePositions: TablePosition[] = [];
  zoneAreas: ZoneArea[] = [];
  floorPlanZoom = 1.0;

  /**
   * Normalizes floor code identifiers to ensure consistent comparison across models.
   */
  normalizeFloorCode(raw?: string): string {
    if (!raw) return 'RDC';
    const val = raw.trim().toUpperCase();
    if (val === 'RDC' || val.includes('REZ')) return 'RDC';
    if (val === 'ETAGE_1' || val.includes('1ER') || val.includes('1ÉTAGE') || val.includes('1ETAGE')) return 'ETAGE_1';
    if (val === 'ETAGE_2' || val.includes('2ÈME') || val.includes('2EME') || val.includes('ROOFTOP')) return 'ETAGE_2';
    return val;
  }

  /**
   * Resolves the floor level for a given table based on its position, entity, or zone.
   */
  resolveTableFloor(t: TableBar): string {
    const pos = this.tablePositions.find((p) => p.tableId === t.id);
    if (pos?.floor) return this.normalizeFloorCode(pos.floor);
    if (t.etage) return this.normalizeFloorCode(t.etage);

    const zoneName = pos?.zone || t.zone;
    if (zoneName) {
      const zArea = this.zoneAreas.find(
        (z) => z.nom?.trim().toLowerCase() === zoneName.trim().toLowerCase()
      );
      if (zArea?.etage) return this.normalizeFloorCode(zArea.etage);
    }
    return 'RDC';
  }

  /**
   * Returns all available floor levels dynamically detected or loaded from backend.
   */
  get availableFloors(): { code: string; nom: string }[] {
    if (this.etages && this.etages.length > 0) {
      return this.etages.map((e) => ({
        code: this.normalizeFloorCode(e.code),
        nom: e.nom,
      }));
    }

    const detected = new Map<string, string>();
    (this.tables || []).forEach((t) => {
      const code = this.resolveTableFloor(t);
      if (!detected.has(code)) {
        detected.set(code, t.etage || code);
      }
    });
    (this.zoneAreas || []).forEach((z) => {
      if (z.etage) {
        const code = this.normalizeFloorCode(z.etage);
        if (!detected.has(code)) {
          detected.set(code, z.etage);
        }
      }
    });

    if (detected.size === 0) {
      return [{ code: 'RDC', nom: 'RDC' }];
    }

    return Array.from(detected.entries()).map(([code, nom]) => ({ code, nom }));
  }

  /**
   * Selects a single floor level and resets zone filter to show all zones of this floor.
   */
  selectFloor(code: string): void {
    this.selectedFloor = code;
    this.selectedFloorPlanZone = 'ALL';
    this.cdr.markForCheck();
  }

  /**
   * Synchronizes active floor view with the currently selected or prefilled table.
   */
  syncSelectedFloorWithCurrentTable(): void {
    const currentTableId = this.reservationForm?.get('tableId')?.value ?? this.initialTableId;
    if (currentTableId) {
      const t = (this.tables || []).find((tbl) => tbl.id === currentTableId);
      if (t) {
        this.selectedFloor = this.resolveTableFloor(t);
        return;
      }
    }

    const floors = this.availableFloors;
    if (floors.length > 0 && !floors.some((f) => f.code === this.selectedFloor)) {
      this.selectedFloor = floors[0].code;
    }
  }

  get floorPlanZones(): string[] {
    const zones = new Set<string>();
    (this.tables || []).forEach((t) => {
      if (this.resolveTableFloor(t) === this.selectedFloor && t.zone) {
        zones.add(t.zone);
      }
    });
    (this.zoneAreas || []).forEach((z) => {
      if (this.normalizeFloorCode(z.etage) === this.selectedFloor && z.nom) {
        zones.add(z.nom);
      }
    });
    return Array.from(zones);
  }

  get filteredFloorPlanTables(): TableBar[] {
    return (this.tables || []).filter((t) => {
      const matchesFloor = this.resolveTableFloor(t) === this.selectedFloor;
      const matchesZone = this.selectedFloorPlanZone === 'ALL' || t.zone === this.selectedFloorPlanZone;
      return matchesFloor && matchesZone;
    });
  }

  get filteredZoneAreas(): ZoneArea[] {
    if (!this.zoneAreas || this.zoneAreas.length === 0) return [];
    return this.zoneAreas.filter((z) => {
      const matchesFloor = this.normalizeFloorCode(z.etage) === this.selectedFloor;
      const matchesZone =
        this.selectedFloorPlanZone === 'ALL' ||
        z.nom?.trim().toLowerCase() === this.selectedFloorPlanZone.trim().toLowerCase();
      return matchesFloor && matchesZone;
    });
  }

  /**
   * Retrieves the 2D spatial position and geometry of a table on the floor plan canvas.
   */
  getTablePosition(table: TableBar): TablePosition {
    const existing = this.tablePositions.find((p) => p.tableId === table.id);
    if (existing) {
      return {
        ...existing,
        width: existing.width || 90,
        height: existing.height || 90,
        rotation: existing.rotation || 0,
        shape: existing.shape || 'rect',
      };
    }
    const floorTables = (this.tables || []).filter(
      (tbl) => this.resolveTableFloor(tbl) === this.selectedFloor
    );
    const idx = floorTables.findIndex((t) => t.id === table.id);
    const validIdx = Math.max(0, idx);
    const col = validIdx % 4;
    const row = Math.floor(validIdx / 4);
    return {
      tableId: table.id,
      x: 120 + col * 160,
      y: 120 + row * 160,
      width: 90,
      height: 90,
      rotation: 0,
      shape: 'rect',
      floor: table.etage || this.selectedFloor,
      zone: table.zone,
    };
  }

  /**
   * Converts polygon vertices array to SVG points attribute string.
   */
  formatPolygonPoints(points?: number[]): string {
    if (!points || points.length < 4) return '';
    const pts: string[] = [];
    for (let i = 0; i < points.length; i += 2) {
      pts.push(`${points[i]},${points[i + 1]}`);
    }
    return pts.join(' ');
  }

  /**
   * Computes dynamic SVG viewBox enclosing all visible tables and zone boundaries.
   */
  get floorPlanViewBox(): string {
    const tables = this.filteredFloorPlanTables;
    const zones = this.filteredZoneAreas;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    zones.forEach((z) => {
      minX = Math.min(minX, z.x);
      minY = Math.min(minY, z.y);
      maxX = Math.max(maxX, z.x + (z.width || 400));
      maxY = Math.max(maxY, z.y + (z.height || 280));
    });

    tables.forEach((t) => {
      const pos = this.getTablePosition(t);
      const w = pos.width || 90;
      const h = pos.height || 90;
      minX = Math.min(minX, pos.x - w / 2);
      minY = Math.min(minY, pos.y - h / 2);
      maxX = Math.max(maxX, pos.x + w / 2);
      maxY = Math.max(maxY, pos.y + h / 2);
    });

    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(minY)) minY = 0;
    if (!Number.isFinite(maxX)) maxX = 800;
    if (!Number.isFinite(maxY)) maxY = 600;

    const pad = 60;
    const x = Math.max(0, Math.round(minX - pad));
    const y = Math.max(0, Math.round(minY - pad));
    const w = Math.max(400, Math.round(maxX - minX + pad * 2));
    const h = Math.max(300, Math.round(maxY - minY + pad * 2));

    return `${x} ${y} ${w} ${h}`;
  }

  zoomFloorPlanIn(): void {
    this.floorPlanZoom = Math.min(2.0, Math.round((this.floorPlanZoom + 0.15) * 100) / 100);
    this.cdr.markForCheck();
  }

  zoomFloorPlanOut(): void {
    this.floorPlanZoom = Math.max(0.6, Math.round((this.floorPlanZoom - 0.15) * 100) / 100);
    this.cdr.markForCheck();
  }

  resetFloorPlanZoom(): void {
    this.floorPlanZoom = 1.0;
    this.cdr.markForCheck();
  }

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
      addOutline,
      removeOutline,
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
      mapOutline,
      gridOutline,
      listOutline,
      restaurantOutline,
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
      this.loadDayReservations(this.reservationToEdit.dateReservation);
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
      this.loadDayReservations(this.initialDate || today);
    }

    this.loadFloorPlanData();
    this.syncSelectedFloorWithCurrentTable();
    this.reservationForm.markAsPristine();
    this.reservationForm.markAsUntouched();
    this.cdr.markForCheck();
  }

  /**
   * Toggles the floor plan picker view.
   */
  toggleFloorPlanPicker(): void {
    this.showFloorPlanPicker = !this.showFloorPlanPicker;
    if (this.showFloorPlanPicker) {
      this.loadFloorPlanData();
      this.loadDayReservations();
    }
    this.cdr.markForCheck();
  }

  /**
   * Loads table physical positions, floor levels and zone boundary layouts for the floor plan.
   */
  loadFloorPlanData(): void {
    if (typeof this.etageService?.getAll === 'function') {
      this.etageService.getAll().pipe(catchError(() => of([]))).subscribe({
        next: (etages) => {
          this.etages = etages || [];
          this.syncSelectedFloorWithCurrentTable();
          this.cdr.markForCheck();
        },
      });
    }

    if (typeof this.planSalleService?.getPositions === 'function') {
      this.planSalleService.getPositions().subscribe({
        next: (positions) => {
          this.tablePositions = positions || [];
          this.syncSelectedFloorWithCurrentTable();
          this.cdr.markForCheck();
        },
      });
    }

    try {
      const stored = localStorage.getItem('openbar_zone_areas');
      if (stored) {
        this.zoneAreas = JSON.parse(stored);
      } else {
        this.zoneAreas = [];
      }
    } catch {
      this.zoneAreas = [];
    }

    this.syncSelectedFloorWithCurrentTable();
  }

  /**
   * Loads reservations for the selected date to evaluate slot availability.
   */
  loadDayReservations(date?: string): void {
    const targetDate = date || this.reservationForm?.get('dateReservation')?.value;
    if (!targetDate || typeof this.reservationService?.getReservations !== 'function') return;

    this.reservationService.getReservations({ date: targetDate }).subscribe({
      next: (list) => {
        this.dayReservations = list;
        this.cdr.markForCheck();
      },
      error: () => {
        this.dayReservations = [];
        this.cdr.markForCheck();
      },
    });
  }

  timeToMinutes(t: string): number {
    if (!t) return 0;
    const parts = t.split(':');
    return (Number.parseInt(parts[0], 10) || 0) * 60 + (Number.parseInt(parts[1], 10) || 0);
  }

  /**
   * Computes the availability status of a table at the exact reservation slot T.
   */
  getTableSlotStatus(table: TableBar): {
    status: 'AVAILABLE' | 'CAPACITY_WARNING' | 'OCCUPIED' | 'SELECTED';
    conflictReservation?: Reservation;
    label: string;
  } {
    const selectedTableId = this.reservationForm?.get('tableId')?.value;
    if (selectedTableId === table.id) {
      return {
        status: 'SELECTED',
        label: this.translocoService.translate('RESERVATIONS.FLOOR_PLAN_STATUS_SELECTED'),
      };
    }

    const slotStartStr = this.reservationForm?.get('heureReservation')?.value || '19:30';
    const duree = Number(this.reservationForm?.get('dureeMinutes')?.value || 90);
    const partySize = Number(this.reservationForm?.get('nombrePersonnes')?.value || 1);

    const slotStartMin = this.timeToMinutes(slotStartStr);
    const slotEndMin = slotStartMin + duree;

    // Check conflict
    const conflict = this.dayReservations.find((r) => {
      if (r.tableId !== table.id) return false;
      if (r.id === this.reservationToEdit?.id) return false;
      if (r.statut === 'CANCELLED' || r.statut === 'NO_SHOW') return false;

      const rStartMin = this.timeToMinutes(r.heureReservation);
      const rEndMin = rStartMin + (r.dureeMinutes || 90);

      return !(slotEndMin <= rStartMin || slotStartMin >= rEndMin);
    });

    if (conflict) {
      return {
        status: 'OCCUPIED',
        conflictReservation: conflict,
        label: this.translocoService.translate('RESERVATIONS.TABLE_OCCUPIED_BY', {
          name: conflict.nomClient,
          time: conflict.heureReservation,
        }),
      };
    }

    if (table.capacite < partySize) {
      return {
        status: 'CAPACITY_WARNING',
        label: this.translocoService.translate('RESERVATIONS.FLOOR_PLAN_STATUS_CAPACITY_WARN'),
      };
    }

    return {
      status: 'AVAILABLE',
      label: this.translocoService.translate('RESERVATIONS.FLOOR_PLAN_STATUS_AVAILABLE'),
    };
  }

  /**
   * Selects a table clicked on the visual floor plan.
   */
  selectTableFromFloorPlan(table: TableBar): void {
    const statusInfo = this.getTableSlotStatus(table);
    if (statusInfo.status === 'OCCUPIED') {
      return;
    }

    this.selectedFloor = this.resolveTableFloor(table);
    this.reservationForm.get('tableId')?.setValue(table.id);
    this.checkTableAvailability();
    this.cdr.markForCheck();
  }

  /**
   * Handles table selection from dropdown select menu.
   */
  onTableSelected(option: SearchableOption<number | null> | null): void {
    const tableId = option?.value ?? null;
    this.reservationForm.get('tableId')?.setValue(tableId);
    if (tableId) {
      const t = (this.tables || []).find((tbl) => tbl.id === tableId);
      if (t) {
        this.selectedFloor = this.resolveTableFloor(t);
      }
      this.checkTableAvailability();
    } else {
      this.availabilityCheck = null;
    }
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

  /**
   * Saves the reservation and immediately seats guests at the table (status SEATED).
   */
  saveAndSeatReservation(): void {
    if (this.reservationForm.invalid || this.isSaving) {
      this.reservationForm.markAllAsTouched();
      return;
    }

    const tableId = this.reservationForm.get('tableId')?.value;
    if (!tableId) {
      return;
    }

    this.reservationForm.patchValue({ statut: 'SEATED' });
    const raw = this.reservationForm.value;
    const tableIdValue = Number(raw.tableId);

    this.isSaving = true;
    this.cdr.markForCheck();

    const onSavedSuccess = (saved: Reservation) => {
      this.reservationService.seatReservation(saved.id).subscribe({
        next: (seated) => {
          this.isSaving = false;
          this.reservationSaved.emit(seated);
          this.close();
        },
        error: () => {
          this.isSaving = false;
          this.reservationSaved.emit(saved);
          this.close();
        },
      });
    };

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
        statut: 'SEATED',
        tableId: tableIdValue,
      };

      this.reservationService.updateReservation(this.reservationToEdit.id, updatePayload).subscribe({
        next: onSavedSuccess,
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
        statut: 'SEATED',
        tableId: tableIdValue,
      };

      this.reservationService.createReservation(createPayload).subscribe({
        next: onSavedSuccess,
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
