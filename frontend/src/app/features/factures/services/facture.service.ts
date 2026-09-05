import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Facture, FactureReglement, EncaisserPartRequest } from '../models/facture.model';

export interface SplitItemDTO {
  itemId: number;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface SplitResultDTO {
  factureId: number;
  nomConvive: string;
  items: SplitItemDTO[];
  sousTotal: number;
  totalAvecPourboire: number;
}

export interface SplitPartItemRequest {
  itemId: number;
  quantite?: number;
}

export interface SplitPartRequest {
  nomConvive: string;
  itemIds?: number[];
  items?: SplitPartItemRequest[];
}

@Injectable({ providedIn: 'root' })
export class FactureService {
  private readonly apiUrl = `${environment.apiUrl}/factures`;

  constructor(private readonly http: HttpClient) {}

  getAllFactures(): Observable<Facture[]> {
    return this.http.get<Facture[]>(this.apiUrl);
  }

  getFactureById(id: number): Observable<Facture> {
    return this.http.get<Facture>(`${this.apiUrl}/${id}`);
  }

  getFacturesByTable(tableId: number): Observable<Facture[]> {
    return this.http.get<Facture[]>(`${this.apiUrl}/table/${tableId}`);
  }

  getFacturesByDate(debut: string, fin: string): Observable<Facture[]> {
    const params = new HttpParams().set('debut', debut).set('fin', fin);
    return this.http.get<Facture[]>(`${this.apiUrl}/date`, { params });
  }

  reglerFacture(id: number, modePaiement: string, pourboire?: number): Observable<Facture> {
    let params = new HttpParams().set('modePaiement', modePaiement);
    if (pourboire !== undefined && pourboire > 0) {
      params = params.set('pourboire', pourboire.toString());
    }
    return this.http.post<Facture>(`${this.apiUrl}/${id}/regler`, null, { params });
  }

  splitEgal(id: number, nombreConvives: number): Observable<SplitResultDTO[]> {
    return this.http.post<SplitResultDTO[]>(`${this.apiUrl}/${id}/split/egal`, { nombreConvives });
  }

  splitParSelection(id: number, parts: SplitPartRequest[]): Observable<SplitResultDTO[]> {
    return this.http.post<SplitResultDTO[]>(`${this.apiUrl}/${id}/split/selection`, { parts });
  }

  /**
   * Persists an individual split share settlement to the backend database.
   *
   * @param factureId Target invoice ID
   * @param request Settlement details for this specific guest part
   * @returns Observable of saved FactureReglement
   */
  encaisserPart(factureId: number, request: EncaisserPartRequest): Observable<FactureReglement> {
    return this.http.post<FactureReglement>(`${this.apiUrl}/${factureId}/split/encaisser`, request);
  }

  /**
   * Retrieves all recorded split share settlements for a given invoice.
   *
   * @param factureId Target invoice ID
   * @returns Observable of FactureReglement list
   */
  getReglements(factureId: number): Observable<FactureReglement[]> {
    return this.http.get<FactureReglement[]>(`${this.apiUrl}/${factureId}/reglements`);
  }
}
