import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonSpinner,
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
  gitCompareOutline
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
import { EmployeeShift, EmployeeShiftRequest, TypePoste } from '../../core/models/shift.model';

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
    TranslocoModule,
    IonSpinner,
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

  get totalDiffCount(): number {
    return this.diffAddedCount + this.diffModifiedCount + this.diffDeletedCount;
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
      gitCompareOutline
    });
    this.currentWeekStart = this.scheduleService.getMonday(new Date());
  }

  ngOnInit(): void {
    this.loadSchedule();
    this.subscribeToPublicationEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSchedule(): void {
    this.loading = true;
    this.scheduleService
      .getWeekSchedule(this.currentWeekStart)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.schedule = data;
          this.loading = false;
          this.calculateScheduleDifferences();
        },
        error: () => {
          this.loading = false;
        }
      });
    this.loadPublicationState();
  }

  /**
   * Fetches the current week's publication state from the backend.
   * Resets isPublished/publication when switching weeks.
   */
  private loadPublicationState(): void {
    const weekStartISO = this.formatDateIso(this.currentWeekStart);
    this.publicationService.getPublication(weekStartISO)
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$)
      )
      .subscribe(pub => {
        this.publication = pub;
        this.isPublished = pub !== null;
        this.calculateScheduleDifferences();
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

    for (const emp of this.schedule.employees) {
      for (const shift of emp.shifts) {
        const key = `${emp.employeeId}_${shift.date}`;
        seenKeys.add(key);
        this.compareCellWithPublication(key, shift, publishedMap.get(key));
      }
    }

    for (const [key, pub] of publishedMap.entries()) {
      if (!seenKeys.has(key)) {
        this.recordDeletedDiff(key, pub);
      }
    }

    this.hasUnpublishedChanges = this.totalDiffCount > 0;
  }

  private parsePublishedShifts(snapshotJson: string): Map<string, any> {
    const map = new Map<string, any>();
    if (!snapshotJson || snapshotJson === '[]') return map;
    try {
      const parsed = JSON.parse(snapshotJson);
      if (Array.isArray(parsed)) {
        for (const ps of parsed) {
          const uId = ps.userId || ps.user?.id;
          let dateStr = ps.dateShift || ps.date_shift || ps.date;
          if (Array.isArray(dateStr)) {
            const y = dateStr[0];
            const m = String(dateStr[1]).padStart(2, '0');
            const d = String(dateStr[2]).padStart(2, '0');
            dateStr = `${y}-${m}-${d}`;
          } else if (typeof dateStr === 'object' && dateStr !== null) {
            const y = dateStr.year;
            const m = String(dateStr.monthValue || dateStr.month).padStart(2, '0');
            const d = String(dateStr.dayOfMonth || dateStr.day).padStart(2, '0');
            dateStr = `${y}-${m}-${d}`;
          } else if (typeof dateStr === 'string') {
            dateStr = dateStr.split('T')[0];
          }
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
    const hasCurrent = Boolean(shift.rawShift && shift.startTime && !shift.isClosed);
    const pubStart = this.normalizeTime(pub?.heureDebut || pub?.startTime);
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
    const pubStart = this.normalizeTime(pub.heureDebut || pub.startTime);
    const pubEnd = this.normalizeTime(pub.heureFin || pub.endTime);
    const pubType = pub.typeShift;

    const currentStart = this.normalizeTime(shift.startTime);
    const currentEnd = this.normalizeTime(shift.endTime);
    const currentType = shift.typeShift || shift.rawShift?.typeShift;

    const isModified =
      currentStart !== pubStart ||
      currentEnd !== pubEnd ||
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
    const pubStart = this.normalizeTime(pub.heureDebut || pub.startTime);
    const pubEnd = this.normalizeTime(pub.heureFin || pub.endTime);
    this.cellDiffMap.set(key, {
      status: 'DELETED',
      publishedShift: {
        heureDebut: pubStart,
        heureFin: pubEnd,
        typeShift: pub.typeShift
      }
    });
    this.diffDeletedCount++;
  }

  /**
   * Retrieves the diff info for a specific cell.
   */
  getCellDiff(employeeId: number, dateIso: string): ShiftDiffInfo | undefined {
    return this.cellDiffMap.get(`${employeeId}_${dateIso}`);
  }

  /**
   * Toggles the diff comparison view.
   */
  toggleComparisonMode(): void {
    this.isComparisonMode = !this.isComparisonMode;
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
          this.publication = pub;
          this.isPublished = true;
          this.calculateScheduleDifferences();
          const publishedDate = new Date(pub.publishedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const toast = await this.toastCtrl.create({
            message: `✅ Planning de la semaine publié — ${publishedDate} par ${pub.publishedBy}`,
            duration: 4000,
            color: 'success'
          });
          await toast.present();
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
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const start = this.currentWeekStart.toLocaleDateString('fr-FR', opts);
    const end = endDate.toLocaleDateString('fr-FR', { ...opts, year: 'numeric' });
    return `Semaine du ${start} — ${end}`;
  }

  getDayHeaders(): DayHeaderInfo[] {
    const daysName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return daysName.map((day, i) => {
      const d = new Date(this.currentWeekStart);
      d.setDate(d.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const dateISO = `${year}-${month}-${dateNum}`;

      const closureReason = this.schedule?.closedDays?.[dateISO];
      return {
        day,
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
    if (event.button !== 0) return; // Left-click only
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

  onCellMouseEnter(emp: EmployeeScheduleRow, shift: ShiftCell, dayIndex: number): void {
    this.hoveredCell = { emp, shift };

    if (!this.isDragging || !this.dragSource || !this.schedule) return;

    const sourceEmpIndex = this.schedule.employees.findIndex((e) => e.employeeId === this.dragSource!.emp.employeeId);
    const currentEmpIndex = this.schedule.employees.findIndex((e) => e.employeeId === emp.employeeId);

    const sourceDay = this.dragSource.dayIndex;
    const currentDay = dayIndex;

    const minEmp = Math.min(sourceEmpIndex, currentEmpIndex);
    const maxEmp = Math.max(sourceEmpIndex, currentEmpIndex);
    const minDay = Math.min(sourceDay, currentDay);
    const maxDay = Math.max(sourceDay, currentDay);

    const targets: { emp: EmployeeScheduleRow; dayIndex: number; shift: ShiftCell }[] = [];

    for (let r = minEmp; r <= maxEmp; r++) {
      const row = this.schedule.employees[r];
      for (let c = minDay; c <= maxDay; c++) {
        const cell = row.shifts[c];
        if (!cell.isClosed) {
          targets.push({ emp: row, dayIndex: c, shift: cell });
          if (this.isDeleteMode && cell.rawShift?.id) {
            this.selectedShiftIds.add(cell.rawShift.id);
          }
        }
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
   * Toggles shift ID in the deletion selection.
   */
  toggleShiftSelection(shiftId: number): void {
    if (this.selectedShiftIds.has(shiftId)) {
      this.selectedShiftIds.delete(shiftId);
    } else {
      this.selectedShiftIds.add(shiftId);
    }
  }

  /**
   * Checks whether a shift is marked for bulk deletion.
   */
  isShiftSelected(shiftId?: number): boolean {
    return shiftId != null && this.selectedShiftIds.has(shiftId);
  }

  /**
   * Clears the current delete staging selection.
   */
  clearDeleteSelection(): void {
    this.selectedShiftIds.clear();
  }

  onCellClick(emp: EmployeeScheduleRow, shift: ShiftCell): void {
    if (this.isDeleteMode) {
      if (this.wasDraggingMultiple) {
        this.wasDraggingMultiple = false;
        return;
      }
      if (shift.rawShift?.id) {
        this.toggleShiftSelection(shift.rawShift.id);
      }
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

    this.openEmployeeModalForUser(emp.employeeId);
  }

  /**
   * Opens the single confirmation alert for all staged shifts before performing bulk deletion.
   */
  async confirmBulkDelete(): Promise<void> {
    if (this.selectedShiftIds.size === 0) return;

    const ids = Array.from(this.selectedShiftIds);
    const count = ids.length;
    const title = this.translocoService.translate('SHIFTS.BULK_DELETE.CONFIRM_TITLE') || 'Confirmer la suppression groupée ?';
    const message = this.translocoService.translate('SHIFTS.BULK_DELETE.CONFIRM_MESSAGE', { count }) || `Voulez-vous vraiment supprimer définitivement ces ${count} créneaux de travail ?`;
    const deleteBtn = this.translocoService.translate('COMMON.DELETE') || 'Supprimer';
    const cancelBtn = this.translocoService.translate('COMMON.CANCEL') || 'Annuler';

    const alert = await this.alertCtrl.create({
      header: title,
      message: message,
      cssClass: 'openbar-alert',
      buttons: [
        { text: cancelBtn, role: 'cancel', cssClass: 'alert-button-cancel' },
        {
          text: `${deleteBtn} (${count})`,
          role: 'destructive',
          cssClass: 'alert-button-destructive',
          handler: () => {
            this.executeBulkDelete(ids);
          }
        }
      ]
    });
    await alert.present();
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
    if (event.shiftKey) return;
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

    this.shiftService.createShift(req).subscribe({
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
    const alert = await this.alertCtrl.create({
      header: 'Supprimer ce créneau ?',
      message: 'Voulez-vous vraiment supprimer définitivement ce créneau horaire ?',
      cssClass: 'openbar-alert',
      buttons: [
        { text: 'Annuler', role: 'cancel', cssClass: 'alert-button-cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          cssClass: 'alert-button-destructive',
          handler: () => {
            this.shiftService.deleteShift(shiftId).subscribe({
              next: async () => {
                this.loadSchedule();
                const toast = await this.toastCtrl.create({
                  message: 'Créneau supprimé avec succès',
                  duration: 2500,
                  color: 'success'
                });
                await toast.present();
              },
              error: async () => {
                const toast = await this.toastCtrl.create({
                  message: 'Erreur lors de la suppression',
                  duration: 3000,
                  color: 'danger'
                });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async openEmployeeModalForUser(userId: number): Promise<void> {
    const userObj = await firstValueFrom(this.userService.getUserById(userId));
    if (!userObj) return;

    const modal = await this.modalCtrl.create({
      component: EmployeeShiftModalComponent,
      componentProps: {
        employee: userObj
      }
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
