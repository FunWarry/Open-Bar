import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
/**
 * Floor plan zone representation with table counts and seating capacity.
 */

export interface ZoneBar {
  id?: number;
  nom: string;
  etage: string;
  planX?: number;
  planY?: number;
  planWidth?: number;
  planHeight?: number;
  shapeType?: 'rect' | 'polygon';
  pointsJson?: string;
  cornerRadiiJson?: string;
  couleur?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ZoneService {
  private readonly api = `${environment.apiUrl}/zones`;
  private readonly http = inject(HttpClient);

  /**
   * Retrieves all floor plan zones.
   * @returns Observable emitting list of zones
   */
  getAll(): Observable<ZoneBar[]> {
    return this.http.get<ZoneBar[]>(this.api);
  }

  /**
   * Retrieves a zone by its unique identifier.
   * @param id Zone identifier
   * @returns Observable emitting the zone
   */
  getById(id: number): Observable<ZoneBar> {
    return this.http.get<ZoneBar>(`${this.api}/${id}`);
  }

  /**
   * Creates a new floor plan zone.
   * @param zone Zone payload
   * @returns Observable emitting created zone
   */
  create(zone: Partial<ZoneBar>): Observable<ZoneBar> {
    return this.http.post<ZoneBar>(this.api, zone);
  }

  /**
   * Updates an existing floor plan zone.
   * @param id Zone identifier
   * @param zone Updated zone data
   * @returns Observable emitting updated zone
   */
  update(id: number, zone: Partial<ZoneBar>): Observable<ZoneBar> {
    return this.http.put<ZoneBar>(`${this.api}/${id}`, zone);
  }

  /**
   * Deletes a floor plan zone.
   * @param id Zone identifier
   * @returns Observable completing when deleted
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
