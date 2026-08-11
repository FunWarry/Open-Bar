import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TablePosition } from '../models/table-position.model';

const STORAGE_KEY = 'openbar_table_positions';

/**
 * Service managing 2D table layout positions for the interactive Konva.js floor plan.
 * Provides backend persistence with a fallback to localStorage for offline operation.
 */
@Injectable({ providedIn: 'root' })
export class PlanSalleService {
  private readonly api = `${environment.apiUrl}/tables/positions`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetches saved table positions from the backend API.
   * Falls back to localStorage if the backend endpoint is unavailable.
   *
   * @returns An Observable emitting an array of TablePosition objects.
   */
  getPositions(): Observable<TablePosition[]> {
    return this.http.get<TablePosition[]>(this.api).pipe(
      catchError(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return of(stored ? (JSON.parse(stored) as TablePosition[]) : []);
      }),
    );
  }

  /**
   * Persists updated table positions to the backend API and updates local cache.
   *
   * @param positions - Array of TablePosition objects to save.
   * @returns An Observable emitting the updated positions.
   */
  sauvegarderPositions(positions: TablePosition[]): Observable<TablePosition[]> {
    return this.http.put<TablePosition[]>(this.api, positions).pipe(
      tap(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))),
      catchError(() => of(positions)),
    );
  }
}
