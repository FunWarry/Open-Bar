import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Facture, ReglementRequest } from '../models/facture.model';

@Injectable({ providedIn: 'root' })
export class FactureService {
  private readonly api = `${environment.apiUrl}/factures`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<Facture[]> {
    return this.http.get<Facture[]>(this.api);
  }

  getById(id: number): Observable<Facture> {
    return this.http.get<Facture>(`${this.api}/${id}`);
  }

  getByTable(tableId: number): Observable<Facture[]> {
    return this.http.get<Facture[]>(`${this.api}/table/${tableId}`);
  }

  create(tableId: number): Observable<Facture> {
    return this.http.post<Facture>(this.api, { tableId });
  }

  ajouterItem(factureId: number, item: { cocktailId: number; quantite: number }): Observable<Facture> {
    return this.http.post<Facture>(`${this.api}/${factureId}/items`, item);
  }

  retirerItem(factureId: number, itemId: number): Observable<Facture> {
    return this.http.delete<Facture>(`${this.api}/${factureId}/items/${itemId}`);
  }

  regler(factureId: number, reglement: ReglementRequest): Observable<Facture> {
    return this.http.patch<Facture>(`${this.api}/${factureId}/regler`, reglement);
  }

  ajouterPourboire(factureId: number, pourboire: number): Observable<Facture> {
    return this.http.patch<Facture>(`${this.api}/${factureId}/pourboire`, { pourboire });
  }
}
