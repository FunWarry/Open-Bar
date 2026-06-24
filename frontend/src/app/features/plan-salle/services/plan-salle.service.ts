import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TablePosition } from '../models/table-position.model';

const STORAGE_KEY = 'openbar_table_positions';

@Injectable({ providedIn: 'root' })
export class PlanSalleService {
  private readonly api = `${environment.apiUrl}/tables/positions`;

  constructor(private http: HttpClient) {}

  /** Charge les positions depuis le backend.
   *  Fallback localStorage si l'endpoint n'existe pas encore (HTTP 404/0). */
  getPositions(): Observable<TablePosition[]> {
    return this.http.get<TablePosition[]>(this.api).pipe(
      catchError(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return of(stored ? JSON.parse(stored) as TablePosition[] : []);
      }),
    );
  }

  /** Sauvegarde les positions — localStorage mis à jour uniquement après succès du PUT. */
  sauvegarderPositions(positions: TablePosition[]): Observable<TablePosition[]> {
    return this.http.put<TablePosition[]>(this.api, positions).pipe(
      tap(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))),
      catchError(() => of(positions)),
    );
  }
}
