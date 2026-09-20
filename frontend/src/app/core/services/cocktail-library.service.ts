import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CocktailLibraryItem,
  CocktailLibraryFilterParams,
  CocktailLibraryImportRequest,
  CocktailLibraryImportResult
} from '../models/cocktail-library.model';

/**
 * Service managing base cocktail library catalog operations, recipe querying, and batch imports.
 */
@Injectable({
  providedIn: 'root'
})
export class CocktailLibraryService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/cocktails/library`;

  /**
   * Retrieves available standard cocktail templates matching optional filter criteria.
   *
   * @param params Optional filter query parameters
   * @returns Observable emitting array of matching library cocktail templates
   */
  getLibraryCocktails(params?: CocktailLibraryFilterParams): Observable<CocktailLibraryItem[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.category && params.category !== 'ALL') {
        httpParams = httpParams.set('category', params.category);
      }
      if (params.baseSpirit && params.baseSpirit !== 'ALL') {
        httpParams = httpParams.set('baseSpirit', params.baseSpirit);
      }
      if (params.flavor && params.flavor !== 'ALL') {
        httpParams = httpParams.set('flavor', params.flavor);
      }
      if (params.mocktail !== undefined) {
        httpParams = httpParams.set('mocktail', String(params.mocktail));
      }
      if (params?.search?.trim()) {
        httpParams = httpParams.set('search', params.search.trim());
      }
    }
    return this.http.get<CocktailLibraryItem[]>(this.api, { params: httpParams });
  }

  /**
   * Batch imports selected cocktail templates into the establishment's active catalog and inventory.
   *
   * @param request Batch import request containing cocktail IDs or names
   * @returns Observable emitting detailed import outcome report
   */
  importCocktails(request: CocktailLibraryImportRequest): Observable<CocktailLibraryImportResult> {
    return this.http.post<CocktailLibraryImportResult>(`${this.api}/import`, request);
  }
}
