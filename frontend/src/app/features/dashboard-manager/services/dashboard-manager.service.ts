import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardStats } from '../models/dashboard-stats.model';
import { OngoingOrder } from '../models/ongoing-order.model';

/**
 * Service managing data retrieval and analytics for the Manager Dashboard.
 * Interacts with `/api/dashboard` and `/api/commandes` REST endpoints.
 */
@Injectable({ providedIn: 'root' })
export class DashboardManagerService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;
  private readonly commandesUrl = `${environment.apiUrl}/commandes`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves live consolidated stats and KPIs for the manager dashboard.
   *
   * @returns Observable emitting DashboardStats containing revenues, order counts, and top cocktails
   */
  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Retrieves ongoing orders grouped by active statuses (EN_ATTENTE, EN_PREPARATION, PRET, LIVREE).
   *
   * @returns Observable emitting array of OngoingOrder objects
   */
  getOngoingOrders(): Observable<OngoingOrder[]> {
    const statuts = ['EN_ATTENTE', 'EN_PREPARATION', 'PRET', 'LIVREE'] as const;

    return forkJoin(
      statuts.map(statut =>
        this.http.get<any[]>(`${this.commandesUrl}/statut/${statut}`)
      )
    ).pipe(
      map(results => {
        const orders: OngoingOrder[] = [];
        results.forEach((commandeList, idx) => {
          commandeList.forEach(c => {
            const mappedItems = (c.items || []).map((it: any) => ({
              cocktailNom: it.cocktailNom || it.nom || '',
              quantite: it.quantite || 1,
              varianteNom: it.varianteNom,
              notes: it.notes
            }));

            orders.push({
              id: c.id,
              tableNumero: c.tableNumero ?? 0,
              tableNom: c.tableNom,
              statut: statuts[idx],
              dateCommande: c.dateCommande,
              serveurUsername: c.serveurUsername,
              itemCount: mappedItems.reduce((acc: number, item: any) => acc + item.quantite, 0) || (c.items?.length ?? 0),
              total: c.total ?? 0,
              notes: c.notes,
              items: mappedItems
            });
          });
        });
        return orders;
      })
    );
  }

  /**
   * Generates and downloads a CSV export file containing the current daily statistics and top cocktail sales.
   *
   * @param stats The dashboard statistics snapshot to export
   * @param date The export reference date
   */
  exportStatsCsv(stats: DashboardStats, date: Date = new Date()): void {
    const dateStr = date.toISOString().split('T')[0];
    const headers = 'Metrique,Valeur\n';
    const rows = [
      `Date,${dateStr}`,
      `Chiffre d'Affaires du Jour,${stats.chiffreAffairesJour} EUR`,
      `Chiffre d'Affaires du Mois,${stats.chiffreAffairesMois} EUR`,
      `Commandes Totales,${stats.commandesTotales}`,
      `Commandes En Attente,${stats.commandesEnAttente}`,
      `Commandes En Preparation,${stats.commandesEnPreparation}`,
      `Commandes Pretes,${stats.commandesPret}`,
      `Commandes Livrees,${stats.commandesLivrees}`,
      `Tables Occupees,${stats.tablesOccupees}/${stats.tablesTotales}`,
      `Ingredients sous Seuil Critique,${stats.stockIngredientsCritiques}`,
      '',
      'Top Cocktails,Nombre de Ventes',
      ...(stats.topCocktails || []).map(tc => `"${tc.nom.replaceAll('"', '""')}",${tc.nombreCommandes}`)
    ].join('\n');

    const csvContent = '\uFEFF' + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `openbar_rapport_manager_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}

