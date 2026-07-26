export interface WeekSchedule {
  weekStart: string; // ISO date
  weekEnd: string;
  employees: EmployeeScheduleRow[];
  totalHours: number;
  totalEmployees: number;
  activeEmployees: number;
}

export interface EmployeeScheduleRow {
  employeeId: number;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'SERVEUR' | 'BARMAN';
  shifts: ShiftCell[];
}

export interface ShiftCell {
  day: string; // 'Mon', 'Tue', etc.
  date: string; // ISO date
  type: 'MANAGER' | 'WAITER' | 'BARTENDER' | 'DAY_OFF' | 'EMPTY';
  startTime?: string;
  endTime?: string;
}
