import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Represents a configurable restaurant service shift segment (e.g. Lunch, Dinner, Brunch, Afterwork).
 */
export interface RestaurantServiceShift {
  /** Unique shift identifier (e.g. 'LUNCH', 'DINNER', 'BRUNCH', or auto-generated uuid). */
  id: string;
  /** Human-readable display label for the shift. */
  name: string;
  /** Shift start time in HH:mm 24h format (e.g. '11:30'). */
  startTime: string;
  /** Shift end time in HH:mm 24h format (e.g. '15:30'). */
  endTime: string;
  /** Slot interval in minutes for the reservation calendar timeline (default: 30). */
  stepMinutes: number;
}

/** Default establishment restaurant service shifts. */
export const DEFAULT_RESTAURANT_SHIFTS: RestaurantServiceShift[] = [
  {
    id: 'LUNCH',
    name: 'Midi',
    startTime: '11:30',
    endTime: '15:30',
    stepMinutes: 30,
  },
  {
    id: 'DINNER',
    name: 'Soir',
    startTime: '18:30',
    endTime: '23:30',
    stepMinutes: 30,
  },
];

const STORAGE_KEY = 'openbar_restaurant_service_shifts';

/**
 * Service managing restaurant service shifts for reservation book segmentation and planning.
 * Persists user-customized shifts and provides reactive signals for timeline synchronization.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantShiftService {
  private readonly shiftsSubject = new BehaviorSubject<RestaurantServiceShift[]>(this.loadPersistedShifts());

  /** Observable stream of configured restaurant service shifts. */
  readonly shifts$: Observable<RestaurantServiceShift[]> = this.shiftsSubject.asObservable();

  /** Signal of currently configured restaurant shifts. */
  readonly shifts = signal<RestaurantServiceShift[]>(this.shiftsSubject.value);

  /**
   * Returns current snapshot of restaurant shifts.
   *
   * @returns Array of RestaurantServiceShift
   */
  getShifts(): RestaurantServiceShift[] {
    return this.shiftsSubject.value;
  }

  /**
   * Persists updated shifts to localStorage and emits changes.
   *
   * @param shifts Updated shift array
   */
  saveShifts(shifts: RestaurantServiceShift[]): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
      } catch (err) {
        console.warn('Failed to persist restaurant service shifts to localStorage', err);
      }
    }
    this.shiftsSubject.next([...shifts]);
    this.shifts.set([...shifts]);
  }

  /**
   * Appends a new restaurant shift.
   *
   * @param shift New shift definition without id
   * @returns Created RestaurantServiceShift with generated id
   */
  addShift(shift: Omit<RestaurantServiceShift, 'id'>): RestaurantServiceShift {
    const current = this.getShifts();
    const newId = `shift_${Date.now()}_${current.length + 1}`;
    const created: RestaurantServiceShift = {
      ...shift,
      id: newId,
      stepMinutes: shift.stepMinutes || 30,
    };
    this.saveShifts([...current, created]);
    return created;
  }

  /**
   * Updates an existing shift by id.
   *
   * @param id Shift identifier
   * @param patch Partial shift updates
   */
  updateShift(id: string, patch: Partial<RestaurantServiceShift>): void {
    const current = this.getShifts();
    const updated = current.map((s) => (s.id === id ? { ...s, ...patch } : s));
    this.saveShifts(updated);
  }

  /**
   * Deletes a shift by id.
   *
   * @param id Target shift identifier
   */
  deleteShift(id: string): void {
    const current = this.getShifts();
    if (current.length <= 1) {
      return; // Keep at least one shift configured
    }
    const filtered = current.filter((s) => s.id !== id);
    this.saveShifts(filtered);
  }

  /**
   * Resets restaurant shifts to system defaults (Midi & Soir).
   */
  resetToDefaults(): void {
    this.saveShifts(DEFAULT_RESTAURANT_SHIFTS);
  }

  private loadPersistedShifts(): RestaurantServiceShift[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Fallback to default shifts
      }
    }
    return DEFAULT_RESTAURANT_SHIFTS;
  }
}
