import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppSettings, AppSettingsUpdateRequest } from '../models/app-settings.model';

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly api = `${environment.apiUrl}/settings`;
  private http = inject(HttpClient);

  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.api).pipe(tap(settings => this.applyTokens(settings)));
  }

  updateSettings(request: AppSettingsUpdateRequest): Observable<AppSettings> {
    return this.http.put<AppSettings>(this.api, request).pipe(tap(settings => this.applyTokens(settings)));
  }

  /** Injecte les couleurs personnalisées comme custom properties CSS, en surcouche des tokens par défaut. */
  applyTokens(settings: AppSettings): void {
    const root = document.documentElement;
    root.style.setProperty('--primary', settings.primaryColor);
    root.style.setProperty('--primary-strong', settings.primaryColorStrong);
  }
}
