import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { UserAvatarComponent } from '../../core/components/ui/user-avatar/user-avatar.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { ScheduleService } from './services/schedule.service';
import { WeekSchedule, EmployeeScheduleRow, ShiftCell } from './models/schedule.model';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    UserAvatarComponent, ActionButtonComponent,
  ],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss'],
})
export class ScheduleComponent implements OnInit, OnDestroy {
  schedule: WeekSchedule | null = null;
  currentWeekStart!: Date;
  loading = true;
  private readonly destroy$ = new Subject<void>();

  constructor(private scheduleService: ScheduleService) {
    addIcons({ chevronBackOutline, chevronForwardOutline, checkmarkCircleOutline });
    this.currentWeekStart = this.scheduleService.getMonday(new Date());
  }

  ngOnInit() {
    this.loadSchedule();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSchedule() {
    this.loading = true;
    this.scheduleService.getWeekSchedule(this.currentWeekStart)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: schedule => { this.schedule = schedule; this.loading = false; },
        error: () => { this.loading = false; },
      });
  }

  prevWeek() {
    this.currentWeekStart = new Date(this.currentWeekStart);
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.loadSchedule();
  }

  nextWeek() {
    this.currentWeekStart = new Date(this.currentWeekStart);
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
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

  getDayHeaders(): { day: string; date: number }[] {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
      const d = new Date(this.currentWeekStart);
      d.setDate(d.getDate() + i);
      return { day, date: d.getDate() };
    });
  }

  isToday(dayIndex: number): boolean {
    const d = new Date(this.currentWeekStart);
    d.setDate(d.getDate() + dayIndex);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }

  getShiftColorClass(shift: ShiftCell): string {
    switch (shift.type) {
      case 'MANAGER': return 'shift--manager';
      case 'WAITER': return 'shift--waiter';
      case 'BARTENDER': return 'shift--bartender';
      case 'DAY_OFF': return 'shift--dayoff';
      default: return 'shift--empty';
    }
  }

  trackByEmployee(_: number, row: EmployeeScheduleRow): number {
    return row.employeeId;
  }

  trackByDay(_: number, header: { day: string }): string {
    return header.day;
  }
}
