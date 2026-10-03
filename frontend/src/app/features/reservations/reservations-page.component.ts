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
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonToolbar,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  filterOutline,
  gridOutline,
  listOutline,
  peopleOutline,
  personOutline,
  refreshOutline,
  restaurantOutline,
  searchOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { Reservation, ReservationStatut } from '../../core/models/reservation.model';
import { TableBar } from '../../core/models/table.model';
import { ReservationService } from '../../core/services/reservation.service';
import { TableService } from '../../core/services/table.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { SearchBarComponent } from '../../core/components/ui/search-bar/search-bar.component';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { ReservationModalComponent } from './components/reservation-modal/reservation-modal.component';

/** Service shift segmentation filter type. */
export type ServiceShift = 'ALL' | 'LUNCH' | 'DINNER';

/** View layout presentation mode. */
export type ViewLayoutMode = 'TIMELINE' | 'LIST';

/**
 * Main Table Reservation Book page allowing staff to browse bookings across timeline/list,
 * create/edit bookings, and seat patrons.
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
    ReservationModalComponent,
  ],
  templateUrl: './reservations-page.component.html',
  styleUrls: ['./reservations-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationsPageComponent implements OnInit, OnDestroy {
  private readonly reservationService = inject(ReservationService);
  private readonly tableService = inject(TableService);
  private readonly ws = inject(WebSocketService, { optional: true });
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  // State signals
  readonly selectedDate = signal<string>(new Date().toISOString().substring(0, 10));
  readonly selectedShift = signal<ServiceShift>('ALL');
  readonly viewMode = signal<ViewLayoutMode>('TIMELINE');
  readonly searchQuery = signal<string>('');
  readonly selectedStatusFilter = signal<'ALL' | ReservationStatut>('ALL');
  readonly reservations = signal<Reservation[]>([]);
  readonly tables = signal<TableBar[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Modal controls
  isModalOpen = false;
  reservationToEdit: Reservation | null = null;
  newReservationInitialTableId: number | null = null;
  newReservationInitialTime: string | null = null;

  // Filtered reservations
  readonly filteredReservations = computed(() => {
    let list = this.reservations();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatusFilter();
    const shift = this.selectedShift();

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

    if (shift === 'LUNCH') {
      list = list.filter((r) => {
        const h = this.parseHour(r.heureReservation);
        return h >= 11 && h < 16;
      });
    } else if (shift === 'DINNER') {
      list = list.filter((r) => {
        const h = this.parseHour(r.heureReservation);
        return h >= 18;
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

  // Timeline slots configuration based on shift
  readonly timelineConfig = computed(() => {
    const shift = this.selectedShift();
    if (shift === 'LUNCH') {
      return {
        startMinutes: 11 * 60 + 30, // 11:30
        endMinutes: 15 * 60 + 30, // 15:30
        stepMinutes: 30,
        slots: ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00'],
      };
    } else if (shift === 'DINNER') {
      return {
        startMinutes: 18 * 60 + 30, // 18:30
        endMinutes: 23 * 60 + 30, // 23:30
        stepMinutes: 30,
        slots: ['18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'],
      };
    }
    // ALL Day: 11:30 to 23:30
    return {
      startMinutes: 11 * 60 + 30,
      endMinutes: 23 * 60 + 30,
      stepMinutes: 60,
      slots: ['11:30', '12:30', '13:30', '14:30', '15:30', '16:30', '17:30', '18:30', '19:30', '20:30', '21:30', '22:30'],
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
        // Sort tables naturally by number
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

  setShift(shift: ServiceShift): void {
    this.selectedShift.set(shift);
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

  onReservationSaved(saved: Reservation): void {
    this.loadReservations();
  }

  /**
   * 1-Click action to seat guests on their assigned table.
   */
  seatReservation(reservation: Reservation): void {
    this.reservationService.seatReservation(reservation.id).subscribe({
      next: () => {
        this.loadReservations();
        this.loadTables();
      },
    });
  }

  /**
   * Cancels a reservation.
   */
  cancelReservation(reservation: Reservation): void {
    this.reservationService.updateStatut(reservation.id, 'CANCELLED').subscribe({
      next: () => this.loadReservations(),
    });
  }

  /**
   * Deletes a reservation permanently.
   */
  deleteReservation(reservation: Reservation): void {
    this.reservationService.deleteReservation(reservation.id).subscribe({
      next: () => this.loadReservations(),
    });
  }

  /**
   * Navigates to the interactive Konva floor plan.
   */
  goToFloorPlan(): void {
    void this.router.navigate(['/plan-salle']);
  }

  // ─── Timeline Calculation Helpers ──────────────────────────

  getReservationsForTable(tableId: number): Reservation[] {
    return this.filteredReservations().filter((r) => r.tableId === tableId);
  }

  getReservationStyle(res: Reservation): Record<string, string> {
    const config = this.timelineConfig();
    const totalMinutes = config.endMinutes - config.startMinutes;

    const startH = this.parseHour(res.heureReservation);
    const startM = this.parseMinute(res.heureReservation);
    const resStartMinutes = startH * 60 + startM;
    const duration = res.dureeMinutes || 90;

    // Constrain within timeline boundaries
    const clampedStart = Math.max(config.startMinutes, Math.min(config.endMinutes, resStartMinutes));
    const clampedEnd = Math.max(config.startMinutes, Math.min(config.endMinutes, resStartMinutes + duration));

    const left = ((clampedStart - config.startMinutes) / totalMinutes) * 100;
    const width = Math.max(3, ((clampedEnd - clampedStart) / totalMinutes) * 100);

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
