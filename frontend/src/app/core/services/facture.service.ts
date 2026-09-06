import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Facture, ReglementRequest } from '../models/facture.model';
import { DailyRecap } from '../models/daily-recap.model';
import { ClotureCaisseRequest, DailyCashClosure } from '../models/daily-cash-closure.model';

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

  /**
   * Closes the daily register, records drawer counting, calculates discrepancies,
   * stamps a cryptographic SHA-256 seal, and locks subsequent billing actions.
   *
   * @param request Closure request data
   * @returns Observable of created DailyCashClosure
   */
  cloturerCaisse(request: ClotureCaisseRequest): Observable<DailyCashClosure> {
    return this.http.post<DailyCashClosure>(`${this.api}/recap/cloturer`, request);
  }

  /**
   * Retrieves all historical cash register closures.
   *
   * @returns Observable of closures list
   */
  getClotures(): Observable<DailyCashClosure[]> {
    return this.http.get<DailyCashClosure[]>(`${this.api}/clotures`);
  }

  /**
   * Retrieves a cash register closure by its identifier.
   *
   * @param id Closure ID
   * @returns Observable of DailyCashClosure
   */
  getClotureById(id: number): Observable<DailyCashClosure> {
    return this.http.get<DailyCashClosure>(`${this.api}/clotures/${id}`);
  }

  /**
   * Retrieves a cash register closure for a specific date if it exists.
   *
   * @param date ISO date string (YYYY-MM-DD)
   * @returns Observable of DailyCashClosure or null if not closed
   */
  getClotureByDate(date: string): Observable<DailyCashClosure | null> {
    const params = new HttpParams().set('date', date);
    return this.http.get<DailyCashClosure | null>(`${this.api}/clotures/by-date`, { params });
  }

  /**
   * Downloads the official certified Z-report PDF.
   *
   * @param id Closure ID
   * @returns Observable of binary Blob
   */
  downloadZReportPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/clotures/${id}/pdf`, { responseType: 'blob' });
  }

  /**
   * Downloads the standard French FEC (Fichier des Écritures Comptables) accounting export.
   *
   * @param id Closure ID
   * @returns Observable of text Blob
   */
  downloadFecExport(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/clotures/${id}/export/fec`, { responseType: 'blob' });
  }
}
