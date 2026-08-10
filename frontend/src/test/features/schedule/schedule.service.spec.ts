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
    mockShiftService = jasmine.createSpyObj('ShiftService', ['getShiftsForWeek']);
    mockUserService = jasmine.createSpyObj('UserService', ['getUsers']);
    mockClosureService = jasmine.createSpyObj('ClosureService', ['getClosures']);

    mockShiftService.getShiftsForWeek.and.returnValue(of([]));
    mockUserService.getUsers.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
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
      reason: 'Congés annuels'
    };
    mockClosureService.getClosures.and.returnValue(of([rangeClosure]));

    service.getWeekSchedule(weekOf17Aug).subscribe((schedule) => {
      // All 7 days of week 17–23 Aug should appear in closedDays
      expect(Object.keys(schedule.closedDays!)).toHaveSize(7);
      expect(schedule.closedDays!['2026-08-17']).toBe('Congés annuels');
      expect(schedule.closedDays!['2026-08-20']).toBe('Congés annuels'); // Wednesday mid-range
      expect(schedule.closedDays!['2026-08-23']).toBe('Congés annuels');
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
      reason: 'Fête annuelle'
    };
    mockClosureService.getClosures.and.returnValue(of([annualRange]));

    service.getWeekSchedule(weekOf17Aug).subscribe((schedule) => {
      // All days 17–23 Aug 2026 should match the annual recurring range from 2025
      expect(schedule.closedDays!['2026-08-17']).toBe('Fête annuelle');
      expect(schedule.closedDays!['2026-08-20']).toBe('Fête annuelle');
      expect(schedule.closedDays!['2026-08-23']).toBe('Fête annuelle');
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
});
