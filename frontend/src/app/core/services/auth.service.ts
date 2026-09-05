import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
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
  private inProgress = false;

  /**
   * Constructs the service injecting HttpClient.
   *
   * @param http Angular HttpClient
   */
  constructor(private readonly http: HttpClient) {
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
    if (this.inProgress) {
      return;
    }

    this.inProgress = true;

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    sessionStorage.removeItem('store_hydrated');

    setTimeout(() => {
      this.inProgress = false;
    }, 1000);
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
