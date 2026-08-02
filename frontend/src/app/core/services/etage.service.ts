import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Data representation of a floor / level in the OpenBar establishment.
 */
export interface EtageBar {
  id?: number;
  code: string;
  nom: string;
  ordre?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Service handling HTTP requests for managing floor levels in OpenBar.
 */
@Injectable({ providedIn: 'root' })
export class EtageService {
  private readonly api = `${environment.apiUrl}/etages`;
  private readonly http = inject(HttpClient);

  /**
   * Retrieves all floors ordered by position.
   *
   * @returns Observable emitting array of EtageBar items
   */
  getAll(): Observable<EtageBar[]> {
    return this.http.get<EtageBar[]>(this.api);
  }

  /**
   * Retrieves a floor by ID.
   *
   * @param id primary key of the floor
   * @returns Observable emitting EtageBar details
   */
  getById(id: number): Observable<EtageBar> {
    return this.http.get<EtageBar>(`${this.api}/${id}`);
  }

  /**
   * Creates a new floor level.
   *
   * @param etage partial floor object to create
   * @returns Observable emitting the created EtageBar
   */
  create(etage: Partial<EtageBar>): Observable<EtageBar> {
    return this.http.post<EtageBar>(this.api, etage);
  }

  /**
   * Updates an existing floor level.
   *
   * @param id primary key of the floor
   * @param etage updated floor fields
   * @returns Observable emitting updated EtageBar
   */
  update(id: number, etage: Partial<EtageBar>): Observable<EtageBar> {
    return this.http.put<EtageBar>(`${this.api}/${id}`, etage);
  }

  /**
   * Deletes a floor level by ID.
   *
   * @param id primary key of the floor to delete
   * @returns Observable emitting void
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
