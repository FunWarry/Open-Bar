import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {environment} from '../../../environments/environment';
import {AuthResponse} from '../models/auth-response.model';
import {tap} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private inProgress = false;

  constructor(
    private http: HttpClient
  ) {
  }

  login(username: string, password: string): Observable<AuthResponse> {
    if (this.inProgress) {
      return throwError(() => new Error('Une opération est déjà en cours'));
    }

    console.log('Appel login() service');
    this.inProgress = true;

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, {username, password}).pipe(
      tap({
        next: (response) => {
          // Stocker les données en local
          this.saveUserData(response);
          this.inProgress = false;
        },
        error: () => {
          this.inProgress = false;
        }
      })
    );
  }

  logout(): void {
    if (this.inProgress) {
      console.log('Opération déjà en cours');
      return;
    }

    this.inProgress = true;

    // Nettoyer le localStorage immédiatement
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    // Nettoyer le session storage
    sessionStorage.removeItem('store_hydrated');

    // Attendre avant de terminer le processus
    setTimeout(() => {
      this.inProgress = false;
    }, 1000);
  }

  getToken(): string | null {
    return this.inProgress ? null : localStorage.getItem(this.TOKEN_KEY);
  }

  getStoredUser() {
    if (this.inProgress) return null;

    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  private saveUserData(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
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
