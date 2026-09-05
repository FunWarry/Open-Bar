import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CommandeView } from '../models/commande-view.model';
import { Cocktail } from '../../../core/models/cocktail.model';
import { Ingredient } from '../../../core/models/ingredient.model';

/**
 * Service managing real-time counter barman operations including order fetching by status,
 * state transitions, rapid out-of-stock toggles ("Quick Out-of-Stock"), and recipe lookups.
 */
@Injectable({ providedIn: 'root' })
export class DashboardBarmanService {
  private readonly apiUrl = `${environment.apiUrl}/commandes`;
  private readonly cocktailsUrl = `${environment.apiUrl}/cocktails`;
  private readonly ingredientsUrl = `${environment.apiUrl}/ingredients`;

  private readonly http = inject(HttpClient);

  /**
   * Fetches all orders currently in pending status (EN_ATTENTE).
   *
   * @returns Observable emitting pending orders array.
   */
  getCommandesEnAttente(): Observable<CommandeView[]> {
    return this.http.get<CommandeView[]>(`${this.apiUrl}/statut/EN_ATTENTE`);
  }

  /**
   * Fetches all orders currently in preparation status (EN_PREPARATION).
   *
   * @returns Observable emitting in-preparation orders array.
   */
  getCommandesEnPreparation(): Observable<CommandeView[]> {
    return this.http.get<CommandeView[]>(`${this.apiUrl}/statut/EN_PREPARATION`);
  }

  /**
   * Fetches all orders currently in ready status (PRET).
   *
   * @returns Observable emitting ready orders array.
   */
  getCommandesPret(): Observable<CommandeView[]> {
    return this.http.get<CommandeView[]>(`${this.apiUrl}/statut/PRET`);
  }

  /**
   * Updates the workflow status of an order (e.g. EN_PREPARATION, PRET, ANNULEE).
   *
   * @param id Order unique identifier
   * @param statut Target status string
   * @returns Observable emitting the updated order
   */
  changerStatut(id: number, statut: string): Observable<CommandeView> {
    return this.http.put<CommandeView>(`${this.apiUrl}/${id}/statut`, statut);
  }

  /**
   * Fetches all registered cocktails for quick availability management and recipes.
   *
   * @returns Observable emitting all cocktails.
   */
  getCocktails(): Observable<Cocktail[]> {
    return this.http.get<Cocktail[]>(this.cocktailsUrl);
  }

  /**
   * Fetches detailed recipe and ingredients for a specific cocktail.
   *
   * @param id Cocktail unique identifier
   * @returns Observable emitting full cocktail details
   */
  getCocktailById(id: number): Observable<Cocktail> {
    return this.http.get<Cocktail>(`${this.cocktailsUrl}/${id}`);
  }

  /**
   * Toggles the availability status of a cocktail on the fly during service.
   *
   * @param id Cocktail identifier
   * @returns Observable emitting updated cocktail
   */
  toggleCocktailDisponibilite(id: number): Observable<Cocktail> {
    return this.http.put<Cocktail>(`${this.cocktailsUrl}/${id}/disponibilite`, {});
  }

  /**
   * Fetches all inventory ingredients for stock overview and quick depletion toggles.
   *
   * @returns Observable emitting all ingredients.
   */
  getIngredients(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(this.ingredientsUrl);
  }

  /**
   * Quickly updates the stock quantity of an ingredient.
   *
   * @param id Ingredient identifier
   * @param quantite New stock quantity
   * @returns Observable emitting updated ingredient
   */
  updateIngredientStock(id: number, quantite: number): Observable<Ingredient> {
    return this.http.patch<Ingredient>(`${this.ingredientsUrl}/${id}/stock`, { quantite });
  }
}
