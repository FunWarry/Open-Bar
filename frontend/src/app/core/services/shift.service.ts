import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EmployeeShift, EmployeeShiftRequest } from '../models/shift.model';

/**
 * Service handling HTTP requests for employee work shifts and weekly schedules.
 */
@Injectable({
  providedIn: 'root'
})
export class ShiftService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/shifts';

  /**
   * Retrieves all registered employee shifts.
   *
   * @returns Observable array of EmployeeShift objects
   */
  getAllShifts(): Observable<EmployeeShift[]> {
    return this.http.get<EmployeeShift[]>(this.apiUrl);
  }

  /**
   * Retrieves employee shifts within a specific date range.
   *
   * @param debut Start date (YYYY-MM-DD)
   * @param fin End date (YYYY-MM-DD)
   * @returns Observable array of EmployeeShift objects in range
   */
  getShiftsForWeek(debut: string, fin: string): Observable<EmployeeShift[]> {
    const params = new HttpParams()
      .set('debut', debut)
      .set('fin', fin);
    return this.http.get<EmployeeShift[]>(`${this.apiUrl}/week`, { params });
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
}
