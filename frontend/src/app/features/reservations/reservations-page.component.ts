import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  ActionSheetController,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calendarOutline,
  callOutline,
  checkmarkCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  clipboardOutline,
  closeCircleOutline,
  closeOutline,
  copyOutline,
  createOutline,
  documentTextOutline,
  duplicateOutline,
  filterOutline,
  gridOutline,
  listOutline,
  optionsOutline,
  peopleOutline,
  personOutline,
  refreshOutline,
  restaurantOutline,
  searchOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import {
  Reservation,
  ReservationCreateRequest,
  ReservationStatut,
} from '../../core/models/reservation.model';
import { TableBar } from '../../core/models/table.model';
import { ReservationService } from '../../core/services/reservation.service';
import { TableService } from '../../core/services/table.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { SearchBarComponent } from '../../core/components/ui/search-bar/search-bar.component';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { CardComponent, CardAccentColor } from '../../core/components/ui/card/card.component';
import { ReservationModalComponent } from './components/reservation-modal/reservation-modal.component';
import {
  RestaurantServiceShift,
  RestaurantShiftService,
} from '../../core/services/restaurant-shift.service';
import { RestaurantShiftsModalComponent } from './components/restaurant-shifts-modal/restaurant-shifts-modal.component';

/** View layout presentation mode. */
export type ViewLayoutMode = 'TIMELINE' | 'LIST';

/**
 * Main Table Reservation Book page allowing staff to browse bookings across timeline/list,
 * create/edit bookings directly on the calendar, copy/paste bookings, configure service shifts,
 * and seat patrons in real time.
 */
