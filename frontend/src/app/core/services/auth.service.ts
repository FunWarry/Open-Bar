import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {environment} from '../../../environments/environment';
import {AuthResponse} from '../models/auth-response.model';
import {tap} from "rxjs/operators";

/**
 * Service Angular d'authentification HTTP et de gestion des jetons dans le LocalStorage.
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
   * Constructeur avec injection du client HTTP.
   *
   * @param http Client HttpClient d'Angular
   */
  constructor(private readonly http: HttpClient) {
  }

  /**
   * Authentifie un utilisateur via l'API REST backend.
   *
   * @param username Nom d'utilisateur
   * @param password Mot de passe
   * @returns Un {@link Observable} émettant la réponse d'authentification {@link AuthResponse}
   */
  login(username: string, password: string): Observable<AuthResponse> {
    if (this.inProgress) {
      return throwError(() => new Error('Une opération est déjà en cours'));
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
   * Déconnecte l'utilisateur en purgeant les jetons et le profil utilisateur du LocalStorage et de la session.
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
   * Récupère l'access token JWT stocké dans le LocalStorage.
   *
   * @returns Le token sous forme de chaîne de caractères ou {@code null} s'il est absent
   */
  getToken(): string | null {
    return this.inProgress ? null : localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Récupère le refresh token stocké dans le LocalStorage.
   *
   * @returns Le refresh token ou {@code null}
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Enregistre l'access token et le refresh token dans le LocalStorage.
   *
   * @param accessToken Nouveau jeton d'accès JWT
   * @param refreshToken Nouveau jeton de rafraîchissement
   */
  storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Récupère les données de l'utilisateur actuellement stocké en local.
   *
   * @returns L'objet utilisateur désérialisé ou {@code null}
   */
  getStoredUser() {
    if (this.inProgress) return null;

    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  /**
   * Sauvegarde les jetons et les informations utilisateur dans le stockage local.
   *
   * @param response Réponse d'authentification reçue du serveur
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
