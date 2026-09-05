import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AjouterItemRequest,
  Commande,
  CommandeStatut,
  CreateCommandeRequest,
} from '../models/commande.model';

/**
 * Core service managing order lifecycle and HTTP REST API interactions.
 */
@Injectable({ providedIn: 'root' })
export class CommandeService {
  private readonly api = `${environment.apiUrl}/commandes`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<Commande[]> {
    return this.http.get<Commande[]>(this.api);
  }

  getById(id: number): Observable<Commande> {
    return this.http.get<Commande>(`${this.api}/${id}`);
  }

  getByStatut(statut: CommandeStatut): Observable<Commande[]> {
    return this.http.get<Commande[]>(`${this.api}/statut/${statut}`);
  }

  getByTable(tableId: number): Observable<Commande[]> {
    return this.http.get<Commande[]>(`${this.api}/table/${tableId}`);
  }

  create(request: CreateCommandeRequest): Observable<Commande> {
    return this.http.post<Commande>(this.api, request);
  }

  ajouterItem(commandeId: number, item: AjouterItemRequest): Observable<Commande> {
    return this.http.post<Commande>(`${this.api}/${commandeId}/items`, item);
  }

  retirerItem(commandeId: number, itemId: number): Observable<Commande> {
    return this.http.delete<Commande>(`${this.api}/${commandeId}/items/${itemId}`);
  }

  changerStatut(commandeId: number, statut: CommandeStatut): Observable<Commande> {
    return this.http.patch<Commande>(`${this.api}/${commandeId}/statut`, { statut });
  }

  annuler(commandeId: number): Observable<Commande> {
    return this.http.patch<Commande>(`${this.api}/${commandeId}/annuler`, {});
  }

  /**
   * Sets the urgent priority status of an order.
   *
   * @param commandeId Unique identifier of the order.
   * @param urgent Priority flag.
   * @returns Observable emitting the updated {@link Commande}.
   */
  setUrgent(commandeId: number, urgent: boolean): Observable<Commande> {
    return this.http.patch<Commande>(`${this.api}/${commandeId}/urgent?urgent=${urgent}`, {});
  }

  /**
   * Sets the priority status of an order.
   *
   * @deprecated Use {@link setUrgent} instead.
   * @param commandeId Unique identifier of the order.
   * @param priorite Priority flag.
   * @returns Observable emitting the updated {@link Commande}.
   */
  setPriorite(commandeId: number, priorite: boolean): Observable<Commande> {
    return this.setUrgent(commandeId, priorite);
  }

  /**
   * Toggles the urgent priority status of an order.
   *
   * @param commandeId Unique identifier of the order.
   * @returns Observable emitting the updated {@link Commande}.
   */
  toggleUrgent(commandeId: number): Observable<Commande> {
    return this.http.post<Commande>(`${this.api}/${commandeId}/toggle-urgent`, {});
  }

  /**
   * Transfers an order to a new target table.
   *
   * @param commandeId Unique identifier of the order to transfer.
   * @param newTableId Target table ID.
   * @returns Observable emitting the updated {@link Commande}.
   */
  transfererTable(commandeId: number, newTableId: number): Observable<Commande> {
    return this.http.put<Commande>(`${this.api}/${commandeId}/table/${newTableId}`, {});
  }
}