@Component({
  selector: 'app-reservations-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslocoPipe,
    IonHeader,
    IonToolbar,
    IonContent,
    IonIcon,
    IonSpinner,
    SearchBarComponent,
    EmptyStateComponent,
    CardComponent,
    ReservationModalComponent,
    RestaurantShiftsModalComponent,
  ],
  templateUrl: './reservations-page.component.html',
  styleUrls: ['./reservations-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationsPageComponent implements OnInit, OnDestroy {
  private readonly reservationService = inject(ReservationService);
  private readonly tableService = inject(TableService);
  private readonly restaurantShiftService = inject(RestaurantShiftService);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly toastCtrl = inject(ToastController);
  private readonly ws = inject(WebSocketService, { optional: true });
  private readonly router = inject(Router);
  private readonly translocoService = inject(TranslocoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  // State signals
  readonly selectedDate = signal<string>(new Date().toISOString().substring(0, 10));
  readonly selectedShift = signal<string>('ALL');
  readonly selectedShiftId = this.selectedShift;
  readonly viewMode = signal<ViewLayoutMode>('TIMELINE');
  readonly searchQuery = signal<string>('');
  readonly selectedStatusFilter = signal<'ALL' | ReservationStatut>('ALL');
  readonly reservations = signal<Reservation[]>([]);
  readonly tables = signal<TableBar[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Configured restaurant shifts
  readonly configuredShifts = this.restaurantShiftService.shifts;

  // Clipboard for copy & paste
  readonly copiedReservation = signal<Reservation | null>(null);

  // Modal controls
  isModalOpen = false;
  isShiftsModalOpen = false;
  reservationToEdit: Reservation | null = null;
  newReservationInitialTableId: number | null = null;
  newReservationInitialTime: string | null = null;

  // Active shift object if not 'ALL'
  readonly activeShift = computed(() => {
    const shiftId = this.selectedShift();
    if (shiftId === 'ALL') return null;
    return this.configuredShifts().find((s) => s.id === shiftId) || null;
  });

  // Filtered reservations
  readonly filteredReservations = computed(() => {
    let list = this.reservations();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatusFilter();
    const shift = this.activeShift();

    if (query) {
      list = list.filter(
        (r) =>
          r.nomClient.toLowerCase().includes(query) ||
          r.telephone?.includes(query) ||
          r.notes?.toLowerCase().includes(query)
      );
    }

    if (status !== 'ALL') {
      list = list.filter((r) => r.statut === status);
    }

    if (shift) {
      const shiftStartMin = this.timeToMinutes(shift.startTime);
      const shiftEndMin = this.timeToMinutes(shift.endTime);
      list = list.filter((r) => {
        const rMin = this.timeToMinutes(r.heureReservation);
        return rMin >= shiftStartMin && rMin <= shiftEndMin;
      });
    }

    return list;
  });

  // KPI Metrics computed
  readonly totalBookingsCount = computed(() => this.filteredReservations().length);
  readonly totalGuestsCount = computed(() =>
    this.filteredReservations().reduce((acc, r) => acc + (r.nombrePersonnes || 0), 0)
  );
  readonly seatedCount = computed(
    () => this.filteredReservations().filter((r) => r.statut === 'SEATED').length
  );
  readonly confirmedPendingCount = computed(
    () =>
      this.filteredReservations().filter(
        (r) => r.statut === 'CONFIRMED' || r.statut === 'PENDING'
      ).length
  );

  // Unassigned reservations for timeline view
  readonly unassignedReservations = computed(() =>
    this.filteredReservations().filter((r) => !r.tableId)
  );

  // Timeline slots configuration based on active shift or full day
  readonly timelineConfig = computed(() => {
    const shift = this.activeShift();
    if (shift) {
      const startMinutes = this.timeToMinutes(shift.startTime);
      const endMinutes = this.timeToMinutes(shift.endTime);
      const step = shift.stepMinutes || 30;
      const slots: string[] = [];
      for (let m = startMinutes; m < endMinutes; m += step) {
        slots.push(this.minutesToTime(m));
      }
      return {
        startMinutes,
        endMinutes,
        stepMinutes: step,
        slots,
      };
    }

    // ALL Day: calculate overall range across configured shifts
    const allShifts = this.configuredShifts();
    let minStart = 11 * 60 + 30; // 11:30 default
    let maxEnd = 23 * 60 + 30; // 23:30 default

    if (allShifts.length > 0) {
      const shiftStarts = allShifts.map((s) => this.timeToMinutes(s.startTime));
      const shiftEnds = allShifts.map((s) => this.timeToMinutes(s.endTime));
      minStart = Math.min(...shiftStarts);
      maxEnd = Math.max(...shiftEnds);
    }

    const step = 60; // 1h step on full day overview
    const slots: string[] = [];
    for (let m = minStart; m < maxEnd; m += step) {
      slots.push(this.minutesToTime(m));
    }

    return {
      startMinutes: minStart,
      endMinutes: maxEnd,
      stepMinutes: step,
      slots,
    };
  });

  constructor() {
    addIcons({
      calendarOutline,
      chevronBackOutline,
      chevronForwardOutline,
      refreshOutline,
      addOutline,
      gridOutline,
      listOutline,
      peopleOutline,
      timeOutline,
      personOutline,
      restaurantOutline,
      filterOutline,
      searchOutline,
      trashOutline,
      callOutline,
      documentTextOutline,
      createOutline,
      closeCircleOutline,
      optionsOutline,
      copyOutline,
      clipboardOutline,
      duplicateOutline,
      checkmarkCircleOutline,
      closeOutline,
    });
  }

  ngOnInit(): void {
    this.loadTables();
    this.loadReservations();
    this.initWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads physical tables from backend.
   */
  loadTables(): void {
    this.tableService.getAll().subscribe({
      next: (t) => {
        const sorted = [...t].sort((a, b) => (a.numero || 0) - (b.numero || 0));
        this.tables.set(sorted);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Loads reservations for the selected date.
   */
  loadReservations(): void {
    this.isLoading.set(true);
    this.reservationService.getReservations({ date: this.selectedDate() }).subscribe({
      next: (res) => {
        this.reservations.set(res);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Increments or decrements the selected date.
   */
  changeDate(deltaDays: number): void {
    const current = new Date(this.selectedDate());
    current.setDate(current.getDate() + deltaDays);
    this.selectedDate.set(current.toISOString().substring(0, 10));
    this.loadReservations();
  }

  /**
   * Sets date back to today.
   */
  setToday(): void {
    const today = new Date().toISOString().substring(0, 10);
    if (this.selectedDate() !== today) {
      this.selectedDate.set(today);
      this.loadReservations();
    }
  }

  onDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) {
      this.selectedDate.set(val);
      this.loadReservations();
    }
  }

  setShift(shiftId: string): void {
    this.selectedShift.set(shiftId);
  }

  setViewMode(mode: ViewLayoutMode): void {
    this.viewMode.set(mode);
  }

  setStatusFilter(status: 'ALL' | ReservationStatut): void {
    this.selectedStatusFilter.set(status);
  }

  onSearchChange(text: string): void {
    this.searchQuery.set(text);
  }

  /**
   * Opens modal to create a new reservation, optionally pre-assigning table and time.
   */
  openNewReservationModal(tableId?: number, time?: string): void {
    this.reservationToEdit = null;
    this.newReservationInitialTableId = tableId ?? null;
    this.newReservationInitialTime = time ?? null;
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  /**
   * Opens modal to edit an existing reservation.
   */
  openEditModal(reservation: Reservation): void {
    this.reservationToEdit = reservation;
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  onModalClose(): void {
    this.isModalOpen = false;
    this.reservationToEdit = null;
    this.cdr.markForCheck();
  }

  onReservationSaved(_saved: Reservation): void {
    this.loadReservations();
  }

  // ─── Shift Management Modal Controls ──────────────────────────

  openShiftsModal(): void {
    this.isShiftsModalOpen = true;
    this.cdr.markForCheck();
  }

  onShiftsModalClose(): void {
    this.isShiftsModalOpen = false;
    this.cdr.markForCheck();
  }

  onShiftsUpdated(_shifts: RestaurantServiceShift[]): void {
    this.cdr.markForCheck();
  }

  // ─── Interactive Calendar Track Clicking & Context Menu ────────

  /**
   * Direct click on an empty timeline slot cell to create a booking for this table & hour.
   *
   * @param tableId Physical table ID
   * @param slotTime Clicked slot hour string (e.g. '19:30')
   */
  onSlotClick(tableId: number, slotTime: string): void {
    this.openNewReservationModal(tableId, slotTime);
  }

  /**
   * Right-click context menu on a timeline slot.
   */
  async onSlotContextMenu(event: MouseEvent, table: TableBar, slotTime: string): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const buttons: any[] = [
      {
        text: this.translocoService.translate('RESERVATIONS.CONTEXT_MENU.NEW_RESERVATION'),
        icon: 'add-outline',
        handler: () => {
          this.openNewReservationModal(table.id, slotTime);
        },
      },
    ];

    if (this.copiedReservation()) {
      const copied = this.copiedReservation()!;
      buttons.push({
        text: this.translocoService.translate('RESERVATIONS.CONTEXT_MENU.PASTE_RESERVATION', { name: copied.nomClient }),
        icon: 'clipboard-outline',
        handler: () => {
          this.pasteReservation(table.id, slotTime);
        },
      });
    }

    buttons.push({
      text: this.translocoService.translate('COMMON.CANCEL'),
      icon: 'close-outline',
      role: 'cancel',
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translocoService.translate('RESERVATIONS.CONTEXT_MENU.HEADER_SLOT', { table: table.numero, time: slotTime }),
      buttons,
    });
    await actionSheet.present();
  }

  /**
   * Right-click context menu on an existing booking block.
   */
  async onReservationContextMenu(event: MouseEvent, res: Reservation, table?: TableBar): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const buttons: any[] = [
      {
        text: this.translocoService.translate('RESERVATIONS.CONTEXT_MENU.EDIT_RESERVATION'),
        icon: 'create-outline',
        handler: () => {
          this.openEditModal(res);
        },
      },
      {
        text: this.translocoService.translate('RESERVATIONS.CONTEXT_MENU.COPY_RESERVATION'),
        icon: 'copy-outline',
        handler: () => {
          this.copyReservation(res);
        },
      },
    ];

    if (this.copiedReservation() && res.tableId) {
      buttons.push({
        text: this.translocoService.translate('RESERVATIONS.CONTEXT_MENU.PASTE_SLOT'),
        icon: 'clipboard-outline',
        handler: () => {
          this.pasteReservation(res.tableId!, res.heureReservation);
        },
      });
    }

    buttons.push({
      text: this.translocoService.translate('RESERVATIONS.CONTEXT_MENU.DUPLICATE_RESERVATION'),
      icon: 'duplicate-outline',
      handler: () => {
        this.duplicateReservation(res);
      },
    });

    if (res.statut !== 'SEATED' && res.statut !== 'CANCELLED' && res.tableId) {
      buttons.push({
        text: this.translocoService.translate('RESERVATIONS.CONTEXT_MENU.SEAT_GUESTS'),
        icon: 'restaurant-outline',
        handler: () => {
          this.seatReservation(res);
        },
      });
    }

    if (res.statut !== 'CANCELLED' && res.statut !== 'SEATED') {
      buttons.push({
        text: this.translocoService.translate('RESERVATIONS.CONTEXT_MENU.CANCEL_RESERVATION'),
        icon: 'close-circle-outline',
        handler: () => {
          this.cancelReservation(res);
        },
      });
    }

    buttons.push(
      {
        text: this.translocoService.translate('RESERVATIONS.CONTEXT_MENU.DELETE_PERMANENT'),
        icon: 'trash-outline',
        role: 'destructive',
        handler: () => {
          this.deleteReservation(res);
        },
      },
      {
        text: this.translocoService.translate('COMMON.CLOSE'),
        icon: 'close-outline',
        role: 'cancel',
      }
    );

    const actionSheet = await this.actionSheetCtrl.create({
      header: `${res.nomClient} (${res.nombrePersonnes} pers) - ${res.heureReservation}`,
      buttons,
    });
    await actionSheet.present();
  }

  /**
   * Copies a reservation into clipboard.
   */
  copyReservation(res: Reservation): void {
    this.copiedReservation.set(res);
    void this.showToast(
      this.translocoService.translate('RESERVATIONS.TOASTS.COPIED_SUCCESS', {
        name: res.nomClient,
        time: res.heureReservation,
      }),
      'success'
    );
  }

  /**
   * Pastes the copied reservation into target table and slot time.
   */
  pasteReservation(tableId: number, slotTime: string): void {
    const copied = this.copiedReservation();
    if (!copied) {
      void this.showToast(this.translocoService.translate('RESERVATIONS.TOASTS.CLIPBOARD_EMPTY'), 'warning');
      return;
    }

    const req: ReservationCreateRequest = {
      nomClient: copied.nomClient,
      telephone: copied.telephone,
      email: copied.email,
      dateReservation: this.selectedDate(),
      heureReservation: slotTime,
      dureeMinutes: copied.dureeMinutes || 90,
      nombrePersonnes: copied.nombrePersonnes || 2,
      notes: copied.notes ? `${copied.notes} (Copié)` : 'Copié depuis le planning',
      statut: 'CONFIRMED',
      tableId: tableId || null,
    };

    this.reservationService.createReservation(req).subscribe({
      next: (created) => {
        this.loadReservations();
        void this.showToast(
          this.translocoService.translate('RESERVATIONS.TOASTS.PASTED_SUCCESS', {
            name: created.nomClient,
            time: slotTime,
          }),
          'success'
        );
      },
      error: () => {
        void this.showToast(this.translocoService.translate('RESERVATIONS.TOASTS.PASTED_ERROR'), 'danger');
      },
    });
  }

  /**
   * Duplicates reservation 1 hour after on same table.
   */
  duplicateReservation(res: Reservation): void {
    const startMin = this.timeToMinutes(res.heureReservation);
    const newTime = this.minutesToTime(startMin + 60);

    const req: ReservationCreateRequest = {
      nomClient: `${res.nomClient} (Copie)`,
      telephone: res.telephone,
      email: res.email,
      dateReservation: res.dateReservation,
      heureReservation: newTime,
      dureeMinutes: res.dureeMinutes || 90,
      nombrePersonnes: res.nombrePersonnes || 2,
      notes: res.notes,
      statut: 'CONFIRMED',
      tableId: res.tableId,
    };

    this.reservationService.createReservation(req).subscribe({
      next: () => {
        this.loadReservations();
        void this.showToast(
          this.translocoService.translate('RESERVATIONS.TOASTS.DUPLICATED_SUCCESS', { time: newTime }),
          'success'
        );
      },
    });
  }

  // ─── Actions & Lifecycle ─────────────────────────────────────────

  seatReservation(reservation: Reservation): void {
    this.reservationService.seatReservation(reservation.id).subscribe({
      next: () => {
        this.loadReservations();
        this.loadTables();
      },
    });
  }

  cancelReservation(reservation: Reservation): void {
    this.reservationService.updateStatut(reservation.id, 'CANCELLED').subscribe({
      next: () => this.loadReservations(),
    });
  }

  deleteReservation(reservation: Reservation): void {
    this.reservationService.deleteReservation(reservation.id).subscribe({
      next: () => this.loadReservations(),
    });
  }

  goToFloorPlan(): void {
    void this.router.navigate(['/plan-salle']);
  }

  // ─── Timeline Calculation Helpers ──────────────────────────

  getReservationsForTable(tableId: number): Reservation[] {
    return this.filteredReservations().filter((r) => r.tableId === tableId);
  }

  getReservationStyle(res: Reservation): Record<string, string> {
    const config = this.timelineConfig();
    const totalMinutes = Math.max(1, config.endMinutes - config.startMinutes);

    const startH = this.parseHour(res.heureReservation);
    const startM = this.parseMinute(res.heureReservation);
    const resStartMinutes = startH * 60 + startM;
    const duration = res.dureeMinutes || 90;

    const clampedStart = Math.max(config.startMinutes, Math.min(config.endMinutes, resStartMinutes));
    const clampedEnd = Math.max(config.startMinutes, Math.min(config.endMinutes, resStartMinutes + duration));

    const left = ((clampedStart - config.startMinutes) / totalMinutes) * 100;
    const width = Math.max(4, ((clampedEnd - clampedStart) / totalMinutes) * 100);

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  }

  getStatusClass(statut: ReservationStatut): string {
    switch (statut) {
      case 'SEATED':
        return 'status-seated';
      case 'CONFIRMED':
        return 'status-confirmed';
      case 'PENDING':
        return 'status-pending';
      case 'CANCELLED':
        return 'status-cancelled';
      case 'NO_SHOW':
        return 'status-noshow';
      default:
        return 'status-default';
    }
  }

  getCardAccentColor(statut: ReservationStatut): CardAccentColor {
    switch (statut) {
      case 'CONFIRMED':
        return 'purple';
      case 'PENDING':
        return 'warning';
      case 'SEATED':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      case 'NO_SHOW':
      default:
        return 'none';
    }
  }

  private timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return (Number.parseInt(parts[0], 10) || 0) * 60 + (Number.parseInt(parts[1], 10) || 0);
  }

  private minutesToTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private parseHour(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return Number.parseInt(parts[0], 10) || 0;
  }

  private parseMinute(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parts.length > 1 ? Number.parseInt(parts[1], 10) || 0 : 0;
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  private initWebSocket(): void {
    if (!this.ws) return;
    this.ws
      .watch('/topic/reservations')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadReservations();
      });
  }
}
