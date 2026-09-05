import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cocktail, CocktailFacets, FlavorProfile } from '../models/cocktail.model';

/**
 * Service managing cocktail catalog, availability, photo uploads, recipe facets, and flavor matcher.
 */
@Injectable({ providedIn: 'root' })
export class CocktailService {
  private readonly api = `${environment.apiUrl}/cocktails`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<Cocktail[]> {
    return this.http.get<Cocktail[]>(this.api);
  }

  getById(id: number): Observable<Cocktail> {
    return this.http.get<Cocktail>(`${this.api}/${id}`);
  }

  create(cocktail: Partial<Cocktail>): Observable<Cocktail> {
    return this.http.post<Cocktail>(this.api, cocktail);
  }

  update(id: number, cocktail: Partial<Cocktail>): Observable<Cocktail> {
    return this.http.put<Cocktail>(`${this.api}/${id}`, cocktail);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  toggleDisponibilite(id: number): Observable<Cocktail> {
    return this.http.put<Cocktail>(`${this.api}/${id}/disponibilite`, {});
  }

  search(nom: string): Observable<Cocktail[]> {
    return this.http.get<Cocktail[]>(`${this.api}/search`, { params: { nom } });
  }

  getDisponibles(): Observable<Cocktail[]> {
    return this.http.get<Cocktail[]>(`${this.api}/disponibles`);
  }

  updateSaisonnalite(id: number, moisDebut: number | null, moisFin: number | null): Observable<Cocktail> {
    return this.http.patch<Cocktail>(`${this.api}/${id}/saisonnalite`, { moisDebut, moisFin });
  }

  uploadImage(id: number, file: File): Observable<Cocktail> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Cocktail>(`${this.api}/${id}/image`, formData);
  }

  /**
   * Retrieves aggregated catalog facet metrics for flavor profiles and dietary filters.
   *
   * @returns Observable of CocktailFacets containing counts and ranges
   */
  getFacets(): Observable<CocktailFacets> {
    return this.http.get<CocktailFacets>(`${this.api}/facets`);
  }

  /**
   * Queries the interactive cocktail matcher with selected flavor profiles and dietary constraints.
   *
   * @param filters Optional filtering parameters (flavors, mocktail, vegan, glutenFree, lowAbv, maxAlcohol)
   * @returns Observable list of ranked matching cocktails
   */
  matchCocktails(filters: {
    flavors?: FlavorProfile[];
    mocktail?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    lowAbv?: boolean;
    maxAlcohol?: number;
  }): Observable<Cocktail[]> {
    let params = new HttpParams();
    if (filters.flavors && filters.flavors.length > 0) {
      params = params.set('flavors', filters.flavors.join(','));
    }
    if (filters.mocktail != null) {
      params = params.set('mocktail', String(filters.mocktail));
    }
    if (filters.vegan != null) {
      params = params.set('vegan', String(filters.vegan));
    }
    if (filters.glutenFree != null) {
      params = params.set('glutenFree', String(filters.glutenFree));
    }
    if (filters.lowAbv != null) {
      params = params.set('lowAbv', String(filters.lowAbv));
    }
    if (filters.maxAlcohol != null) {
      params = params.set('maxAlcohol', String(filters.maxAlcohol));
    }

    return this.http.get<Cocktail[]>(`${this.api}/matcher`, { params });
  }
}

