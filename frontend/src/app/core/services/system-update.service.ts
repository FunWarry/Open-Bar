import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SystemVersionInfo,
  SystemUpdateCheck,
  SystemUpdateStatus,
  SystemPreFlight,
  SystemSnapshot,
  SystemUpdateRequest,
  UpdateChannel,
} from '../models/system-update.model';
import { environment } from '../../../environments/environment';

/**
 * Service managing Over-The-Air system updates, release discovery via GitHub API,
 * host pre-flight verification, and snapshot disaster recovery.
 */
@Injectable({
  providedIn: 'root',
})
export class SystemUpdateService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/system`;

  /**
   * Retrieves current system version and diagnostic platform metrics.
   *
   * @returns Observable emitting {@link SystemVersionInfo}
   */
  getVersionInfo(): Observable<SystemVersionInfo> {
    return this.http.get<SystemVersionInfo>(`${this.apiUrl}/version`);
  }

  /**
   * Queries GitHub Releases to discover new versions on the chosen channel.
   *
   * @param channel Release channel to check (STABLE or BETA)
   * @returns Observable emitting {@link SystemUpdateCheck}
   */
  checkForUpdates(channel: UpdateChannel = 'STABLE'): Observable<SystemUpdateCheck> {
    const params = new HttpParams().set('channel', channel);
    return this.http.get<SystemUpdateCheck>(`${this.apiUrl}/check-update`, { params });
  }

  /**
   * Retrieves active or recent OTA update progress status and logs.
   *
   * @returns Observable emitting {@link SystemUpdateStatus}
   */
  getUpdateStatus(): Observable<SystemUpdateStatus> {
    return this.http.get<SystemUpdateStatus>(`${this.apiUrl}/status`);
  }

  /**
   * Evaluates pre-flight safety validations (disk capacity and active bar activity).
   *
   * @returns Observable emitting {@link SystemPreFlight}
   */
  getPreFlight(): Observable<SystemPreFlight> {
    return this.http.get<SystemPreFlight>(`${this.apiUrl}/preflight`);
  }

  /**
   * Initiates an automated Over-The-Air software update in the background.
   *
   * @param request Update parameters
   * @returns Observable emitting initial {@link SystemUpdateStatus}
   */
  triggerUpdate(request: SystemUpdateRequest): Observable<SystemUpdateStatus> {
    return this.http.post<SystemUpdateStatus>(`${this.apiUrl}/update`, request);
  }

  /**
   * Lists archived pre-update snapshots available for rollback.
   *
   * @returns Observable emitting list of {@link SystemSnapshot}
   */
  listSnapshots(): Observable<SystemSnapshot[]> {
    return this.http.get<SystemSnapshot[]>(`${this.apiUrl}/snapshots`);
  }

  /**
   * Restores an archived database snapshot and rolls back container versions.
   *
   * @param id Snapshot identifier to restore
   * @returns Observable emitting confirmation message
   */
  restoreSnapshot(id: string): Observable<{ message: string; snapshotId: string }> {
    return this.http.post<{ message: string; snapshotId: string }>(`${this.apiUrl}/snapshots/${id}/restore`, {});
  }

  /**
   * Permanently deletes a backup snapshot from local storage.
   *
   * @param id Snapshot identifier to delete
   * @returns Observable emitting void
   */
  deleteSnapshot(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/snapshots/${id}`);
  }
}
