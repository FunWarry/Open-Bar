import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonSpinner,
  IonIcon,
  ModalController,
  ActionSheetController,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  checkmarkCircleOutline,
  copyOutline,
  clipboardOutline,
  createOutline,
  trashOutline,
  addOutline,
  todayOutline,
  sparklesOutline,
  globeOutline,
  settingsOutline,
  calendarOutline,
  gitCompareOutline,
  eyeOutline,
  eyeOffOutline,
  filterOutline,
  timeOutline,
  playOutline,
  refreshOutline
} from 'ionicons/icons';
import { Subject, takeUntil, forkJoin, firstValueFrom, catchError, of } from 'rxjs';
import { UserAvatarComponent } from '../../core/components/ui/user-avatar/user-avatar.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { ScheduleService } from './services/schedule.service';
import { WeekSchedule, EmployeeScheduleRow, ShiftCell, DayHeaderInfo } from './models/schedule.model';
import { ShiftService } from '../../core/services/shift.service';
import { UserService } from '../../core/services/user.service';
import { ClosureService } from '../../core/services/closure.service';
import { PublicationService, WeekSchedulePublicationDTO } from '../../core/services/publication.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { EmployeeShiftModalComponent } from '../employees/employee-shift-modal/employee-shift-modal.component';
import { ClosureConfigModalComponent } from './closure-config-modal/closure-config-modal.component';
import { DayClosureModalComponent } from './day-closure-modal/day-closure-modal.component';
import { ScheduleHistoryModalComponent } from './schedule-history-modal/schedule-history-modal.component';
import { ConfirmDeleteModalComponent } from '../../core/components/ui/confirm-delete-modal/confirm-delete-modal.component';
import { EmployeeShift, EmployeeShiftRequest, TypePoste } from '../../core/models/shift.model';

import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

export type DiffStatus = 'ADDED' | 'MODIFIED' | 'DELETED' | 'UNCHANGED';

export interface ShiftDiffInfo {
  status: DiffStatus;
  currentShift?: ShiftCell;
  publishedShift?: {
    typeShift?: string;
    heureDebut?: string;
    heureFin?: string;
    typePoste?: string;
  };
}

/**
 * Component presenting the weekly EDT schedule matrix with real API data,
 * establishment closed days protection, 1-click header holiday modal, drag-to-fill duplication, copy/paste support,
 * and schedule publication via REST + STOMP real-time notification with comparison diff mode.
 */
