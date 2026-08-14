import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TablePosition } from '../models/table-position.model';

const STORAGE_KEY = 'openbar_table_positions';

/**
 * Service managing 2D table layout positions for the interactive Konva.js floor plan.
 * Provides backend persistence with a fallback to localStorage for offline operation.
 */
function normalizeShape(raw?: string): 'circle' | 'rect' {
  if (!raw) return 'rect';
  const val = raw.trim().toUpperCase();
  if (val === 'RONDE' || val === 'CIRCLE' || val === 'CIRCULAIRE' || val === 'ROND') return 'circle';
  return 'rect';
}

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
    return this.http.get<any[]>(this.api).pipe(
      map(data => (data || []).map(item => ({
        tableId: item.id ?? item.tableId,
        x: item.planX ?? item.x ?? 120,
        y: item.planY ?? item.y ?? 120,
        width: item.planWidth ?? item.width,
        height: item.planHeight ?? item.height,
        rotation: item.planRotation ?? item.rotation ?? 0,
        shape: normalizeShape(item.planForme ?? item.shape),
        floor: item.etage || item.floor || 'RDC',
        zone: item.zone,
      }))),
      catchError(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return of([]);
        try {
          const parsed = JSON.parse(stored) as TablePosition[];
          return of(parsed.map(p => ({ ...p, shape: normalizeShape(p.shape) })));
        } catch {
          return of([]);
        }
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
    const payload = positions.map(p => ({
      id: p.tableId,
      planX: Math.round(p.x),
      planY: Math.round(p.y),
      planRotation: Math.round(p.rotation || 0),
      planForme: p.shape === 'circle' ? 'RONDE' : 'RECTANGLE',
      planWidth: p.width ? Math.round(p.width) : null,
      planHeight: p.height ? Math.round(p.height) : null,
    }));

    return this.http.put<any>(this.api, payload).pipe(
      tap(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))),
      map(() => positions),
      catchError(() => of(positions)),
    );
  }
}
