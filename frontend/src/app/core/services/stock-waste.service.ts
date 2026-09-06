import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockMovement, StockWasteRequest, StockWasteSummary } from '../models/stock-waste.model';

/**
 * Service managing HTTP REST interactions for stock shrinkage, breakage declarations,
 * and loss audit tracking in OpenBar.
 */
@Injectable({ providedIn: 'root' })
export class StockWasteService {
  private readonly apiUrl = `${environment.apiUrl}/stock`;
  private readonly http = inject(HttpClient);

  /**
   * Records a new stock waste, breakage, or loss event with immediate inventory deduction.
   *
   * @param request Payload containing target ingredient, quantity, reason, and optional notes
   * @returns Observable emitting the persisted StockMovement record
   */
  recordWaste(request: StockWasteRequest): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.apiUrl}/waste`, request);
  }

  /**
   * Retrieves all recorded stock shrinkage movements, optionally filtered by ingredient.
   *
   * @param ingredientId Optional filter for a specific ingredient ID
   * @returns Observable emitting the array of stock movements
   */
  getMovements(ingredientId?: number): Observable<StockMovement[]> {
    let params = new HttpParams();
    if (ingredientId != null) {
      params = params.set('ingredientId', ingredientId.toString());
    }
    return this.http.get<StockMovement[]>(`${this.apiUrl}/movements`, { params });
  }

  /**
   * Retrieves consolidated shrinkage metrics and financial loss breakdown by declared reason.
   *
   * @returns Observable emitting the StockWasteSummary metrics
   */
  getWasteSummary(): Observable<StockWasteSummary> {
    return this.http.get<StockWasteSummary>(`${this.apiUrl}/waste/summary`);
  }
}
