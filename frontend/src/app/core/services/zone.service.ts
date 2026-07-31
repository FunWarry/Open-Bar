import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ZoneBar {
  id?: number;
  nom: string;
  etage: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ZoneService {
  private readonly api = `${environment.apiUrl}/zones`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<ZoneBar[]> {
    return this.http.get<ZoneBar[]>(this.api);
  }

  getById(id: number): Observable<ZoneBar> {
    return this.http.get<ZoneBar>(`${this.api}/${id}`);
  }

  create(zone: Partial<ZoneBar>): Observable<ZoneBar> {
    return this.http.post<ZoneBar>(this.api, zone);
  }

  update(id: number, zone: Partial<ZoneBar>): Observable<ZoneBar> {
    return this.http.put<ZoneBar>(`${this.api}/${id}`, zone);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
