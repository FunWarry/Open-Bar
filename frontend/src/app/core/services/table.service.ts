import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TableBar } from '../models/table.model';

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly api = `${environment.apiUrl}/tables`;
  private http = inject(HttpClient);

  getAll(): Observable<TableBar[]> {
    return this.http.get<TableBar[]>(this.api);
  }

  getById(id: number): Observable<TableBar> {
    return this.http.get<TableBar>(`${this.api}/${id}`);
  }

  create(table: Partial<TableBar>): Observable<TableBar> {
    return this.http.post<TableBar>(this.api, table);
  }

  update(id: number, table: Partial<TableBar>): Observable<TableBar> {
    return this.http.put<TableBar>(`${this.api}/${id}`, table);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  occuper(id: number, serveurId?: number): Observable<TableBar> {
    return this.http.patch<TableBar>(`${this.api}/${id}/occuper`, { serveurId });
  }

  liberer(id: number): Observable<TableBar> {
    return this.http.patch<TableBar>(`${this.api}/${id}/liberer`, {});
  }

  getLibres(): Observable<TableBar[]> {
    return this.http.get<TableBar[]>(`${this.api}/libres`);
  }

  getOccupees(): Observable<TableBar[]> {
    return this.http.get<TableBar[]>(`${this.api}/occupees`);
  }
}
