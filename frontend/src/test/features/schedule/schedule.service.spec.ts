import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ScheduleService } from '../../../app/features/schedule/services/schedule.service';
import { ShiftService } from '../../../app/core/services/shift.service';
import { UserService } from '../../../app/core/services/user.service';
import { ClosureService, EstablishmentClosure } from '../../../app/core/services/closure.service';
import { of } from 'rxjs';

describe('ScheduleService — date range closure detection', () => {
  let service: ScheduleService;
  let mockShiftService: jasmine.SpyObj<ShiftService>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockClosureService: jasmine.SpyObj<ClosureService>;

  const weekOf17Aug = new Date('2026-08-17'); // Monday

  beforeEach(() => {
    mockShiftService = jasmine.createSpyObj('ShiftService', ['getShiftsForWeek', 'getScheduleAt']);
    mockUserService = jasmine.createSpyObj('UserService', ['getUsers']);
    mockClosureService = jasmine.createSpyObj('ClosureService', ['getClosures']);

    mockShiftService.getShiftsForWeek.and.returnValue(of([]));
    mockShiftService.getScheduleAt.and.returnValue(of([]));
    mockUserService.getUsers.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [
        ScheduleService,
        { provide: ShiftService, useValue: mockShiftService },
        { provide: UserService, useValue: mockUserService },
        { provide: ClosureService, useValue: mockClosureService }
      ]
    });

    service = TestBed.inject(ScheduleService);
  });

  it('should mark all days within an exceptional date range as closed', (done) => {
    const rangeClosure: EstablishmentClosure = {
      id: 1,
      type: 'EXCEPTIONAL',
      closureDate: '2026-08-17',
      endDate: '2026-08-23',
      isAnnualRecurring: false,
      reason: 'Annual Leave'
    };
    mockClosureService.getClosures.and.returnValue(of([rangeClosure]));

    service.getWeekSchedule(weekOf17Aug).subscribe((schedule) => {
      // All 7 days of week 17–23 Aug should appear in closedDays
      expect(Object.keys(schedule.closedDays!)).toHaveSize(7);
      expect(schedule.closedDays!['2026-08-17']).toBe('Annual Leave');
      expect(schedule.closedDays!['2026-08-20']).toBe('Annual Leave'); // Wednesday mid-range
      expect(schedule.closedDays!['2026-08-23']).toBe('Annual Leave');
      done();
    });
  });

  it('should not mark days outside the exceptional date range as closed', (done) => {
    const rangeClosure: EstablishmentClosure = {
      id: 2,
      type: 'EXCEPTIONAL',
      closureDate: '2026-08-19',
      endDate: '2026-08-21',
      isAnnualRecurring: false,
      reason: 'Travaux'
    };
    mockClosureService.getClosures.and.returnValue(of([rangeClosure]));

    service.getWeekSchedule(weekOf17Aug).subscribe((schedule) => {
      // Only Wed 19, Thu 20, Fri 21 should be closed
      expect(schedule.closedDays!['2026-08-17']).toBeUndefined(); // Mon — outside range
      expect(schedule.closedDays!['2026-08-18']).toBeUndefined(); // Tue — outside range
      expect(schedule.closedDays!['2026-08-19']).toBe('Travaux');
      expect(schedule.closedDays!['2026-08-20']).toBe('Travaux');
      expect(schedule.closedDays!['2026-08-21']).toBe('Travaux');
      expect(schedule.closedDays!['2026-08-22']).toBeUndefined(); // Sat — outside range
      expect(schedule.closedDays!['2026-08-23']).toBeUndefined(); // Sun — outside range
      done();
    });
  });

  it('should mark annual recurring date range across the matching month/day window', (done) => {
    const annualRange: EstablishmentClosure = {
      id: 3,
      type: 'EXCEPTIONAL',
      closureDate: '2025-08-17', // last year's dates
      endDate: '2025-08-23',
      isAnnualRecurring: true,
      reason: 'Annual Festival'
    };
    mockClosureService.getClosures.and.returnValue(of([annualRange]));

    service.getWeekSchedule(weekOf17Aug).subscribe((schedule) => {
      // All days 17–23 Aug 2026 should match the annual recurring range from 2025
      expect(schedule.closedDays!['2026-08-17']).toBe('Annual Festival');
      expect(schedule.closedDays!['2026-08-20']).toBe('Annual Festival');
      expect(schedule.closedDays!['2026-08-23']).toBe('Annual Festival');
      done();
    });
  });

  it('should mark a single exceptional date closed (no endDate)', (done) => {
    const singleClosure: EstablishmentClosure = {
      id: 4,
      type: 'EXCEPTIONAL',
      closureDate: '2026-08-20',
      isAnnualRecurring: false,
      reason: 'Armistice'
    };
    mockClosureService.getClosures.and.returnValue(of([singleClosure]));

    service.getWeekSchedule(weekOf17Aug).subscribe((schedule) => {
      expect(schedule.closedDays!['2026-08-19']).toBeUndefined();
      expect(schedule.closedDays!['2026-08-20']).toBe('Armistice');
      expect(schedule.closedDays!['2026-08-21']).toBeUndefined();
      done();
    });
  });

  it('should build full schedule matrix mapping users and shifts to employee rows', (done) => {
    const mockUsers = [
      { id: 1, nom: 'Dupont', prenom: 'Jean', username: 'jdupont', email: 'j@bar.fr', roles: ['BARMAN'], enabled: true, createdAt: '', updatedAt: '' },
      { id: 2, nom: 'Martin', prenom: 'Claire', username: 'cmartin', email: 'c@bar.fr', roles: ['SERVEUR'], enabled: true, createdAt: '', updatedAt: '' },
      { id: 3, nom: 'Boss', prenom: 'Paul', username: 'pboss', email: 'p@bar.fr', roles: ['MANAGER'], enabled: true, createdAt: '', updatedAt: '' },
      { id: 4, nom: 'Root', prenom: 'Admin', username: 'root', email: 'r@bar.fr', roles: ['ADMIN'], enabled: true, createdAt: '', updatedAt: '' }
    ];

    const mockShifts: any[] = [
      { id: 10, userId: 1, dateShift: '2026-08-17', typeShift: 'MATIN', typePoste: 'BARMAN', heureDebut: '08:00', heureFin: '16:00', heuresPrevues: 8 },
      { id: 11, userId: 2, dateShift: '2026-08-18', typeShift: 'SOIR', typePoste: 'SERVEUR', heureDebut: '16:00', heureFin: '00:00', heuresEffectuees: 8 },
      { id: 12, userId: 3, dateShift: '2026-08-19', typeShift: 'CONGE', typePoste: 'MANAGER', heureDebut: '00:00', heureFin: '00:00', heuresPrevues: 0 }
    ];

    const weeklyClosure: EstablishmentClosure = {
      id: 5,
      type: 'WEEKLY_RECURRING',
      dayOfWeek: 'SUNDAY',
      reason: 'Fermeture dimanche'
    };

    mockUserService.getUsers.and.returnValue(of(mockUsers));
    mockShiftService.getShiftsForWeek.and.returnValue(of(mockShifts));
    mockClosureService.getClosures.and.returnValue(of([weeklyClosure]));

    service.getWeekSchedule(weekOf17Aug).subscribe((schedule) => {
      expect(schedule.employees).toHaveSize(4);
      expect(schedule.totalHours).toBe(16);
      expect(schedule.totalEmployees).toBe(4);
      expect(schedule.activeEmployees).toBe(3);

      const barmanRow = schedule.employees.find(e => e.employeeId === 1)!;
      expect(barmanRow.role).toBe('BARMAN');
      expect(barmanRow.shifts[0].type).toBe('BARTENDER'); // Monday
      expect(barmanRow.shifts[6].type).toBe('CLOSED'); // Sunday closed

      const serverRow = schedule.employees.find(e => e.employeeId === 2)!;
      expect(serverRow.role).toBe('SERVEUR');
      expect(serverRow.shifts[1].type).toBe('WAITER'); // Tuesday

      const managerRow = schedule.employees.find(e => e.employeeId === 3)!;
      expect(managerRow.role).toBe('MANAGER');
      expect(managerRow.shifts[2].type).toBe('DAY_OFF'); // Conge

      done();
    });
  });

  it('getWeekScheduleAt() should fetch shifts at instant T and build WeekSchedule', (done) => {
    mockUserService.getUsers.and.returnValue(of([
      { id: 1, username: 'barman1', nom: 'Doe', prenom: 'John', email: 'b@bar.com', roles: ['BARMAN'], enabled: true, actif: true, createdAt: '', updatedAt: '' }
    ]));
    mockShiftService.getScheduleAt.and.returnValue(of([
      {
        id: 10,
        userId: 1,
        dateShift: '2026-08-17',
        typeShift: 'MATIN',
        typePoste: 'BARMAN',
        heureDebut: '08:00',
        heureFin: '16:00',
        heuresPrevues: 8
      }
    ]));
    mockClosureService.getClosures.and.returnValue(of([]));

    service.getWeekScheduleAt(weekOf17Aug, '2026-08-17T12:00:00').subscribe((schedule) => {
      expect(schedule.employees).toHaveSize(1);
      expect(schedule.totalHours).toBe(8);
      expect(schedule.employees[0].shifts[0].startTime).toBe('08:00');
      done();
    });
  });

  it('getMonday() and formatDateIso() should format dates correctly', () => {
    const monday = service.getMonday(new Date('2026-08-20')); // Thursday
    expect(monday.getDay()).toBe(1); // Monday
    const iso = (service as any).formatDateIso(monday);
    expect(iso).toBe('2026-08-17');
  });
});
