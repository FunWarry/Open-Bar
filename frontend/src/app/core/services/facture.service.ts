import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Facture, ReglementRequest } from '../models/facture.model';
import { DailyRecap } from '../models/daily-recap.model';

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

  /**
   * Fetches the daily closing financial summary report (Z-Report) for a specific date.
   *
   * @param date Optional ISO date string (YYYY-MM-DD)
   */
  getDailyRecap(date?: string): Observable<DailyRecap> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<DailyRecap>(`${this.api}/daily-recap`, { params });
  }

  /**
   * Downloads the daily closing financial summary report PDF.
   *
   * @param date Optional ISO date string (YYYY-MM-DD)
   */
  downloadDailyRecapPdf(date?: string): Observable<Blob> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get(`${this.api}/daily-recap/pdf`, { params, responseType: 'blob' });
  }
}
