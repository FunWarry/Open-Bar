import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

  getStatus(): Observable<SetupStatus> {
    return this.http.get<SetupStatus>(`${this.api}/status`);
  }

  createAdmin(request: CreateAdminRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.api}/admin`, request);
  }
}
