import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TableSessionResponse } from '../models/table-session.model';

/**
 * Core service managing ephemeral table session tokens and anti-fraud QR validation.
 * <p>
 * Ensures that public patrons placing orders via table QR codes possess a valid on-premise
 * session token, guarding against fraudulent remote orders from stale links or captured photos.
 */
@Injectable({
  providedIn: 'root'
})
export class TableSessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/public/tables`;

  /**
   * Validates an ephemeral session token against the specified table ID.
   *
   * @param tableId Unique table identifier.
   * @param sessionToken Optional ephemeral session token string.
   * @returns Observable emitting the {@link TableSessionResponse} with authorization status.
   */
  validateSession(tableId: number, sessionToken?: string | null): Observable<TableSessionResponse> {
    let params = new HttpParams();
    if (sessionToken && sessionToken.trim().length > 0) {
      params = params.set('token', sessionToken.trim());
    }

    return this.http.get<TableSessionResponse>(`${this.baseUrl}/${tableId}/session`, { params });
  }

  /**
   * Submits an explicit validation payload for an ephemeral table session.
   *
   * @param tableId Unique table identifier.
   * @param sessionToken Ephemeral token to check.
   * @returns Observable emitting the validation response.
   */
  validateSessionPayload(tableId: number, sessionToken?: string | null): Observable<TableSessionResponse> {
    return this.http.post<TableSessionResponse>(`${this.baseUrl}/${tableId}/session/validate`, {
      sessionToken: sessionToken || null
    });
  }

  /**
   * Refreshes or requests a new active table session for an on-premise table.
   *
   * @param tableId Unique table identifier.
   * @returns Observable emitting the refreshed active session.
   */
  refreshSession(tableId: number): Observable<TableSessionResponse> {
    return this.http.post<TableSessionResponse>(`${this.baseUrl}/${tableId}/session/refresh`, {});
  }
}
