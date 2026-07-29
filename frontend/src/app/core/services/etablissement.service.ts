import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstablishmentConfig } from '../models/establishment-config.model';

/**
 * Service for legal establishment settings management.
 */
@Injectable({
  providedIn: 'root',
})
export class EtablissementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/admin/establishment';

  /**
   * Retrieves legal establishment parameters.
   */
  getConfig(): Observable<EstablishmentConfig> {
    return this.http.get<EstablishmentConfig>(this.apiUrl);
  }

  /**
   * Updates legal establishment parameters.
   */
  updateConfig(config: Partial<EstablishmentConfig>): Observable<EstablishmentConfig> {
    return this.http.put<EstablishmentConfig>(this.apiUrl, config);
  }

  /**
   * Retrieves available time zones list.
   */
  getTimeZones(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/timezones`);
  }
}

