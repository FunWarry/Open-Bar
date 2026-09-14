import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TableJoinRequest, TableSessionResponse } from '../models/table-session.model';

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
   * @param guestSessionId Optional guest UUID for ownership verification.
   * @param guestName Optional guest nickname.
   * @returns Observable emitting the {@link TableSessionResponse} with authorization status.
   */
  validateSession(
    tableId: number,
    sessionToken?: string | null,
    guestSessionId?: string | null,
    guestName?: string | null
  ): Observable<TableSessionResponse> {
    let params = new HttpParams();
    if (sessionToken && sessionToken.trim().length > 0) {
      params = params.set('token', sessionToken.trim());
    }
    if (guestSessionId && guestSessionId.trim().length > 0) {
      params = params.set('guestSessionId', guestSessionId.trim());
    }
    if (guestName && guestName.trim().length > 0) {
      params = params.set('guestName', guestName.trim());
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

  /**
   * Constructs the API URL for retrieving the session QR code image.
   *
   * @param tableId Unique table identifier or number.
   * @param sessionToken Ephemeral table session token.
   * @param format Image format ('PNG' or 'SVG').
   * @param size Target dimension in pixels.
   * @param baseUrl Client application base URL origin.
   * @returns Complete API URL string.
   */
  getSessionQrCodeUrl(
    tableId: number,
    sessionToken?: string | null,
    format: 'PNG' | 'SVG' = 'PNG',
    size = 300,
    baseUrl?: string
  ): string {
    let url = `${this.baseUrl}/${tableId}/session/qrcode?format=${format}&size=${size}`;
    if (sessionToken && sessionToken.trim().length > 0) {
      url += `&token=${encodeURIComponent(sessionToken.trim())}`;
    }
    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    if (origin && origin.trim().length > 0) {
      url += `&baseUrl=${encodeURIComponent(origin.trim())}`;
    }
    return url;
  }

  /**
   * Downloads the table session QR code image as a Blob.
   *
   * @param tableId Unique table identifier or number.
   * @param sessionToken Ephemeral table session token.
   * @param format Image format ('PNG' or 'SVG').
   * @param size Target dimension in pixels.
   * @param baseUrl Client application base URL origin.
   * @returns Observable emitting the binary image Blob.
   */
  downloadSessionQrCode(
    tableId: number,
    sessionToken?: string | null,
    format: 'PNG' | 'SVG' = 'PNG',
    size = 300,
    baseUrl?: string
  ): Observable<Blob> {
    let params = new HttpParams()
      .set('format', format)
      .set('size', size.toString());

    if (sessionToken && sessionToken.trim().length > 0) {
      params = params.set('token', sessionToken.trim());
    }

    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    if (origin && origin.trim().length > 0) {
      params = params.set('baseUrl', origin.trim());
    }

    return this.http.get(`${this.baseUrl}/${tableId}/session/qrcode`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Submits a request to join an occupied table awaiting host approval.
   *
   * @param tableId Unique table identifier.
   * @param applicantSessionId Applicant guest session UUID.
   * @param applicantName Applicant guest nickname.
   * @returns Observable emitting the created {@link TableJoinRequest}.
   */
  submitJoinRequest(tableId: number, applicantSessionId: string, applicantName: string): Observable<TableJoinRequest> {
    return this.http.post<TableJoinRequest>(`${this.baseUrl}/${tableId}/session/join-request`, {
      tableId,
      applicantSessionId,
      applicantName,
    });
  }

  /**
   * Approves or rejects an applicant's request to join the table.
   *
   * @param tableId Unique table identifier.
   * @param requestId Join request record ID.
   * @param ownerSessionId Session UUID of the table host.
   * @param approved Whether host accepts the guest.
   * @returns Observable emitting the updated {@link TableJoinRequest}.
   */
  respondToJoinRequest(
    tableId: number,
    requestId: number,
    ownerSessionId: string,
    approved: boolean
  ): Observable<TableJoinRequest> {
    return this.http.post<TableJoinRequest>(`${this.baseUrl}/${tableId}/session/join-requests/${requestId}/respond`, {
      ownerSessionId,
      approved,
    });
  }

  /**
   * Queries current status of an applicant's join request.
   *
   * @param tableId Unique table identifier.
   * @param applicantSessionId Applicant guest session UUID.
   * @returns Observable emitting latest {@link TableJoinRequest} with token if approved.
   */
  getJoinRequestStatus(tableId: number, applicantSessionId: string): Observable<TableJoinRequest> {
    const params = new HttpParams().set('applicantSessionId', applicantSessionId);
    return this.http.get<TableJoinRequest>(`${this.baseUrl}/${tableId}/session/join-requests/status`, { params });
  }

  /**
   * Retrieves pending join requests awaiting host approval.
   *
   * @param tableId Unique table identifier.
   * @param ownerSessionId Session UUID of the table host.
   * @returns Observable emitting array of pending {@link TableJoinRequest}.
   */
  getPendingJoinRequests(tableId: number, ownerSessionId: string): Observable<TableJoinRequest[]> {
    const params = new HttpParams().set('ownerSessionId', ownerSessionId);
    return this.http.get<TableJoinRequest[]>(`${this.baseUrl}/${tableId}/session/join-requests/pending`, { params });
  }
}
