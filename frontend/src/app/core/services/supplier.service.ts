import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Supplier, SupplierCreateRequest } from '../models/supplier.model';

/**
 * Service managing supplier vendors in OpenBar.
 * Provides CRUD operations and legacy string migration.
 */
@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly api = `${environment.apiUrl}/suppliers`;
  private readonly http = inject(HttpClient);

  /**
   * Fetches all registered suppliers.
   *
   * @returns Observable emitting an array of suppliers.
   */
  getAll(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(this.api);
  }

  /**
   * Fetches only active suppliers.
   *
   * @returns Observable emitting an array of active suppliers.
   */
  getActive(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.api}/active`);
  }

  /**
   * Fetches a supplier by ID.
   *
   * @param id - Numeric identifier.
   * @returns Observable emitting the supplier.
   */
  getById(id: number): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.api}/${id}`);
  }

  /**
   * Creates a new supplier.
   *
   * @param request - Payload to create supplier.
   * @returns Observable emitting the created supplier.
   */
  create(request: SupplierCreateRequest): Observable<Supplier> {
    return this.http.post<Supplier>(this.api, request);
  }

  /**
   * Updates an existing supplier.
   *
   * @param id - Numeric identifier.
   * @param request - Payload to update supplier.
   * @returns Observable emitting the updated supplier.
   */
  update(id: number, request: SupplierCreateRequest): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.api}/${id}`, request);
  }

  /**
   * Deactivates or removes a supplier.
   *
   * @param id - Numeric identifier.
   * @returns Observable emitting void.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  /**
   * Migrates legacy free-text supplier names from ingredients into supplier entities.
   *
   * @returns Observable emitting the count of migrated suppliers.
   */
  migrateLegacy(): Observable<number> {
    return this.http.post<number>(`${this.api}/migrate-legacy`, {});
  }
}
