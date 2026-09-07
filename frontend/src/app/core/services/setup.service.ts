import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Status payload indicating whether initial setup has been completed.
 */
export interface SetupStatus {
  initialized: boolean;
  userCount: number;
}

/**
 * Request payload for administrative account creation during initial setup.
 */
export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
  nom?: string;
  prenom?: string;
}

/**
 * Response payload representing an authenticated user identity.
 */
export interface UserResponse {
  id: number;
  username: string;
  email: string;
  nom?: string;
  prenom?: string;
  roles: string[];
}

/**
 * Service managing establishment initial configuration status and administrator provisioning.
 * Features in-memory caching of initialization status to avoid redundant HTTP latency on route transitions.
 */
@Injectable({ providedIn: 'root' })
export class SetupService {
  private readonly api = `${environment.apiUrl}/setup`;
  private readonly http = inject(HttpClient);
  private cachedStatus: SetupStatus | null = null;

  /**
   * Retrieves setup status indicating whether initial admin is provisioned.
   * If setup is already initialized, returns cached status immediately without HTTP latency.
   *
   * @param forceRefresh Set to true to bypass in-memory cache and query backend directly
   * @returns Observable emitting setup status
   */
  getStatus(forceRefresh = false): Observable<SetupStatus> {
    if (!forceRefresh && this.cachedStatus?.initialized) {
      return of(this.cachedStatus);
    }
    return this.http.get<SetupStatus>(`${this.api}/status`).pipe(
      tap(status => {
        if (status.initialized) {
          this.cachedStatus = status;
        }
      })
    );
  }

  /**
   * Clears the in-memory cached setup status.
   */
  clearCache(): void {
    this.cachedStatus = null;
  }

  /**
   * Provisions the initial administrative account.
   * Updates in-memory setup status on successful creation.
   *
   * @param request Initial admin creation payload
   * @returns Observable emitting creation response
   */
  createAdmin(request: CreateAdminRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.api}/admin`, request).pipe(
      tap(() => {
        this.cachedStatus = { initialized: true, userCount: 1 };
      })
    );
  }
}

