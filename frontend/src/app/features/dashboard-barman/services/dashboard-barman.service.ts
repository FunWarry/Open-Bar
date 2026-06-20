import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardBarmanService {
  // environment.apiUrl vaut déjà 'http://localhost:8080/api'
  private readonly apiUrl = `${environment.apiUrl}/commandes`;

  constructor(private http: HttpClient) {}

  getCommandesEnAttente(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/statut/EN_ATTENTE`);
  }

  getCommandesEnPreparation(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/statut/EN_PREPARATION`);
  }

  getCommandesPret(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/statut/PRET`);
  }

  changerStatut(id: number, statut: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/statut`, statut);
  }
}
