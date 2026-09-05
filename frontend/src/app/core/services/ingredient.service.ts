import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ingredient } from '../models/ingredient.model';

/**
 * Service managing HTTP REST API interactions for Ingredient entities in OpenBar.
 * Provides CRUD operations, stock level updates, alert threshold configurations, and search queries.
 */
@Injectable({ providedIn: 'root' })
export class IngredientService {
  private readonly api = `${environment.apiUrl}/ingredients`;
  private readonly http = inject(HttpClient);

  /**
   * Fetches all registered ingredients from the backend database.
   *
   * @returns Observable emitting an array of Ingredient models.
   */
  getAll(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(this.api);
  }

  /**
   * Fetches a specific ingredient by its unique numeric identifier.
   *
   * @param id - Numeric ID of the target ingredient.
   * @returns Observable emitting the matching Ingredient model.
   */
  getById(id: number): Observable<Ingredient> {
    return this.http.get<Ingredient>(`${this.api}/${id}`);
  }

  /**
   * Creates a new ingredient in the backend inventory system.
   *
   * @param ingredient - Partial payload containing mandatory fields (nom, uniteMesure, quantiteStock, seuilAlerte).
   * @returns Observable emitting the newly created Ingredient model.
   */
  create(ingredient: Partial<Ingredient>): Observable<Ingredient> {
    return this.http.post<Ingredient>(this.api, ingredient);
  }

  /**
   * Updates an existing ingredient's metadata and stock limits.
   *
   * @param id - Numeric ID of the ingredient to modify.
   * @param ingredient - Partial payload containing updated fields.
   * @returns Observable emitting the updated Ingredient model.
   */
  update(id: number, ingredient: Partial<Ingredient>): Observable<Ingredient> {
    return this.http.put<Ingredient>(`${this.api}/${id}`, ingredient);
  }

  /**
   * Deletes an ingredient from the inventory by its ID.
   *
   * @param id - Numeric ID of the ingredient to remove.
   * @returns Observable emitting void upon successful deletion.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  /**
   * Adjusts the current stock quantity for an ingredient.
   *
   * @param id - Numeric ID of the target ingredient.
   * @param quantite - The new absolute stock quantity.
   * @returns Observable emitting the updated Ingredient model.
   */
  updateStock(id: number, quantite: number): Observable<Ingredient> {
    return this.http.patch<Ingredient>(`${this.api}/${id}/stock`, { quantite });
  }

  /**
   * Updates the low-stock alert threshold for an ingredient.
   *
   * @param id - Numeric ID of the target ingredient.
   * @param seuil - Minimum stock quantity triggering low-stock alert.
   * @returns Observable emitting the updated Ingredient model.
   */
  setSeuilAlerte(id: number, seuil: number): Observable<Ingredient> {
    return this.http.patch<Ingredient>(`${this.api}/${id}/seuil-alerte`, { seuil });
  }

  /**
   * Searches for ingredients matching a name query string.
   *
   * @param nom - Name substring to search for.
   * @returns Observable emitting matching Ingredient models.
   */
  search(nom: string): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(`${this.api}/search`, { params: { nom } });
  }

  /**
   * Retrieves all ingredients currently operating below their configured low-stock alert threshold.
   *
   * @returns Observable emitting an array of low-stock Ingredient models.
   */
  getEnAlerte(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(`${this.api}/alerte`);
  }
}
