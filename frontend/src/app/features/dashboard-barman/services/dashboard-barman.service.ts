import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CommandeView, CommandeItemView } from '../models/commande-view.model';
import { CocktailBatchView } from '../models/batch-preparation.model';
import { Cocktail } from '../../../core/models/cocktail.model';
import { Ingredient } from '../../../core/models/ingredient.model';

export type DashboardStationFilter = 'ALL' | 'BAR' | 'KITCHEN';

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
   * Updates the workflow status of a specific order line item.
   *
   * @param commandeId Order unique identifier
   * @param itemId Line item unique identifier
   * @param statut Target status string (EN_PREPARATION, PRET, etc.)
   * @returns Observable emitting the updated order view
   */
  changerItemStatut(commandeId: number, itemId: number, statut: string): Observable<CommandeView> {
    return this.http.patch<CommandeView>(`${this.apiUrl}/${commandeId}/items/${itemId}/statut`, { statut });
  }

  /**
   * Fetches active orders filtered by preparation workstation station.
   *
   * @param station Workstation station (BAR, KITCHEN, SNACK)
   * @returns Observable emitting array of active order views
   */
  getCommandesByStation(station: string): Observable<CommandeView[]> {
    return this.http.get<CommandeView[]>(`${this.apiUrl}/station/${station}`);
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

  /**
   * Executes a batch preparation status transition across multiple order line items.
   *
   * @param payload Target item IDs or cocktail ID and new status
   * @returns Observable emitting updated order views
   */
  transitionBatch(payload: {
    itemIds?: number[];
    cocktailId?: number;
    statut: string;
  }): Observable<CommandeView[]> {
    return this.http.post<CommandeView[]>(`${this.apiUrl}/batch/transition`, payload);
  }

  /**
   * Aggregates active drink order lines across different tables into unified recipe batches for Rush Mode.
   *
   * @param enAttente List of orders in pending status
   * @param enPreparation List of orders in preparation status
   * @param options Filtering options (search, urgency, station)
   * @returns Array of aggregated cocktail batches
   */
  aggregateBatches(
    enAttente: CommandeView[],
    enPreparation: CommandeView[],
    options: {
      searchTerm?: string;
      urgentOnly?: boolean;
      stationFilter?: DashboardStationFilter;
      alertThresholdMs?: number;
    } = {}
  ): CocktailBatchView[] {
    const {
      searchTerm = '',
      urgentOnly = false,
      stationFilter = 'ALL',
      alertThresholdMs = 5 * 60 * 1000
    } = options;

    const query = searchTerm.toLowerCase().trim();
    const now = Date.now();
    const batchMap = new Map<string, CocktailBatchView>();
    const allOrders = [...(enAttente || []), ...(enPreparation || [])];

    for (const cmd of allOrders) {
      if (!cmd.items || cmd.items.length === 0) continue;

      const orderCreatedTime = cmd.dateCommande ? new Date(cmd.dateCommande).getTime() : now;
      const isOrderUrgent = Boolean(cmd.prioritaire || (now - orderCreatedTime > alertThresholdMs));
      if (urgentOnly && !isOrderUrgent) continue;

      const tableName = cmd.tableNom || (cmd.tableNumero ? `Table ${cmd.tableNumero}` : `Commande #${cmd.id}`);
      this.processCmdItems(batchMap, cmd, tableName, isOrderUrgent, stationFilter, query, now);
    }

    return this.finalizeAndSortBatches(Array.from(batchMap.values()));
  }

  private processCmdItems(
    batchMap: Map<string, CocktailBatchView>,
    cmd: CommandeView,
    tableName: string,
    isOrderUrgent: boolean,
    stationFilter: DashboardStationFilter,
    query: string,
    now: number
  ): void {
    for (const item of cmd.items) {
      const itemStatut = item.statut || cmd.statut;
      if (this.isTerminalStatus(itemStatut)) continue;
      if (!this.matchesStationFilter(item.station || 'BAR', stationFilter)) continue;
      if (query && !this.matchesQuery(item, tableName, cmd.id, query)) continue;

      this.processSingleItem(batchMap, cmd, item, itemStatut, tableName, isOrderUrgent, now);
    }
  }

  private isTerminalStatus(status?: string): boolean {
    return status === 'PRET' || status === 'LIVREE' || status === 'REGLEE' || status === 'ANNULEE';
  }

  private matchesStationFilter(itemStation: string, stationFilter: DashboardStationFilter): boolean {
    if (stationFilter === 'ALL') return true;
    if (stationFilter === 'KITCHEN') {
      return itemStation === 'KITCHEN' || itemStation === 'SNACK';
    }
    return itemStation === stationFilter;
  }

  private matchesQuery(item: CommandeItemView, tableName: string, cmdId: number, query: string): boolean {
    return (
      item.cocktailNom.toLowerCase().includes(query) ||
      Boolean(item.varianteNom?.toLowerCase().includes(query)) ||
      Boolean(item.notes?.toLowerCase().includes(query)) ||
      tableName.toLowerCase().includes(query) ||
      String(cmdId).includes(query)
    );
  }

  private processSingleItem(
    batchMap: Map<string, CocktailBatchView>,
    cmd: CommandeView,
    item: CommandeItemView,
    itemStatut: string,
    tableName: string,
    isOrderUrgent: boolean,
    now: number
  ): void {
    const key = item.cocktailNom.trim().toLowerCase();
    const batch = this.getOrCreateBatch(batchMap, key, item, cmd);

    batch.totalQuantity += item.quantite;
    if (itemStatut === 'EN_PREPARATION') {
      batch.preparingQuantity += item.quantite;
    } else {
      batch.pendingQuantity += item.quantite;
    }

    if (isOrderUrgent || item.prioritaire) {
      batch.isUrgent = true;
    }

    if (cmd.dateCommande) {
      const itemDate = new Date(cmd.dateCommande).getTime();
      const curEarliest = batch.earliestOrderDate ? new Date(batch.earliestOrderDate).getTime() : now;
      if (itemDate < curEarliest) {
        batch.earliestOrderDate = cmd.dateCommande;
      }
    }

    batch.items.push({
      commandeId: cmd.id,
      tableNom: tableName,
      tableNumero: cmd.tableNumero,
      itemId: item.id,
      quantite: item.quantite,
      prioritaire: Boolean(item.prioritaire || cmd.prioritaire),
      statut: itemStatut as any,
      varianteNom: item.varianteNom,
      notes: item.notes,
      dateCommande: cmd.dateCommande
    });

    const tableEntry = `${tableName} (x${item.quantite})`;
    if (!batch.tableSummaries.includes(tableEntry)) {
      batch.tableSummaries.push(tableEntry);
    }

    this.accumulateBatchIngredients(batch, item);
  }

  private getOrCreateBatch(
    batchMap: Map<string, CocktailBatchView>,
    key: string,
    item: CommandeItemView,
    cmd: CommandeView
  ): CocktailBatchView {
    let batch = batchMap.get(key);
    if (!batch) {
      batch = {
        cocktailId: item.cocktailId,
        cocktailNom: item.cocktailNom,
        station: item.station || 'BAR',
        totalQuantity: 0,
        pendingQuantity: 0,
        preparingQuantity: 0,
        isUrgent: false,
        earliestOrderDate: cmd.dateCommande,
        tableSummaries: [],
        items: [],
        ingredients: [],
        sampleItem: { ...item, quantite: 0 },
        sampleCommande: cmd
      };
      batchMap.set(key, batch);
    }
    return batch;
  }

  private accumulateBatchIngredients(batch: CocktailBatchView, item: CommandeItemView): void {
    if (!item.ingredients || item.ingredients.length === 0) return;

    for (const ing of item.ingredients) {
      const ingKey = (ing.ingredientNom || '').toLowerCase().trim();
      const existingIng = batch.ingredients.find(i => i.ingredientNom.toLowerCase().trim() === ingKey);
      const lineQty = (ing.quantite || 0) * item.quantite;
      if (existingIng) {
        existingIng.totalQuantite = Math.round((existingIng.totalQuantite + lineQty) * 100) / 100;
      } else {
        batch.ingredients.push({
          ingredientId: ing.ingredientId || ing.id,
          ingredientNom: ing.ingredientNom,
          unitQuantite: ing.quantite || 0,
          totalQuantite: Math.round(lineQty * 100) / 100,
          uniteMesure: ing.uniteMesure || 'cl'
        });
      }
    }
  }

  private finalizeAndSortBatches(batches: CocktailBatchView[]): CocktailBatchView[] {
    for (const b of batches) {
      b.sampleItem.quantite = b.totalQuantity;
    }

    return batches.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      if (b.totalQuantity !== a.totalQuantity) {
        return b.totalQuantity - a.totalQuantity;
      }
      const timeA = a.earliestOrderDate ? new Date(a.earliestOrderDate).getTime() : 0;
      const timeB = b.earliestOrderDate ? new Date(b.earliestOrderDate).getTime() : 0;
      return timeA - timeB;
    });
  }
}
