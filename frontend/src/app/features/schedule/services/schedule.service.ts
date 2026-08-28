import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, catchError, of } from 'rxjs';
import { WeekSchedule, EmployeeScheduleRow, ShiftCell } from '../models/schedule.model';
import { ShiftService } from '../../../core/services/shift.service';
import { UserService } from '../../../core/services/user.service';
import { ClosureService, EstablishmentClosure } from '../../../core/services/closure.service';
import { EmployeeShift, TypeShift } from '../../../core/models/shift.model';
import { User } from '../../../core/models/user.model';

/**
 * Service aggregating backend shift data, closures, and employee users into a 7-day weekly schedule matrix.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly shiftService = inject(ShiftService);
  private readonly userService = inject(UserService);
  private readonly closureService = inject(ClosureService);

  /**
   * Fetches real employees, real weekly shifts, and establishment closures from backend services for the target week.
   *
   * @param weekStart Monday Date of target week
   * @returns Observable WeekSchedule
   */
  getWeekSchedule(weekStart: Date): Observable<WeekSchedule> {
    const mondayDate = this.getMonday(weekStart);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(sundayDate.getDate() + 6);

    const startStr = this.formatDateIso(mondayDate);
    const endStr = this.formatDateIso(sundayDate);

    return forkJoin({
      users: this.userService.getUsers().pipe(catchError(() => of([] as User[]))),
      shifts: this.shiftService.getShiftsForWeek(startStr, endStr).pipe(catchError(() => of([] as EmployeeShift[]))),
      closures: this.closureService.getClosures().pipe(catchError(() => of([] as EstablishmentClosure[])))
    }).pipe(
      map(({ users, shifts, closures }) => this.buildWeekSchedule(mondayDate, startStr, endStr, users, shifts, closures))
    );
  }

  /**
   * Reconstructs the weekly schedule as it existed at a historical timestamp T.
   *
   * @param weekStart Monday Date of target week
   * @param atIsoDateTime Historical timestamp in ISO format (YYYY-MM-DDTHH:mm:ss)
   * @returns Observable WeekSchedule reconstructed at instant T
   */
  getWeekScheduleAt(weekStart: Date, atIsoDateTime: string): Observable<WeekSchedule> {
    const mondayDate = this.getMonday(weekStart);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(sundayDate.getDate() + 6);

    const startStr = this.formatDateIso(mondayDate);
    const endStr = this.formatDateIso(sundayDate);

    return forkJoin({
      users: this.userService.getUsers().pipe(catchError(() => of([] as User[]))),
      shifts: this.shiftService.getScheduleAt(startStr, atIsoDateTime).pipe(catchError(() => of([] as EmployeeShift[]))),
      closures: this.closureService.getClosures().pipe(catchError(() => of([] as EstablishmentClosure[])))
    }).pipe(
      map(({ users, shifts, closures }) => this.buildWeekSchedule(mondayDate, startStr, endStr, users, shifts, closures))
    );
  }

  private buildWeekSchedule(
    mondayDate: Date,
    startStr: string,
    endStr: string,
    users: User[],
    shifts: EmployeeShift[],
    closures: EstablishmentClosure[]
  ): WeekSchedule {
    const daysName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayOfWeekNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    // Map closed dates for the 7 days of the target week
    const closedDaysMap: { [dateISO: string]: string } = {};

    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(d.getDate() + i);
      const dateIso = this.formatDateIso(d);
      const dayOfWeek = dayOfWeekNames[i];

      const closure = closures.find((c) =>
        this.matchesWeeklyClosure(c, dayOfWeek) ||
        this.matchesExceptionalClosure(c, dateIso)
      );

      if (closure) {
        closedDaysMap[dateIso] = closure.reason || 'Fermeture établissement';
      }
    }

    // Map shifts by userId + dateShift
    const shiftsMap = new Map<string, EmployeeShift[]>();
    let totalCalculatedHours = 0;

    shifts.forEach((s) => {
      const key = `${s.userId}_${s.dateShift}`;
      const existing = shiftsMap.get(key) || [];
      existing.push(s);
      shiftsMap.set(key, existing);

      if (s.heuresPrevues) {
        totalCalculatedHours += Number(s.heuresPrevues);
      } else if (s.heuresEffectuees) {
        totalCalculatedHours += Number(s.heuresEffectuees);
      }
    });

    const activeUserSet = new Set<number>();

    const rows: EmployeeScheduleRow[] = users.map((user) => {
      const userShifts: ShiftCell[] = daysName.map((dayName, i) => {
        const currentDate = new Date(mondayDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateIso = this.formatDateIso(currentDate);

        const isClosed = Boolean(closedDaysMap[dateIso]);
        const closureReason = closedDaysMap[dateIso];

        const key = `${user.id}_${dateIso}`;
        const userShiftsForDay = shiftsMap.get(key);

        if (userShiftsForDay && userShiftsForDay.length > 0) {
          activeUserSet.add(user.id);
          const shiftObj = userShiftsForDay[0];
          const shiftIds = userShiftsForDay.map((s) => s.id).filter((id): id is number => id != null);
          return {
            day: dayName,
            date: dateIso,
            userId: user.id,
            userName: `${user.prenom} ${user.nom ? user.nom.charAt(0) + '.' : ''}`,
            type: isClosed ? 'CLOSED' : this.mapTypeShiftToCellType(shiftObj.typeShift, user.roles),
            typeShift: shiftObj.typeShift,
            startTime: shiftObj.heureDebut,
            endTime: shiftObj.heureFin,
            rawShift: shiftObj,
            shiftIds,
            isClosed,
            closureReason
          };
        }

        return {
          day: dayName,
          date: dateIso,
          userId: user.id,
          userName: `${user.prenom} ${user.nom ? user.nom.charAt(0) + '.' : ''}`,
          type: isClosed ? 'CLOSED' : 'EMPTY',
          isClosed,
          closureReason
        };
      });

      const userRole = this.resolvePrimaryRole(user.roles);

      return {
        employeeId: user.id,
        name: `${user.prenom} ${user.nom ? user.nom.charAt(0) + '.' : ''}`,
        role: userRole,
        shifts: userShifts
      };
    });

    return {
      weekStart: startStr,
      weekEnd: endStr,
      employees: rows,
      totalHours: Math.round(totalCalculatedHours),
      totalEmployees: users.length,
      activeEmployees: activeUserSet.size,
      closedDays: closedDaysMap
    };
  }

  /**
   * Returns true if the closure is a weekly recurring closure for the given day-of-week name.
   */
  private matchesWeeklyClosure(c: EstablishmentClosure, dayOfWeek: string): boolean {
    return c.type === 'WEEKLY_RECURRING' && c.dayOfWeek === dayOfWeek;
  }

  /**
   * Returns true if an exceptional closure covers the given ISO date string,
   * either directly (start <= date <= end) or via annual recurrence (MM-DD range match).
   */
  private matchesExceptionalClosure(c: EstablishmentClosure, dateIso: string): boolean {
    if (c.type !== 'EXCEPTIONAL' || !c.closureDate) return false;

    const start = c.closureDate;
    const end = c.endDate ?? start;

    // Standard date range: start <= dateIso <= end
    if (dateIso >= start && dateIso <= end) return true;

    // Annual recurring range: compare MM-DD only
    return Boolean(c.isAnnualRecurring) && this.matchesAnnualRecurringRange(start, end, dateIso);
  }

  /**
   * Compares month-day portions (MM-DD) to check if targetIso falls within a yearly recurring range.
   * Handles ranges that wrap over the new year (e.g. Dec 24 → Jan 2).
   */
  private matchesAnnualRecurringRange(startIso: string, endIso: string, targetIso: string): boolean {
    const s = startIso.substring(5);
    const e = endIso.substring(5);
    const t = targetIso.substring(5);

    if (s <= e) {
      return t >= s && t <= e;
    } else {
      return t >= s || t <= e;
    }
  }

  private mapTypeShiftToCellType(
    typeShift: TypeShift,
    roles: string[]
  ): 'MANAGER' | 'WAITER' | 'BARTENDER' | 'DAY_OFF' | 'EMPTY' | 'CLOSED' {
    if (typeShift === 'CONGE') return 'DAY_OFF';
    if (roles.includes('MANAGER') || roles.includes('ADMIN')) return 'MANAGER';
    if (roles.includes('BARMAN')) return 'BARTENDER';
    return 'WAITER';
  }

  private resolvePrimaryRole(roles: string[]): 'ADMIN' | 'MANAGER' | 'SERVEUR' | 'BARMAN' {
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('MANAGER')) return 'MANAGER';
    if (roles.includes('BARMAN')) return 'BARMAN';
    return 'SERVEUR';
  }

  getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private formatDateIso(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
