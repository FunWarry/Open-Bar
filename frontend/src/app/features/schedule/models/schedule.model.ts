import { EmployeeShift, TypeShift } from '../../../core/models/shift.model';

export interface WeekSchedule {
  weekStart: string; // ISO date 'YYYY-MM-DD'
  weekEnd: string; // ISO date 'YYYY-MM-DD'
  employees: EmployeeScheduleRow[];
  totalHours: number;
  totalEmployees: number;
  activeEmployees: number;
  closedDays?: { [dateISO: string]: string }; // date -> reason mapping
}

export interface EmployeeScheduleRow {
  employeeId: number;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'SERVEUR' | 'BARMAN';
  shifts: ShiftCell[];
}

export interface ShiftCell {
  day: string; // 'Mon', 'Tue', etc.
  date: string; // ISO date 'YYYY-MM-DD'
  userId: number;
  userName?: string;
  type: 'MANAGER' | 'WAITER' | 'BARTENDER' | 'DAY_OFF' | 'EMPTY' | 'CLOSED';
  typeShift?: TypeShift;
  startTime?: string;
  endTime?: string;
  rawShift?: EmployeeShift;
  isClosed?: boolean;
  closureReason?: string;
}

export interface DayHeaderInfo {
  day: string;
  date: string;
  dateISO: string;
  isClosed?: boolean;
  closureReason?: string;
}
