import {Injectable} from '@angular/core';
import {HttpClient, HttpBackend} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {environment} from '../../../environments/environment';
import {AuthResponse} from '../models/auth-response.model';
import {tap} from "rxjs/operators";

/**
 * Angular authentication service handling HTTP requests and LocalStorage token persistence.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'auth_user';
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly rawHttp: HttpClient;
  private inProgress = false;

  /**
   * Constructs the service injecting HttpClient and HttpBackend.
   *
   * @param http Angular HttpClient
   * @param httpBackend Direct HTTP backend avoiding interceptor loops
   */
  constructor(
    private readonly http: HttpClient,
    httpBackend: HttpBackend
  ) {
    this.rawHttp = new HttpClient(httpBackend);
  }

  /**
   * Authenticates user against the backend REST API.
   *
   * @param username Username
   * @param password Password
   * @returns An {@link Observable} emitting {@link AuthResponse}
   */
  login(username: string, password: string): Observable<AuthResponse> {
    if (this.inProgress) {
      return throwError(() => new Error('An operation is already in progress'));
    }

    this.inProgress = true;

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, {username, password}).pipe(
      tap({
        next: (response) => {
          this.saveUserData(response);
          this.inProgress = false;
        },
        error: () => {
          this.inProgress = false;
        }
      })
    );
  }

  /**
   * Logs out user by clearing stored tokens and user profile from LocalStorage and session.
   */
  logout(): void {
    if (this.inProgress) return;

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('auth_session_start');
    localStorage.removeItem('auth_session_expiry');

    sessionStorage.removeItem('store_hydrated');
  }

  /**
   * Retrieves stored JWT access token from LocalStorage.
   *
   * @returns Token string or {@code null} if not found
   */
  getToken(): string | null {
    return this.inProgress ? null : localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Retrieves stored refresh token from LocalStorage.
   *
   * @returns Refresh token string or {@code null}
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Persists access token and refresh token into LocalStorage.
   *
   * @param accessToken Fresh JWT access token
   * @param refreshToken Fresh refresh token
   */
  storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Refreshes JWT access token using the stored refresh token.
   * Uses rawHttp to bypass interceptors and avoid recursive authentication calls.
   *
   * @returns Observable emitting fresh access and refresh tokens
   */
  refreshToken(): Observable<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.rawHttp.post<{ accessToken: string; refreshToken: string }>(
      `${this.API_URL}/refresh`,
      { refreshToken }
    ).pipe(
      tap({
        next: (tokens) => {
          this.storeTokens(tokens.accessToken, tokens.refreshToken);
        },
        error: () => {
          this.logout();
        }
      })
    );
  }

  /**
   * Retrieves stored user profile details.
   *
   * @returns Deserialized user object or {@code null}
   */
  getStoredUser() {
    if (this.inProgress) return null;

    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  /**
   * Saves tokens and profile details to LocalStorage.
   *
   * @param response Authentication response received from backend
   */
  private saveUserData(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    if (response.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    }
    const now = Date.now();
    localStorage.setItem('auth_session_start', String(now));
    localStorage.setItem('auth_session_expiry', String(now + 4 * 60 * 60 * 1000));

    localStorage.setItem(this.USER_KEY, JSON.stringify({
      id: response.id,
      email: response.email,
      username: response.username,
      roles: response.roles,
      enabled: response.enabled,
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt)
    }));
  }
}
