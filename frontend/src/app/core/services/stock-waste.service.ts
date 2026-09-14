import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockMovement, StockWasteRequest, StockWasteSummary } from '../models/stock-waste.model';
import { CsvColumn } from './csv-export.service';

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

  /**
   * Returns standardized CSV column definitions for exporting stock waste and shrinkage movements.
   *
   * @returns Array of column definitions for CsvExportService
   */
  getWasteMovementCsvColumns(): CsvColumn<StockMovement>[] {
    return [
      { key: 'id', header: 'ID' },
      { key: 'recordedAt', header: 'Date_Heure' },
      { key: 'ingredientNom', header: 'Ingredient' },
      { key: 'quantity', header: 'Quantite' },
      { key: 'unit', header: 'Unite' },
      { key: 'reason', header: 'Motif' },
      {
        key: 'reportedByUsername',
        header: 'Declarant',
        formatter: (val) => (typeof val === 'string' && val.length > 0 ? val : 'SYSTEM')
      },
      {
        key: 'cost',
        header: 'Cout_EUR',
        formatter: (val) => (val != null ? Number(val).toFixed(2) : '0.00')
      },
      { key: 'notes', header: 'Notes' }
    ];
  }
}
