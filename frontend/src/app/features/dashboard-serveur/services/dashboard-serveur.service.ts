import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardServeurService {
  // environment.apiUrl vaut déjà 'http://localhost:8080/api'
  private readonly tablesUrl = `${environment.apiUrl}/tables`;
  private readonly commandesUrl = `${environment.apiUrl}/commandes`;

  constructor(private http: HttpClient) {}

  getAllTables(): Observable<any[]> {
    return this.http.get<any[]>(this.tablesUrl);
  }

  getMesTables(serveurId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.tablesUrl}/serveur/${serveurId}`);
  }

  getCommandesByTable(tableId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.commandesUrl}/table/${tableId}`);
  }

  libererTable(tableId: number): Observable<any> {
    return this.http.post(`${this.tablesUrl}/${tableId}/liberer`, {});
  }
}
