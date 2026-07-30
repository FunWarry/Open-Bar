import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog } from '../models/audit-log.model';

/**
 * Service managing audit log operations and security action history retrieval.
 * Interacts with backend endpoint `/api/audit-logs`.
 */
@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private readonly apiUrl = `${environment.apiUrl}/audit-logs`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetches all audit logs ordered by timestamp descending.
   *
   * @returns Observable emitting an array of {@link AuditLog} entries.
   */
  getAuditLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(this.apiUrl);
  }

  /**
   * Fetches audit logs performed by a specific user.
   *
   * @param userId Unique identifier of the target user.
   * @returns Observable emitting matching {@link AuditLog} entries.
   */
  getAuditLogsByUser(userId: number): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/user/${userId}`);
  }

  /**
   * Fetches audit logs filtered by action type.
   *
   * @param action Action string key (e.g., 'CREATE', 'UPDATE', 'DELETE').
   * @returns Observable emitting matching {@link AuditLog} entries.
   */
  getAuditLogsByAction(action: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/action/${action}`);
  }

  /**
   * Fetches audit logs filtered by target entity type.
   *
   * @param entityType Entity type name (e.g., 'User', 'Cocktail', 'Commande').
   * @returns Observable emitting matching {@link AuditLog} entries.
   */
  getAuditLogsByEntityType(entityType: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/entity-type/${entityType}`);
  }

  /**
   * Fetches audit logs for a specific entity ID.
   *
   * @param entityId Identifier of the entity.
   * @returns Observable emitting matching {@link AuditLog} entries.
   */
  getAuditLogsByEntityId(entityId: number): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/entity-id/${entityId}`);
  }

  /**
   * Fetches audit logs generated within a specific date time range.
   *
   * @param debut Start ISO date string.
   * @param fin End ISO date string.
   * @returns Observable emitting matching {@link AuditLog} entries.
   */
  getAuditLogsByDate(debut: string, fin: string): Observable<AuditLog[]> {
    const params = new HttpParams()
      .set('debut', debut)
      .set('fin', fin);
    return this.http.get<AuditLog[]>(`${this.apiUrl}/date`, { params });
  }
}
