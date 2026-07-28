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

  setPriorite(commandeId: number, priorite: boolean): Observable<Commande> {
    return this.http.patch<Commande>(`${this.api}/${commandeId}/priorite`, { priorite });
  }
}
