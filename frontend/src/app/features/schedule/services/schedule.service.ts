import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { WeekSchedule, EmployeeScheduleRow, ShiftCell } from '../models/schedule.model';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  // Mock data until backend endpoint is created
  getWeekSchedule(weekStart: Date): Observable<WeekSchedule> {
    const startStr = weekStart.toISOString().split('T')[0];
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6);
    const endStr = endDate.toISOString().split('T')[0];

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const mockEmployees: EmployeeScheduleRow[] = [
      this.createRow(1, 'Sophie M.', 'MANAGER', days, weekStart),
      this.createRow(2, 'Thomas D.', 'SERVEUR', days, weekStart),
      this.createRow(3, 'Camille R.', 'BARMAN', days, weekStart),
      this.createRow(4, 'Thomas D.', 'SERVEUR', days, weekStart),
      this.createRow(5, 'Camille R.', 'BARMAN', days, weekStart),
      this.createRow(6, 'Thomas D.', 'SERVEUR', days, weekStart),
      this.createRow(7, 'Camille R.', 'BARMAN', days, weekStart),
    ];

    return of({
      weekStart: startStr,
      weekEnd: endStr,
      employees: mockEmployees,
      totalHours: 163,
      totalEmployees: 7,
      activeEmployees: 5,
    });
  }

  private createRow(id: number, name: string, role: 'MANAGER' | 'SERVEUR' | 'BARMAN', days: string[], weekStart: Date): EmployeeScheduleRow {
    const typeMap: Record<string, ShiftCell['type']> = {
      MANAGER: 'MANAGER',
      SERVEUR: 'WAITER',
      BARMAN: 'BARTENDER',
    };
    const shifts: ShiftCell[] = days.map((day, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const isDayOff = Math.random() < 0.15;
      return {
        day,
        date: date.toISOString().split('T')[0],
        type: isDayOff ? 'DAY_OFF' : typeMap[role],
        startTime: isDayOff ? undefined : '09:00',
        endTime: isDayOff ? undefined : '17:00',
      };
    });
    return { employeeId: id, name, role, shifts };
  }

  getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
