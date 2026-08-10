import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ClosureType = 'WEEKLY_RECURRING' | 'EXCEPTIONAL';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface EstablishmentClosure {
  id: number;
  type: ClosureType;
  dayOfWeek?: DayOfWeek;
  closureDate?: string;
  endDate?: string;
  isAnnualRecurring?: boolean;
  reason: string;
}

export interface EstablishmentClosureRequest {
  type: ClosureType;
  dayOfWeek?: DayOfWeek;
  closureDate?: string;
  endDate?: string;
  isAnnualRecurring?: boolean;
  reason: string;
}

/**
 * Service managing establishment weekly closed days and holiday closures.
 */
@Injectable({
  providedIn: 'root'
})
export class ClosureService {
  private readonly apiUrl = `${environment.apiUrl}/closures`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves all establishment closures.
   */
  getClosures(): Observable<EstablishmentClosure[]> {
    return this.http.get<EstablishmentClosure[]>(this.apiUrl);
  }

  /**
   * Creates a new establishment closure rule.
   */
  createClosure(request: EstablishmentClosureRequest): Observable<EstablishmentClosure> {
    return this.http.post<EstablishmentClosure>(this.apiUrl, request);
  }

  /**
   * Deletes an establishment closure rule by ID.
   */
  deleteClosure(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
