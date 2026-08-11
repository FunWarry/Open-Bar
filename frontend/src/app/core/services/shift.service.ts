import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EmployeeShift, EmployeeShiftRequest, ShiftAuditLog, ShiftPreset, TypeShift } from '../models/shift.model';
import { environment } from '../../../environments/environment';

/**
 * Service handling HTTP requests for employee work shifts, weekly schedules, immutable audit logs, and historical replay.
 */
@Injectable({
  providedIn: 'root'
})
export class ShiftService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/shifts`;

  /**
   * Retrieves all registered employee shifts.
   *
   * @returns Observable array of EmployeeShift objects
   */
  getAllShifts(): Observable<EmployeeShift[]> {
    return this.http.get<EmployeeShift[]>(this.apiUrl);
  }

  /**
   * Retrieves a single shift by ID.
   *
   * @param id Shift identifier
   * @returns Observable EmployeeShift
   */
  getShiftById(id: number): Observable<EmployeeShift> {
    return this.http.get<EmployeeShift>(`${this.apiUrl}/${id}`);
  }

  /**
   * Retrieves employee shifts within a specific date range or week.
   *
   * @param debut Start date (YYYY-MM-DD)
   * @param fin End date (YYYY-MM-DD)
   * @returns Observable array of EmployeeShift objects in range
   */
  getShiftsForWeek(debut?: string, fin?: string): Observable<EmployeeShift[]> {
    let params = new HttpParams();
    if (debut) params = params.set('debut', debut);
    if (fin) params = params.set('fin', fin);
    return this.http.get<EmployeeShift[]>(`${this.apiUrl}/week`, { params });
  }

  /**
   * Retrieves employee shifts within a custom date range.
   *
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   * @returns Observable array of EmployeeShift objects
   */
  getShiftsForRange(from: string, to: string): Observable<EmployeeShift[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<EmployeeShift[]>(`${this.apiUrl}/range`, { params });
  }

  /**
   * Retrieves shifts for a specific user ID.
   *
   * @param userId User identifier
   * @returns Observable array of EmployeeShift objects for the user
   */
  getShiftsByUserId(userId: number): Observable<EmployeeShift[]> {
    return this.http.get<EmployeeShift[]>(`${this.apiUrl}/user/${userId}`);
  }

  /**
   * Creates a new employee shift.
   *
   * @param shift Shift creation payload
   * @returns Observable created EmployeeShift
   */
  createShift(shift: EmployeeShiftRequest): Observable<EmployeeShift> {
    return this.http.post<EmployeeShift>(this.apiUrl, shift);
  }

  /**
   * Updates an existing employee shift.
   *
   * @param id Shift identifier
   * @param shift Shift update payload
   * @returns Observable updated EmployeeShift
   */
  updateShift(id: number, shift: EmployeeShiftRequest): Observable<EmployeeShift> {
    return this.http.put<EmployeeShift>(`${this.apiUrl}/${id}`, shift);
  }

  /**
   * Deletes an employee shift by ID.
   *
   * @param id Shift identifier
   * @returns Observable void
   */
  deleteShift(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Retrieves all shift presets (modèles de créneaux horraires).
   *
   * @returns Observable array of ShiftPreset objects
   */
  getPresets(): Observable<ShiftPreset[]> {
    return this.http.get<ShiftPreset[]>(`${environment.apiUrl}/shift-presets`);
  }

  /**
   * Updates a shift preset default configuration.
   *
   * @param typeShift Shift type enum
   * @param preset Preset details
   * @returns Observable updated ShiftPreset
   */
  updatePreset(typeShift: TypeShift, preset: Partial<ShiftPreset>): Observable<ShiftPreset> {
    return this.http.put<ShiftPreset>(`${environment.apiUrl}/shift-presets/${typeShift}`, preset);
  }

  /**
   * Retrieves the immutable audit log of modifications for a specific shift.
   *
   * @param shiftId Shift identifier
   * @returns Observable array of ShiftAuditLog entries
   */
  getShiftHistory(shiftId: number): Observable<ShiftAuditLog[]> {
    return this.http.get<ShiftAuditLog[]>(`${this.apiUrl}/${shiftId}/history`);
  }

  /**
   * Retrieves the weekly immutable audit log of shift modifications.
   *
   * @param week Date in target week (YYYY-MM-DD)
   * @param userId Optional employee filter
   * @returns Observable array of ShiftAuditLog entries
   */
  getWeekAuditLog(week: string, userId?: number): Observable<ShiftAuditLog[]> {
    let params = new HttpParams().set('week', week);
    if (userId != null) {
      params = params.set('userId', userId.toString());
    }
    return this.http.get<ShiftAuditLog[]>(`${environment.apiUrl}/schedule/audit-log`, { params });
  }

  /**
   * Reconstructs the weekly schedule state at a specific historical point in time (replay).
   *
   * @param week Date in target week (YYYY-MM-DD)
   * @param at Historical ISO timestamp (YYYY-MM-DDTHH:mm:ss)
   * @returns Observable array of reconstructed EmployeeShift objects at timestamp T
   */
  getScheduleAt(week: string, at: string): Observable<EmployeeShift[]> {
    const params = new HttpParams().set('week', week).set('at', at);
    return this.http.get<EmployeeShift[]>(`${environment.apiUrl}/schedule/at`, { params });
  }
}
