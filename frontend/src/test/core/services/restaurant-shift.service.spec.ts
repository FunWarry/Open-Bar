import { TestBed } from '@angular/core/testing';
import {
  RestaurantShiftService,
  DEFAULT_RESTAURANT_SHIFTS,
  RestaurantServiceShift,
} from '../../../app/core/services/restaurant-shift.service';

describe('RestaurantShiftService', () => {
  let service: RestaurantShiftService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [RestaurantShiftService],
    });
    service = TestBed.inject(RestaurantShiftService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with default shifts (Lunch & Dinner)', () => {
    const shifts = service.getShifts();
    expect(shifts.length).toBe(DEFAULT_RESTAURANT_SHIFTS.length);
    expect(shifts[0].id).toBe('LUNCH');
    expect(shifts[1].id).toBe('DINNER');
  });

  it('adds a new service shift and persists it', () => {
    const newShift = service.addShift({
      name: 'Brunch',
      startTime: '09:30',
      endTime: '12:30',
      stepMinutes: 30,
    });

    expect(newShift.id).toBeDefined();
    expect(newShift.name).toBe('Brunch');

    const shifts = service.getShifts();
    expect(shifts.length).toBe(3);
    expect(shifts.some((s: RestaurantServiceShift) => s.name === 'Brunch')).toBeTrue();
  });

  it('updates an existing shift by id', () => {
    service.updateShift('LUNCH', { startTime: '11:00', endTime: '15:00' });
    const lunch = service.getShifts().find((s: RestaurantServiceShift) => s.id === 'LUNCH');
    expect(lunch?.startTime).toBe('11:00');
    expect(lunch?.endTime).toBe('15:00');
  });

  it('deletes a shift while preserving at least one', () => {
    service.deleteShift('LUNCH');
    let shifts = service.getShifts();
    expect(shifts.length).toBe(1);
    expect(shifts[0].id).toBe('DINNER');

    // Attempting to delete the last shift should be prevented
    service.deleteShift('DINNER');
    shifts = service.getShifts();
    expect(shifts.length).toBe(1);
  });

  it('resets shifts to system defaults', () => {
    service.addShift({
      name: 'Afterwork',
      startTime: '17:00',
      endTime: '19:00',
      stepMinutes: 15,
    });
    expect(service.getShifts().length).toBe(3);

    service.resetToDefaults();
    const defaults = service.getShifts();
    expect(defaults.length).toBe(2);
    expect(defaults[0].id).toBe('LUNCH');
  });
});