@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonSpinner,
    IonIcon,
    UserAvatarComponent,
    ActionButtonComponent
  ],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss']
})
export class ScheduleComponent implements OnInit, OnDestroy {
  private readonly scheduleService = inject(ScheduleService);
  private readonly shiftService = inject(ShiftService);
  private readonly userService = inject(UserService);
  private readonly closureService = inject(ClosureService);
  private readonly publicationService = inject(PublicationService);
  private readonly webSocketService = inject(WebSocketService);
  private readonly modalCtrl = inject(ModalController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translocoService = inject(TranslocoService);

  /** Eraser / Bulk deletion mode active */
  isDeleteMode = false;
  /** Set of shift IDs staged for deletion */
  readonly selectedShiftIds = new Set<number>();

  schedule: WeekSchedule | null = null;
  currentWeekStart!: Date;
  loading = true;
  private readonly destroy$ = new Subject<void>();

  /** Whether the current week's planning has been published by a manager. */
  isPublished = false;
  /** The publication record of the current week, if published. */
  publication: WeekSchedulePublicationDTO | null = null;

  /** Comparison mode between current schedule and last published version */
  isComparisonMode = false;
  /** Whether the schedule has been edited since publication */
  hasUnpublishedChanges = false;
  /** Diff summary statistics */
  diffAddedCount = 0;
  diffModifiedCount = 0;
  diffDeletedCount = 0;
  private readonly cellDiffMap = new Map<string, ShiftDiffInfo>();

  /** Time-Travel Historical Replay mode active */
  isReplayMode = false;
  /** Target historical instant T in ISO format (YYYY-MM-DDTHH:mm) for datetime-local input */
  replayTimestamp = '';
  /** Reconstructed schedule at instant T */
  replaySchedule: WeekSchedule | null = null;
  /** Replay vs Active schedule comparison mode active */
  isReplayComparisonMode = false;
  /** Diff statistics for replay vs current schedule */
  replayDiffAddedCount = 0;
  replayDiffModifiedCount = 0;
  replayDiffDeletedCount = 0;
  private readonly replayCellDiffMap = new Map<string, ShiftDiffInfo>();

  get totalDiffCount(): number {
    return this.diffAddedCount + this.diffModifiedCount + this.diffDeletedCount;
  }

  get totalReplayDiffCount(): number {
    return this.replayDiffAddedCount + this.replayDiffModifiedCount + this.replayDiffDeletedCount;
  }

  get displaySchedule(): WeekSchedule | null {
    return this.isReplayMode && this.replaySchedule ? this.replaySchedule : this.schedule;
  }

  // Copy & Paste buffer
  copiedShift: EmployeeShift | null = null;

  // Drag-to-fill duplication state
  isDragging = false;
  dragSource: { emp: EmployeeScheduleRow; dayIndex: number; shift: ShiftCell } | null = null;
  dragTargets: { emp: EmployeeScheduleRow; dayIndex: number; shift: ShiftCell }[] = [];
  hoveredCell: { emp: EmployeeScheduleRow; shift: ShiftCell } | null = null;

  constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      checkmarkCircleOutline,
      copyOutline,
      clipboardOutline,
      createOutline,
      trashOutline,
      addOutline,
      todayOutline,
      sparklesOutline,
      globeOutline,
      settingsOutline,
      calendarOutline,
      gitCompareOutline,
      eyeOutline,
      eyeOffOutline,
      filterOutline,
      timeOutline,
      playOutline,
      refreshOutline
    });
    this.currentWeekStart = this.scheduleService.getMonday(new Date());
  }

  /** Selected role filter: 'ALL' | 'BARMAN' | 'SERVEUR' | 'MANAGER' | 'ADMIN' */
  selectedRoleFilter = 'ALL';

  /** Whether to hide employees with 0 scheduled hours in the current week */
  hideEmptyEmployees = false;

  /**
   * Returns the list of employees filtered by role and active status.
   */
  get filteredEmployees(): EmployeeScheduleRow[] {
    const current = this.displaySchedule;
    if (!current?.employees) return [];
    return current.employees.filter((emp) => {
      // Role filter
      if (this.selectedRoleFilter !== 'ALL' && emp.role !== this.selectedRoleFilter) {
        return false;
      }
      // Empty shifts filter
      if (this.hideEmptyEmployees && this.getEmployeeTotalHours(emp) === 0) {
        return false;
      }
      return true;
    });
  }

  /**
   * Calculates the total scheduled hours for an employee row in the current week.
   *
   * @param emp - The employee row whose hours to sum.
   * @returns Total planned hours as a rounded number.
   */
  getEmployeeTotalHours(emp: EmployeeScheduleRow): number {
    if (!emp?.shifts) return 0;
    return emp.shifts.reduce((sum, cell) => {
      if (cell.isClosed || !cell.startTime) return sum;
      if (cell.rawShift?.heuresPrevues) return sum + Number(cell.rawShift.heuresPrevues);
      if (cell.rawShift?.heuresEffectuees) return sum + Number(cell.rawShift.heuresEffectuees);
      if (cell.startTime && cell.endTime) {
        const [h1, m1] = cell.startTime.split(':').map(Number);
        const [h2, m2] = cell.endTime.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 24 * 60;
        return sum + Math.round((diff / 60) * 10) / 10;
      }
      return sum;
    }, 0);
  }

  /**
   * Sets the role filter for the schedule grid.
   *
   * @param role - The role to filter by ('ALL', 'BARMAN', 'SERVEUR', 'MANAGER', 'ADMIN').
   */
  setRoleFilter(role: string): void {
    this.selectedRoleFilter = role;
  }

  /**
   * Toggles the visibility of employees with zero scheduled hours.
   */
  toggleHideEmptyEmployees(): void {
    this.hideEmptyEmployees = !this.hideEmptyEmployees;
  }

  ngOnInit(): void {
    this.loadSchedule();
    this.subscribeToPublicationEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads both the week schedule and its publication state in parallel.
   * Uses forkJoin to ensure both responses are available before updating the component
   * state, preventing the race condition where the comparison button would disappear
   * when switching weeks.
   */
  loadSchedule(): void {
    this.loading = true;
    const weekStartISO = this.formatDateIso(this.currentWeekStart);

    forkJoin({
      schedule: this.scheduleService.getWeekSchedule(this.currentWeekStart),
      publication: this.publicationService.getPublication(weekStartISO).pipe(catchError(() => of(null)))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ schedule, publication }) => {
          this.schedule = schedule;
          this.publication = publication;
          this.isPublished = publication !== null;
          this.loading = false;
          this.calculateScheduleDifferences();
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  /**
   * Subscribes to STOMP topic /topic/schedule/published.
   * Updates the publication state in real time when another manager publishes.
   */
  private subscribeToPublicationEvents(): void {
    this.webSocketService.watch('/topic/schedule/published')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const pub: WeekSchedulePublicationDTO = JSON.parse(msg.body);
          // Only update if this event concerns the currently displayed week
          if (pub.weekStart === this.formatDateIso(this.currentWeekStart)) {
            this.publication = pub;
            this.isPublished = true;
            this.calculateScheduleDifferences();
          }
        } catch {
          // Ignore malformed WS messages
        }
      });
  }

  /**
   * Recalculates diffs between current schedule shifts and the published snapshot.
   */
  calculateScheduleDifferences(): void {
    this.cellDiffMap.clear();
    this.diffAddedCount = 0;
    this.diffModifiedCount = 0;
    this.diffDeletedCount = 0;

    if (!this.publication?.snapshotJson || !this.schedule) {
      this.hasUnpublishedChanges = false;
      return;
    }

    const publishedMap = this.parsePublishedShifts(this.publication.snapshotJson);
    const seenKeys = new Set<string>();
    const activeEmployeeIds = new Set(this.schedule.employees.map(e => String(e.employeeId)));

    for (const emp of this.schedule.employees) {
      for (const shift of emp.shifts) {
        const key = `${emp.employeeId}_${shift.date}`;
        seenKeys.add(key);
        this.compareCellWithPublication(key, shift, publishedMap.get(key));
      }
    }

    for (const [key, pub] of publishedMap.entries()) {
      const [uId, dateStr] = key.split('_');
      const isClosedDay = Boolean(this.schedule?.closedDays?.[dateStr]);
      if (!isClosedDay && activeEmployeeIds.has(uId) && !seenKeys.has(key)) {
        this.recordDeletedDiff(key, pub);
      }
    }

    this.hasUnpublishedChanges = this.totalDiffCount > 0;
  }

  private normalizeDate(dStr: any): string {
    if (!dStr) return '';
    if (Array.isArray(dStr)) {
      const y = dStr[0];
      const m = String(dStr[1]).padStart(2, '0');
      const d = String(dStr[2]).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof dStr === 'object' && dStr !== null) {
      const y = dStr.year;
      const m = String(dStr.monthValue || dStr.month).padStart(2, '0');
      const d = String(dStr.dayOfMonth || dStr.day).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(dStr).trim().split('T')[0];
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return str;
  }

  private parsePublishedShifts(snapshotJson: string): Map<string, any> {
    const map = new Map<string, any>();
    if (!snapshotJson || snapshotJson === '[]') return map;
    try {
      const parsed = JSON.parse(snapshotJson);
      if (Array.isArray(parsed)) {
        for (const ps of parsed) {
          const uId = ps.userId || ps.user?.id || ps.user_id || ps.employeeId || ps.employee_id;
          const dateStr = this.normalizeDate(ps.dateShift || ps.date_shift || ps.date);
          if (uId && dateStr) {
            map.set(`${uId}_${dateStr}`, ps);
          }
        }
      }
    } catch {
      // Empty map on parse failure
    }
    return map;
  }

  private normalizeTime(t?: string): string {
    if (!t) return '';
    const parts = t.trim().split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return t.trim();
  }

  private compareCellWithPublication(key: string, shift: ShiftCell, pub?: any): void {
    if (shift.isClosed) {
      this.cellDiffMap.set(key, { status: 'UNCHANGED', currentShift: shift });
      return;
    }

    const hasCurrent = Boolean(shift.rawShift && shift.startTime);
    const pubStart = this.normalizeTime(pub?.heureDebut || pub?.startTime || pub?.heure_debut || pub?.start_time);
    const hasPub = Boolean(pub && pubStart);

    if (hasCurrent && !hasPub) {
      this.cellDiffMap.set(key, { status: 'ADDED', currentShift: shift });
      this.diffAddedCount++;
    } else if (hasCurrent && hasPub) {
      this.checkModifiedDiff(key, shift, pub);
    } else if (!hasCurrent && hasPub) {
      this.recordDeletedDiff(key, pub);
    } else {
      this.cellDiffMap.set(key, { status: 'UNCHANGED', currentShift: shift });
    }
  }

  private checkModifiedDiff(key: string, shift: ShiftCell, pub: any): void {
    const pubStart = this.normalizeTime(pub.heureDebut || pub.startTime || pub.heure_debut || pub.start_time);
    const pubEnd = this.normalizeTime(pub.heureFin || pub.endTime || pub.heure_fin || pub.end_time);
    const pubType = (pub.typeShift || pub.type_shift || pub.type || '').toString().toUpperCase();

    const currentStart = this.normalizeTime(shift.startTime);
    const currentEnd = this.normalizeTime(shift.endTime);
    const currentType = (shift.typeShift || shift.rawShift?.typeShift || '').toString().toUpperCase();

    const isModified =
      (pubStart && currentStart !== pubStart) ||
      (pubEnd && currentEnd !== pubEnd) ||
      (pubType && currentType && pubType !== currentType);

    if (isModified) {
      this.cellDiffMap.set(key, {
        status: 'MODIFIED',
        currentShift: shift,
        publishedShift: { heureDebut: pubStart, heureFin: pubEnd, typeShift: pubType }
      });
      this.diffModifiedCount++;
    } else {
      this.cellDiffMap.set(key, { status: 'UNCHANGED', currentShift: shift });
    }
  }

  private recordDeletedDiff(key: string, pub: any): void {
    const pubStart = this.normalizeTime(pub.heureDebut || pub.startTime || pub.heure_debut || pub.start_time);
    const pubEnd = this.normalizeTime(pub.heureFin || pub.endTime || pub.heure_fin || pub.end_time);
    const pubType = (pub.typeShift || pub.type_shift || pub.type || '').toString().toUpperCase();
    this.cellDiffMap.set(key, {
      status: 'DELETED',
      publishedShift: {
        heureDebut: pubStart,
        heureFin: pubEnd,
        typeShift: pubType
      }
    });
    this.diffDeletedCount++;
  }

  /**
   * Retrieves the diff info for a specific cell.
   */
  getCellDiff(employeeId: number, dateIso: string): ShiftDiffInfo | undefined {
    if (this.isReplayMode && this.isReplayComparisonMode) {
      return this.replayCellDiffMap.get(`${employeeId}_${dateIso}`);
    }
    return this.cellDiffMap.get(`${employeeId}_${dateIso}`);
  }

  /**
   * Toggles the diff comparison view.
   */
  toggleComparisonMode(): void {
    this.isComparisonMode = !this.isComparisonMode;
  }

  /**
   * Opens the weekly audit log modal for shift modifications and time-travel replay.
   */
  async openScheduleHistoryModal(): Promise<void> {
    const weekStartISO = this.formatDateIso(this.currentWeekStart);
    const modal = await this.modalCtrl.create({
      component: ScheduleHistoryModalComponent,
      componentProps: {
        weekISO: weekStartISO
      },
      cssClass: 'schedule-history-modal-container'
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.action === 'replay' && data.timestamp) {
      this.startReplay(data.timestamp);
    }
  }

  /**
   * Initiates historical time-travel replay mode for the current week at instant T.
   *
   * @param isoDateTime Optional ISO timestamp to initialize replay
   */
  startReplay(isoDateTime?: string): void {
    this.isReplayMode = true;
    this.isDeleteMode = false;
    this.selectedShiftIds.clear();
    if (isoDateTime) {
      this.replayTimestamp = isoDateTime.substring(0, 16);
    } else {
      const now = new Date();
      this.replayTimestamp = now.toISOString().substring(0, 16);
    }
    this.loadReplaySchedule();
  }

  /**
   * Loads the reconstructed weekly schedule at timestamp T from the backend API.
   */
  loadReplaySchedule(): void {
    if (!this.replayTimestamp) return;
    this.loading = true;
    const isoParam = this.replayTimestamp.length === 16 ? `${this.replayTimestamp}:00` : this.replayTimestamp;
    this.scheduleService.getWeekScheduleAt(this.currentWeekStart, isoParam)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reconstructed) => {
          this.replaySchedule = reconstructed;
          this.loading = false;
          if (this.isReplayComparisonMode) {
            this.calculateReplayDifferences();
          }
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  /**
   * Handles change in the datetime-local input during replay mode.
   */
  onReplayTimestampChange(): void {
    this.loadReplaySchedule();
  }

  /**
   * Exits historical time-travel replay mode and restores the active schedule view.
   */
  exitReplayMode(): void {
    this.isReplayMode = false;
    this.replaySchedule = null;
    this.isReplayComparisonMode = false;
    this.replayCellDiffMap.clear();
    this.replayDiffAddedCount = 0;
    this.replayDiffModifiedCount = 0;
    this.replayDiffDeletedCount = 0;
  }

  /**
   * Toggles diff comparison between the historical replay at instant T and the current active schedule.
   */
  toggleReplayComparison(): void {
    this.isReplayComparisonMode = !this.isReplayComparisonMode;
    if (this.isReplayComparisonMode) {
      this.calculateReplayDifferences();
    } else {
      this.replayCellDiffMap.clear();
      this.replayDiffAddedCount = 0;
      this.replayDiffModifiedCount = 0;
      this.replayDiffDeletedCount = 0;
    }
  }

  /**
   * Calculates differences between historical replay shifts (at instant T) and the current active schedule.
   */
  calculateReplayDifferences(): void {
    this.replayCellDiffMap.clear();
    this.replayDiffAddedCount = 0;
    this.replayDiffModifiedCount = 0;
    this.replayDiffDeletedCount = 0;

    if (!this.schedule || !this.replaySchedule) return;

    const historicalMap = this.buildShiftCellMap(this.replaySchedule);
    const currentMap = this.buildShiftCellMap(this.schedule);
    const allKeys = new Set<string>([...historicalMap.keys(), ...currentMap.keys()]);

    for (const key of allKeys) {
      this.compareReplayCell(key, historicalMap.get(key), currentMap.get(key));
    }
  }

  private buildShiftCellMap(weekSchedule: WeekSchedule): Map<string, ShiftCell> {
    const map = new Map<string, ShiftCell>();
    for (const emp of weekSchedule.employees) {
      for (const shift of emp.shifts) {
        if (shift.startTime && !shift.isClosed) {
          map.set(`${emp.employeeId}_${shift.date}`, shift);
        }
      }
    }
    return map;
  }

  private compareReplayCell(key: string, hist?: ShiftCell, curr?: ShiftCell): void {
    if (!hist && curr) {
      this.replayCellDiffMap.set(key, { status: 'ADDED', currentShift: curr });
      this.replayDiffAddedCount++;
    } else if (hist && !curr) {
      this.replayCellDiffMap.set(key, {
        status: 'DELETED',
        publishedShift: { heureDebut: hist.startTime, heureFin: hist.endTime, typeShift: hist.typeShift }
      });
      this.replayDiffDeletedCount++;
    } else if (hist && curr) {
      this.checkReplayModified(key, hist, curr);
    }
  }

  private checkReplayModified(key: string, hist: ShiftCell, curr: ShiftCell): void {
    const isModified =
      hist.startTime !== curr.startTime ||
      hist.endTime !== curr.endTime ||
      hist.typeShift !== curr.typeShift;

    if (isModified) {
      this.replayCellDiffMap.set(key, {
        status: 'MODIFIED',
        currentShift: curr,
        publishedShift: { heureDebut: hist.startTime, heureFin: hist.endTime, typeShift: hist.typeShift }
      });
      this.replayDiffModifiedCount++;
    } else {
      this.replayCellDiffMap.set(key, { status: 'UNCHANGED', currentShift: curr });
    }
  }

  /**
   * Publishes the current week's planning via REST and shows a confirmation toast.
   * Triggers a STOMP broadcast to all connected users.
   */
  async publishSchedule(): Promise<void> {
    const weekStartISO = this.formatDateIso(this.currentWeekStart);
    this.publicationService.publishWeek(weekStartISO)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (pub) => {
          // 1. Reload the schedule first so calculateScheduleDifferences
          //    compares the fresh snapshot against the fresh shifts
          this.scheduleService.getWeekSchedule(this.currentWeekStart)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: async (data) => {
                this.schedule = data;
                // 2. Now update publication state — both sides are in sync
                this.publication = pub;
                this.isPublished = true;
                this.hasUnpublishedChanges = false;
                this.cellDiffMap.clear();
                this.diffAddedCount = 0;
                this.diffModifiedCount = 0;
                this.diffDeletedCount = 0;
                const publishedDate = new Date(pub.publishedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                const toast = await this.toastCtrl.create({
                  message: `✅ Planning de la semaine publié — ${publishedDate} par ${pub.publishedBy}`,
                  duration: 4000,
                  color: 'success'
                });
                await toast.present();
              }
            });
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors de la publication du planning',
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  /**
   * Formats a Date object to an ISO date string (yyyy-MM-dd).
   */
  private formatDateIso(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  prevWeek(): void {
    const d = new Date(this.currentWeekStart);
    d.setDate(d.getDate() - 7);
    this.currentWeekStart = d;
    this.loadSchedule();
  }

  nextWeek(): void {
    const d = new Date(this.currentWeekStart);
    d.setDate(d.getDate() + 7);
    this.currentWeekStart = d;
    this.loadSchedule();
  }

  goToCurrentWeek(): void {
    this.currentWeekStart = this.scheduleService.getMonday(new Date());
    this.loadSchedule();
  }

  get weekLabel(): string {
    const endDate = new Date(this.currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    const lang = this.translocoService.getActiveLang();
    const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const start = this.currentWeekStart.toLocaleDateString(locale, opts);
    const end = endDate.toLocaleDateString(locale, { ...opts, year: 'numeric' });
    return this.translocoService.translate('SHIFTS.WEEK_LABEL', { start, end });
  }

  getDayHeaders(): DayHeaderInfo[] {
    const lang = this.translocoService.getActiveLang();
    const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.currentWeekStart);
      d.setDate(d.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const dateISO = `${year}-${month}-${dateNum}`;

      // Localized short day name (e.g. "lun." -> "LUN" in FR, "Mon" -> "MON" in EN)
      let dayName = d.toLocaleDateString(locale, { weekday: 'short' });
      dayName = dayName.replace('.', '').toUpperCase();

      const closureReason = this.displaySchedule?.closedDays?.[dateISO];
      return {
        day: dayName,
        date: String(d.getDate()),
        dateISO,
        isClosed: Boolean(closureReason),
        closureReason
      };
    });
  }

  isToday(dayIndex: number): boolean {
    const d = new Date(this.currentWeekStart);
    d.setDate(d.getDate() + dayIndex);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }

  getShiftColorClass(shift: ShiftCell): string {
    if (shift.isClosed || shift.type === 'CLOSED') {
      return 'shift--closed';
    }
    switch (shift.type) {
      case 'MANAGER':
        return 'shift--manager';
      case 'WAITER':
        return 'shift--waiter';
      case 'BARTENDER':
        return 'shift--bartender';
      case 'DAY_OFF':
        return 'shift--dayoff';
      default:
        return 'shift--empty';
    }
  }

  /**
   * Opens high-end DayClosureModalComponent when clicking a date in the header row.
   */
  async onHeaderDayClick(header: DayHeaderInfo): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: DayClosureModalComponent,
      componentProps: {
        dateISO: header.dateISO,
        isClosed: header.isClosed,
        closureReason: header.closureReason
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (!data) return;

    if (data.action === 'close') {
      this.closeEstablishmentOnDate(data.startDate || header.dateISO, data.endDate, data.reason, data.isAnnualRecurring);
    } else if (data.action === 'reopen') {
      this.reopenEstablishmentOnDate(header);
    }
  }

  private closeEstablishmentOnDate(startDateISO: string, endDateISO: string | undefined, reason: string, isAnnualRecurring = false): void {
    this.closureService
      .createClosure({
        type: 'EXCEPTIONAL',
        closureDate: startDateISO,
        endDate: endDateISO,
        isAnnualRecurring,
        reason
      })
      .subscribe({
        next: async () => {
          this.loadSchedule();
          const rangeLabel = endDateISO ? `du ${startDateISO} au ${endDateISO}` : `du ${startDateISO}`;
          const toast = await this.toastCtrl.create({
            message: `Période de fermeture enregistrée (${rangeLabel} : ${reason})`,
            duration: 3000,
            color: 'warning'
          });
          await toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors de la fermeture de la journée',
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  private reopenEstablishmentOnDate(header: DayHeaderInfo): void {
    this.closureService.getClosures().subscribe({
      next: (closures) => {
        const dayOfWeekNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        const daysName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayIdx = daysName.indexOf(header.day);
        const dayOfWeek = dayIdx >= 0 ? dayOfWeekNames[dayIdx] : null;

        const targetClosure = closures.find((c) => {
          if (c.type === 'EXCEPTIONAL' && c.closureDate) {
            if (c.closureDate === header.dateISO) return true;
            if (c.isAnnualRecurring && c.closureDate.substring(5) === header.dateISO.substring(5)) return true;
          }
          if (c.type === 'WEEKLY_RECURRING' && c.dayOfWeek && c.dayOfWeek === dayOfWeek) return true;
          return false;
        });

        if (targetClosure) {
          this.closureService.deleteClosure(targetClosure.id).subscribe({
            next: async () => {
              this.loadSchedule();
              const toast = await this.toastCtrl.create({
                message: `Établissement rouvert pour la journée du ${header.dateISO}`,
                duration: 2500,
                color: 'success'
              });
              await toast.present();
            },
            error: async () => {
              const toast = await this.toastCtrl.create({
                message: 'Erreur lors de la réouverture',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            }
          });
        }
      }
    });
  }

  // ── Drag-to-Fill Duplication & Drag-to-Delete Handlers ──

  wasDraggingMultiple = false;

  onCellMouseDown(emp: EmployeeScheduleRow, shift: ShiftCell, dayIndex: number, event: MouseEvent): void {
    if (event.button !== 0 || this.isReplayMode) return; // Left-click only, disabled in replay
    if (shift.isClosed) {
      if (!this.isDeleteMode) {
        this.showClosedDayNotice(shift);
      }
      return;
    }

    this.wasDraggingMultiple = false;

    if (this.isDeleteMode) {
      this.isDragging = true;
      this.dragSource = { emp, dayIndex, shift };
      this.dragTargets = [this.dragSource];
      return;
    }

    if (!shift.rawShift) return; // Requires valid shift to duplicate

    this.isDragging = true;
    this.dragSource = { emp, dayIndex, shift };
    this.dragTargets = [this.dragSource];
  }

  private extractCellShiftIds(cell?: ShiftCell): number[] {
    if (!cell) return [];
    if (cell.shiftIds && cell.shiftIds.length > 0) {
      return cell.shiftIds;
    }
    if (cell.rawShift?.id != null) {
      return [cell.rawShift.id];
    }
    return [];
  }

  private computeDragSelectionTargets(emp: EmployeeScheduleRow, dayIndex: number): { emp: EmployeeScheduleRow; dayIndex: number; shift: ShiftCell }[] {
    if (!this.dragSource || !this.schedule) return [];

    const sourceEmpIndex = this.schedule.employees.findIndex((e) => e.employeeId === this.dragSource!.emp.employeeId);
    const currentEmpIndex = this.schedule.employees.findIndex((e) => e.employeeId === emp.employeeId);

    const minEmp = Math.min(sourceEmpIndex, currentEmpIndex);
    const maxEmp = Math.max(sourceEmpIndex, currentEmpIndex);
    const minDay = Math.min(this.dragSource.dayIndex, dayIndex);
    const maxDay = Math.max(this.dragSource.dayIndex, dayIndex);

    const targets: { emp: EmployeeScheduleRow; dayIndex: number; shift: ShiftCell }[] = [];

    for (let r = minEmp; r <= maxEmp; r++) {
      const row = this.schedule.employees[r];
      for (let c = minDay; c <= maxDay; c++) {
        const cell = row.shifts[c];
        if (!cell.isClosed) {
          targets.push({ emp: row, dayIndex: c, shift: cell });
        }
      }
    }
    return targets;
  }

  onCellMouseEnter(emp: EmployeeScheduleRow, shift: ShiftCell, dayIndex: number): void {
    this.hoveredCell = { emp, shift };

    if (!this.isDragging || !this.dragSource || !this.schedule) return;

    const targets = this.computeDragSelectionTargets(emp, dayIndex);

    if (this.isDeleteMode) {
      for (const target of targets) {
        const ids = this.extractCellShiftIds(target.shift);
        ids.forEach((id) => this.selectedShiftIds.add(id));
      }
    }

    if (targets.length > 1) {
      this.wasDraggingMultiple = true;
    }

    this.dragTargets = targets;
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    if (this.isDragging && !this.isDeleteMode) {
      this.executeDragDuplication();
    }
    this.isDragging = false;
    this.dragSource = null;
    this.dragTargets = [];
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent): void {
    if (this.isInputElementFocused(event) || this.isOverlayActive()) return;

    if (this.isDeleteMode) {
      this.handleDeleteModeKey(event);
      return;
    }

    if (!this.hoveredCell) return;

    if (event.ctrlKey || event.metaKey) {
      this.handleClipboardKey(event);
    } else if (this.isDeleteKey(event.key)) {
      this.handleHoveredShiftDeletion(event);
    }
  }

  private isInputElementFocused(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    return !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  }

  private isOverlayActive(): boolean {
    return !!document.querySelector('ion-alert, ion-modal.modal-default');
  }

  private handleDeleteModeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.toggleDeleteMode();
    } else if ((this.isDeleteKey(event.key) || event.key === 'Enter') && this.selectedShiftIds.size > 0) {
      event.preventDefault();
      this.confirmBulkDelete();
    }
  }

  private handleClipboardKey(event: KeyboardEvent): void {
    if (!this.hoveredCell) return;
    if (event.key === 'c' || event.key === 'C') {
      event.preventDefault();
      this.copyShift(this.hoveredCell.shift);
    } else if (event.key === 'v' || event.key === 'V') {
      event.preventDefault();
      this.pasteShift(this.hoveredCell.emp, this.hoveredCell.shift);
    }
  }

  private isDeleteKey(key: string): boolean {
    return key === 'Delete' || key === 'Backspace' || key === 'Del';
  }

  private handleHoveredShiftDeletion(event: KeyboardEvent): void {
    const shiftId = this.hoveredCell?.shift.rawShift?.id;
    if (shiftId) {
      event.preventDefault();
      this.confirmDeleteShift(shiftId);
    }
  }

  isCellDragTarget(empId: number, dayIndex: number): boolean {
    return this.dragTargets.some((t) => t.emp.employeeId === empId && t.dayIndex === dayIndex);
  }

  private executeDragDuplication(): void {
    if (!this.dragSource?.shift.rawShift) return;

    const sourceShift = this.dragSource.shift.rawShift;
    const targetsToCreate = this.dragTargets.filter(
      (t) => !(t.emp.employeeId === this.dragSource!.emp.employeeId && t.dayIndex === this.dragSource!.dayIndex) && !t.shift.isClosed
    );

    if (targetsToCreate.length === 0) return;

    const requests = targetsToCreate.map((t) => {
      const req: EmployeeShiftRequest = {
        userId: t.emp.employeeId,
        dateShift: t.shift.date,
        typeShift: sourceShift.typeShift,
        typePoste: sourceShift.typePoste || ('SERVEUR' as TypePoste),
        heureDebut: sourceShift.heureDebut,
        heureFin: sourceShift.heureFin,
        dureePauseMinutes: sourceShift.dureePauseMinutes || 30,
        heuresPrevues: sourceShift.heuresPrevues || 7.5,
        notes: `Dupliqué par glisser-déposer`
      };
      if (t.shift.rawShift?.id) {
        return this.shiftService.updateShift(t.shift.rawShift.id, req);
      }
      return this.shiftService.createShift(req);
    });

    this.loading = true;
    forkJoin(requests).subscribe({
      next: async () => {
        this.loadSchedule();
        const toast = await this.toastCtrl.create({
          message: `${requests.length} créneaux dupliqués avec succès`,
          duration: 2500,
          color: 'success'
        });
        await toast.present();
      },
      error: async () => {
        this.loading = false;
        const toast = await this.toastCtrl.create({
          message: `Erreur lors de la duplication en masse`,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  // ── Cell Click & Action Handlers ──

  /**
   * Toggles the eraser / bulk deletion mode.
   */
  toggleDeleteMode(): void {
    this.isDeleteMode = !this.isDeleteMode;
    if (!this.isDeleteMode) {
      this.selectedShiftIds.clear();
    }
  }

  /**
   * Toggles shift ID(s) in the deletion selection.
   */
  toggleShiftSelection(shiftOrId: ShiftCell | number): void {
    const ids = typeof shiftOrId === 'number' ? [shiftOrId] : this.extractCellShiftIds(shiftOrId);
    if (ids.length === 0) return;

    const anySelected = ids.some((id) => this.selectedShiftIds.has(id));
    if (anySelected) {
      ids.forEach((id) => this.selectedShiftIds.delete(id));
    } else {
      ids.forEach((id) => this.selectedShiftIds.add(id));
    }
  }

  /**
   * Checks whether a shift is marked for bulk deletion.
   */
  isShiftSelected(shiftOrId?: ShiftCell | number): boolean {
    if (!shiftOrId) return false;
    if (typeof shiftOrId === 'number') {
      return this.selectedShiftIds.has(shiftOrId);
    }
    const ids = this.extractCellShiftIds(shiftOrId);
    return ids.some((id) => this.selectedShiftIds.has(id));
  }

  /**
   * Clears the current delete staging selection.
   */
  clearDeleteSelection(): void {
    this.selectedShiftIds.clear();
  }

  /**
   * Handles click on a schedule grid cell.
   * - Empty cell: opens the shift creation form pre-filled with the employee and date.
   * - Cell with shift: opens the employee shift modal in edit mode.
   * - Closed day: shows a notice toast.
   * - Delete mode: toggles shift selection.
   */
  onCellClick(emp: EmployeeScheduleRow, shift: ShiftCell): void {
    if (this.isReplayMode) {
      this.toastCtrl.create({
        message: this.translocoService.translate('SHIFTS.REPLAY.READ_ONLY_NOTICE'),
        duration: 2500,
        color: 'warning'
      }).then((t) => t.present());
      return;
    }

    if (this.isDeleteMode) {
      if (this.wasDraggingMultiple) {
        this.wasDraggingMultiple = false;
        return;
      }
      this.toggleShiftSelection(shift);
      return;
    }

    if (shift.isClosed) {
      this.showClosedDayNotice(shift);
      return;
    }

    if (this.dragTargets.length > 1 || this.wasDraggingMultiple) {
      this.wasDraggingMultiple = false;
      return;
    }

    if (!shift.startTime) {
      // Empty cell: open creation form pre-filled with the employee and date
      this.openCreateShiftModal(emp, shift.date);
    } else {
      // Cell with shift: open list/edit modal for this employee
      this.openEmployeeModalForUser(emp.employeeId);
    }
  }

  /**
   * Handles click on the employee header (avatar/name column).
   * Opens the employee shift list modal for the selected employee.
   *
   * @param emp - The employee schedule row that was clicked.
   */
  onEmployeeHeaderClick(emp: EmployeeScheduleRow): void {
    this.openEmployeeModalForUser(emp.employeeId);
  }

  /**
   * Opens the shift creation form pre-filled with the given employee and date.
   *
   * @param emp - The employee for whom to create a shift.
   * @param dateISO - The ISO date string (yyyy-MM-dd) of the target cell.
   */
  async openCreateShiftModal(emp: EmployeeScheduleRow, dateISO: string): Promise<void> {
    const userObj = await firstValueFrom(this.userService.getUserById(emp.employeeId));
    if (!userObj) return;

    const modal = await this.modalCtrl.create({
      component: EmployeeShiftModalComponent,
      componentProps: {
        employee: userObj,
        initialDate: dateISO,
        openInCreateMode: true
      },
      cssClass: 'employee-shift-modal-container'
    });
    await modal.present();
    await modal.onWillDismiss();
    this.loadSchedule();
  }

  /**
   * Opens the single confirmation modal for all staged shifts before performing bulk deletion.
   */
  async confirmBulkDelete(): Promise<void> {
    if (this.selectedShiftIds.size === 0) return;

    const ids = Array.from(this.selectedShiftIds);
    const count = ids.length;

    const modal = await this.modalCtrl.create({
      component: ConfirmDeleteModalComponent,
      cssClass: 'auto-height-modal confirm-delete-dialog',
      componentProps: {
        title: this.translocoService.translate('SHIFTS.BULK_DELETE.CONFIRM_TITLE'),
        itemName: `${count} créneaux`,
        warningMessage: this.translocoService.translate('SHIFTS.BULK_DELETE.CONFIRM_MESSAGE', { count }),
        metaTags: [
          { icon: 'trash-outline', text: `${count} créneaux` }
        ],
        detailsSummary: [
          { label: this.translocoService.translate('SHIFTS.BULK_DELETE.SELECTED_COUNT', { count }), value: String(count) }
        ],
        confirmBtnText: this.translocoService.translate('SHIFTS.BULK_DELETE.CONFIRM_BUTTON', { count })
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.confirmed) {
      this.executeBulkDelete(ids);
    }
  }

  private executeBulkDelete(ids: number[]): void {
    if (!ids || ids.length === 0) return;

    this.loading = true;
    const deleteObservables = ids.map((id) => this.shiftService.deleteShift(id));

    forkJoin(deleteObservables).subscribe({
      next: async () => {
        this.selectedShiftIds.clear();
        this.isDeleteMode = false;
        this.loadSchedule();
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate('SHIFTS.BULK_DELETE.SUCCESS', { count: ids.length }),
          duration: 2500,
          color: 'success'
        });
        await toast.present();
      },
      error: async (err) => {
        console.error('Erreur bulk delete:', err);
        this.loading = false;
        this.loadSchedule();
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate('COMMON.ERROR'),
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  /**
   * Displays full action sheet menu on right-click or context menu trigger.
   */
  async openActionSheet(emp: EmployeeScheduleRow, shift: ShiftCell): Promise<void> {
    if (shift.isClosed) {
      this.showClosedDayNotice(shift);
      return;
    }

    const buttons: any[] = [];

    if (shift.rawShift?.id) {
      const shiftId = shift.rawShift.id;
      buttons.push(
        {
          text: 'Dupliquer sur le jour suivant',
          icon: 'copy-outline',
          handler: () => {
            this.duplicateShiftToNextDay(shift);
          }
        },
        {
          text: 'Copier le créneau',
          icon: 'copy-outline',
          handler: () => {
            this.copyShift(shift);
          }
        }
      );

      if (this.copiedShift) {
        buttons.push({
          text: 'Coller le créneau copié',
          icon: 'clipboard-outline',
          handler: () => {
            this.pasteShift(emp, shift);
          }
        });
      }

      buttons.push(
        {
          text: 'Menu navigateur standard (Shift + Clic droit)',
          icon: 'globe-outline',
          handler: () => {
            this.showBrowserMenuNotice();
          }
        },
        {
          text: 'Supprimer le créneau',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.confirmDeleteShift(shiftId);
          }
        }
      );
    } else {
      if (this.copiedShift) {
        buttons.push({
          text: 'Coller le créneau copié',
          icon: 'clipboard-outline',
          handler: () => {
            this.pasteShift(emp, shift);
          }
        });
      }

      buttons.push({
        text: 'Nouveau créneau',
        icon: 'add-outline',
        handler: () => {
          this.openEmployeeModalForUser(emp.employeeId);
        }
      });
    }

    buttons.push({
      text: 'Annuler',
      icon: 'close-outline',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: `Créneau de ${emp.name} (${shift.date})`,
      buttons
    });

    await actionSheet.present();
  }

  onContextMenu(event: MouseEvent, emp: EmployeeScheduleRow, shift: ShiftCell): void {
    if (event.shiftKey || this.isReplayMode) return;
    event.preventDefault();
    this.openActionSheet(emp, shift);
  }

  async copyShift(shift: ShiftCell): Promise<void> {
    if (shift.isClosed) {
      this.showClosedDayNotice(shift);
      return;
    }
    if (!shift.rawShift) {
      const toast = await this.toastCtrl.create({
        message: 'Aucun créneau à copier sur cette case',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    this.copiedShift = shift.rawShift;
    const toast = await this.toastCtrl.create({
      message: `Créneau de ${shift.startTime} - ${shift.endTime} copié dans le presse-papier`,
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }

  async pasteShift(emp: EmployeeScheduleRow, targetCell: ShiftCell): Promise<void> {
    if (targetCell.isClosed) {
      this.showClosedDayNotice(targetCell);
      return;
    }
    if (!this.copiedShift) {
      const toast = await this.toastCtrl.create({
        message: 'Aucun créneau dans le presse-papier à coller',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const req: EmployeeShiftRequest = {
      userId: emp.employeeId,
      dateShift: targetCell.date,
      typeShift: this.copiedShift.typeShift,
      typePoste: this.copiedShift.typePoste || ('SERVEUR' as TypePoste),
      heureDebut: this.copiedShift.heureDebut,
      heureFin: this.copiedShift.heureFin,
      dureePauseMinutes: this.copiedShift.dureePauseMinutes || 30,
      heuresPrevues: this.copiedShift.heuresPrevues || 7.5,
      notes: `Collé depuis le presse-papier`
    };

    const action$ = targetCell.rawShift?.id
      ? this.shiftService.updateShift(targetCell.rawShift.id, req)
      : this.shiftService.createShift(req);

    action$.subscribe({
      next: async () => {
        this.loadSchedule();
        const toast = await this.toastCtrl.create({
          message: `Créneau collé pour ${emp.name} le ${targetCell.date}`,
          duration: 2500,
          color: 'success'
        });
        await toast.present();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Erreur lors du collage du créneau',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  duplicateShiftToNextDay(shift: ShiftCell): void {
    if (!shift.rawShift) return;

    const sourceDate = new Date(shift.date);
    const nextDate = new Date(sourceDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dayNum = String(nextDate.getDate()).padStart(2, '0');
    const nextDateIso = `${year}-${month}-${dayNum}`;

    if (this.schedule?.closedDays?.[nextDateIso]) {
      this.showClosedDayNotice({ isClosed: true, closureReason: this.schedule.closedDays[nextDateIso], date: nextDateIso } as ShiftCell);
      return;
    }

    const req: EmployeeShiftRequest = {
      userId: shift.rawShift.userId,
      dateShift: nextDateIso,
      typeShift: shift.rawShift.typeShift,
      typePoste: shift.rawShift.typePoste,
      heureDebut: shift.rawShift.heureDebut,
      heureFin: shift.rawShift.heureFin,
      dureePauseMinutes: shift.rawShift.dureePauseMinutes,
      heuresPrevues: shift.rawShift.heuresPrevues,
      notes: `Dupliqué depuis le ${shift.date}`
    };

    this.shiftService.createShift(req).subscribe({
      next: async () => {
        this.loadSchedule();
        const toast = await this.toastCtrl.create({
          message: `Créneau dupliqué au ${nextDateIso}`,
          duration: 2500,
          color: 'success'
        });
        await toast.present();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: `Erreur lors de la duplication`,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async confirmDeleteShift(shiftId: number): Promise<void> {
    const shift = await firstValueFrom(this.shiftService.getShiftById(shiftId).pipe(catchError(() => of(null))));
    const dateStr = shift?.dateShift || '';
    const horaire = shift ? `${shift.heureDebut} - ${shift.heureFin}` : '';
    const empName = shift?.userName || (shift?.userNom ? `${shift.userPrenom || ''} ${shift.userNom || ''}`.trim() : '');

    const modal = await this.modalCtrl.create({
      component: ConfirmDeleteModalComponent,
      cssClass: 'auto-height-modal confirm-delete-dialog',
      componentProps: {
        title: this.translocoService.translate('SHIFTS.DELETE_SHIFT_TITLE'),
        itemName: dateStr ? `${dateStr} (${horaire})` : `Créneau #${shiftId}`,
        warningMessage: this.translocoService.translate('SHIFTS.CONFIRM_DELETE'),
        metaTags: [
          ...(dateStr ? [{ icon: 'calendar-outline', text: dateStr }] : []),
          ...(horaire ? [{ icon: 'time-outline', text: horaire }] : []),
          ...(empName ? [{ icon: 'person-outline', text: empName }] : [])
        ],
        detailsSummary: [
          ...(empName ? [{ label: this.translocoService.translate('SHIFTS.EMPLOYEE_LABEL'), value: empName }] : []),
          ...(dateStr ? [{ label: this.translocoService.translate('SHIFTS.DATE_LABEL'), value: dateStr }] : []),
          ...(horaire ? [{ label: this.translocoService.translate('SHIFTS.HOURS_LABEL'), value: horaire }] : [])
        ],
        confirmBtnText: this.translocoService.translate('COMMON.DELETE')
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.confirmed) {
      this.shiftService.deleteShift(shiftId).subscribe({
        next: async () => {
          this.loadSchedule();
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate('SHIFTS.DELETE_SUCCESS'),
            duration: 2500,
            color: 'success'
          });
          await toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate('COMMON.ERROR'),
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
        }
      });
    }
  }

  async openEmployeeModalForUser(userId: number): Promise<void> {
    const userObj = await firstValueFrom(this.userService.getUserById(userId));
    if (!userObj) return;

    const modal = await this.modalCtrl.create({
      component: EmployeeShiftModalComponent,
      componentProps: {
        employee: userObj
      },
      cssClass: 'employee-shift-modal-container'
    });
    await modal.present();
    await modal.onWillDismiss();
    this.loadSchedule();
  }

  async openClosureConfigModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ClosureConfigModalComponent
    });
    await modal.present();
    await modal.onWillDismiss();
    this.loadSchedule();
  }

  private async showClosedDayNotice(shift: ShiftCell): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: `Établissement fermé ce jour-là (${shift.closureReason || 'Fermeture'})`,
      duration: 3000,
      color: 'warning'
    });
    await toast.present();
  }

  private async showBrowserMenuNotice(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: 'Appuyez sur Shift + Clic droit pour ouvrir le menu navigateur direct',
      duration: 3000,
      color: 'info'
    });
    await toast.present();
  }

  trackByDay(index: number, item: DayHeaderInfo): string {
    return item.dateISO;
  }

  trackByEmployee(index: number, item: EmployeeScheduleRow): number {
    return item.employeeId;
  }
}
