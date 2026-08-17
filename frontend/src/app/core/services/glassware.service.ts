import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Glassware, GlasswareRequest } from '../models/glassware.model';

/**
 * Service managing glassware catalog (tumbler, coupe, flute, rocks...)
 * and custom glassware created by users.
 */
@Injectable({ providedIn: 'root' })
export class GlasswareService {
  private readonly api = `${environment.apiUrl}/glassware`;
  private readonly http = inject(HttpClient);

  /**
   * Retrieves all available glassware items.
   *
   * @returns Observable of glassware array
   */
  getAll(): Observable<Glassware[]> {
    return this.http.get<Glassware[]>(this.api);
  }

  /**
   * Retrieves a glassware item by ID.
   *
   * @param id Glassware ID
   * @returns Observable of glassware
   */
  getById(id: number): Observable<Glassware> {
    return this.http.get<Glassware>(`${this.api}/${id}`);
  }

  /**
   * Creates a new glassware item in the catalog.
   *
   * @param glassware Glassware creation payload
   * @returns Observable of created glassware
   */
  create(glassware: GlasswareRequest): Observable<Glassware> {
    return this.http.post<Glassware>(this.api, glassware);
  }

  /**
   * Updates an existing glassware item.
   *
   * @param id Glassware ID
   * @param glassware Glassware update payload
   * @returns Observable of updated glassware
   */
  update(id: number, glassware: GlasswareRequest): Observable<Glassware> {
    return this.http.put<Glassware>(`${this.api}/${id}`, glassware);
  }

  /**
   * Uploads a custom illustration photo for a glassware item.
   *
   * @param id Glassware ID
   * @param file Image file to upload
   * @returns Observable of updated glassware with new image URL
   */
  uploadImage(id: number, file: File): Observable<Glassware> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Glassware>(`${this.api}/${id}/image`, formData);
  }

  /**
   * Deletes a glassware item from the catalog.
   *
   * @param id Glassware ID
   * @returns Observable of void
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
