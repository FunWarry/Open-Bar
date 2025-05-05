import {Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Store} from '@ngrx/store';
import {Observable, tap} from 'rxjs';
import {environment} from '../../../environments/environment';
import {User} from '../models/user.model';
import {AuthResponse} from '../models/auth-response.model';
import * as AuthActions from '../store/auth.actions';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly API_URL = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private store: Store
  ) {
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, {username: username, password}).pipe(
      tap(response => {
        this.setToken(response.token);
        this.store.dispatch(AuthActions.loginSuccess({
          user: {
            id: response.id,
            email: response.email,
            username: response.username,
            roles: response.roles,
            enabled: response.enabled,
            createdAt: new Date(response.createdAt),
            updatedAt: new Date(response.updatedAt)
          },
          token: response.token
        }));
      })
    );
  }

  register(userData: Partial<User>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, userData).pipe(
      tap(response => {
        this.setToken(response.token);
        this.store.dispatch(AuthActions.loginSuccess({
          user: {
            id: response.id,
            email: response.email,
            username: response.username,
            roles: response.roles,
            enabled: response.enabled,
            createdAt: new Date(response.createdAt),
            updatedAt: new Date(response.updatedAt)
          },
          token: response.token
        }));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.store.dispatch(AuthActions.logout());
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded.exp > Date.now() / 1000;
    } catch (e) {
      return false;
    }
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }
}
