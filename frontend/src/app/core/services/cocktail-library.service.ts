import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CocktailLibraryItem,
  CocktailLibraryFilterParams,
  CocktailLibraryImportRequest,
  CocktailLibraryImportResult,
  CocktailConnectionWheelData
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

  private readonly CACHE_KEY_PREFIX = 'openbar_cocktail_wheel_';

  /**
   * Retrieves synchronously cached wheel data from localStorage if available.
   *
   * @param scope Scope of the connection wheel ('LIBRARY' or 'ESTABLISHMENT')
   * @returns Cached dataset or null
   */
  getCachedWheelData(scope: 'LIBRARY' | 'ESTABLISHMENT' = 'LIBRARY'): CocktailConnectionWheelData | null {
    if (typeof localStorage === 'undefined') return null;
    const cacheKey = `${this.CACHE_KEY_PREFIX}${scope.toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached) as CocktailConnectionWheelData;
      if (!parsed || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the flavor pairing connection wheel dataset for the requested scope.
   * Employs browser localStorage caching for immediate offline accessibility,
   * performs network synchronization, and falls back to offline assets gracefully.
   *
   * @param scope Scope of the connection wheel ('LIBRARY' or 'ESTABLISHMENT')
   * @returns Observable emitting full connection wheel graph dataset
   */
  getWheelData(scope: 'LIBRARY' | 'ESTABLISHMENT' = 'LIBRARY'): Observable<CocktailConnectionWheelData> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${scope.toLowerCase()}`;
    const localData = this.getCachedWheelData(scope);

    const params = new HttpParams().set('scope', scope);
    return this.http.get<CocktailConnectionWheelData>(`${this.api}/wheel`, { params }).pipe(
      tap((data: CocktailConnectionWheelData) => {
        if (data && Array.isArray(data.nodes) && data.nodes.length > 0 && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch {
            // Ignore storage quota warnings
          }
        }
      }),
      catchError(() => {
        if (localData) {
          return of(localData);
        }
        if (scope === 'LIBRARY') {
          return this.http.get<CocktailConnectionWheelData>('assets/data/cocktail-connection-wheel.json');
        }
        return of({
          categories: {},
          nodes: [],
          edges: []
        });
      })
    );
  }
}

