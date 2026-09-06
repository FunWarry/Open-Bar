import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
/**
 * Status payload indicating whether initial setup has been completed.
 */

export interface SetupStatus {
  initialized: boolean;
  userCount: number;
}

export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
  nom?: string;
  prenom?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  nom?: string;
  prenom?: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class SetupService {
  private readonly api = `${environment.apiUrl}/setup`;
  private readonly http = inject(HttpClient);

  /**
   * Retrieves setup status indicating whether initial admin is provisioned.
   * @returns Observable emitting setup status
   */
  getStatus(): Observable<SetupStatus> {
    return this.http.get<SetupStatus>(`${this.api}/status`);
  }

  /**
   * Provisions the initial administrative account.
   * @param data Initial admin creation payload
   * @returns Observable emitting creation response
   */
  createAdmin(request: CreateAdminRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.api}/admin`, request);
  }
}
