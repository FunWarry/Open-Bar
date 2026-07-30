import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TableBar } from '../../../core/models/table.model';
import { Commande, CommandeStatut, CreateCommandeRequest, AjouterItemRequest } from '../../../core/models/commande.model';
import { TableView } from '../models/table-view.model';

/**
 * Feature service for the Waiter dashboard managing tables, orders, and transfers.
 */
@Injectable({ providedIn: 'root' })
export class DashboardServeurService {
  private readonly tablesUrl = `${environment.apiUrl}/tables`;
  private readonly commandesUrl = `${environment.apiUrl}/commandes`;

  constructor(private readonly http: HttpClient) {}

  getAllTables(): Observable<TableView[]> {
    return this.http.get<TableBar[]>(this.tablesUrl).pipe(
      map(tables => tables.map(t => this.toTableView(t))),
    );
  }

  getTableById(tableId: number): Observable<TableView> {
    return this.http.get<TableBar>(`${this.tablesUrl}/${tableId}`).pipe(
      map(t => this.toTableView(t)),
    );
  }

  getMesTables(serveurId: number): Observable<TableView[]> {
    return this.http.get<TableBar[]>(`${this.tablesUrl}/serveur/${serveurId}`).pipe(
      map(tables => tables.map(t => this.toTableView(t))),
    );
  }

  getCommandesByTable(tableId: number): Observable<Commande[]> {
    return this.http.get<Commande[]>(`${this.commandesUrl}/table/${tableId}`);
  }

  getCommandesParStatut(statut: CommandeStatut): Observable<Commande[]> {
    return this.http.get<Commande[]>(`${this.commandesUrl}/statut/${statut}`);
  }

  occuperTable(tableId: number, serveurId: number): Observable<TableBar> {
    return this.http.patch<TableBar>(`${this.tablesUrl}/${tableId}/occuper`, { serveurId });
  }

  libererTable(tableId: number): Observable<TableBar> {
    return this.http.patch<TableBar>(`${this.tablesUrl}/${tableId}/liberer`, {});
  }

  createCommande(request: CreateCommandeRequest): Observable<Commande> {
    return this.http.post<Commande>(this.commandesUrl, request);
  }

  ajouterItem(commandeId: number, item: AjouterItemRequest): Observable<Commande> {
    return this.http.post<Commande>(`${this.commandesUrl}/${commandeId}/items`, item);
  }

  annulerCommande(commandeId: number): Observable<Commande> {
    return this.http.patch<Commande>(`${this.commandesUrl}/${commandeId}/annuler`, {});
  }

  changerStatutCommande(commandeId: number, statut: CommandeStatut): Observable<Commande> {
    return this.http.patch<Commande>(`${this.commandesUrl}/${commandeId}/statut`, { statut });
  }

  /**
   * Transfers an order to a new target table.
   *
   * @param commandeId Unique identifier of the order to transfer.
   * @param targetTableId Identifier of the target table.
   * @returns Observable emitting the updated {@link Commande}.
   */
  transfererCommande(commandeId: number, targetTableId: number): Observable<Commande> {
    return this.http.put<Commande>(`${this.commandesUrl}/${commandeId}/table/${targetTableId}`, {});
  }

  private toTableView(t: TableBar): TableView {
    return {
      id: t.id,
      nom: `Table ${t.numero}`,
      zone: t.zone,
      capacite: t.capacite,
      occupee: t.occupee,
      commandesActives: [],
    };
  }
}
