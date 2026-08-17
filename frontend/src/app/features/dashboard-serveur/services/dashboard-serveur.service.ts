import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TableBar } from '../../../core/models/table.model';
import { Commande, CommandeStatut, CreateCommandeRequest, AjouterItemRequest } from '../../../core/models/commande.model';
import { TableView } from '../models/table-view.model';
import { TablePosition } from '../../plan-salle/models/table-position.model';
import { Facture } from '../../factures/models/facture.model';

export interface ZoneItem {
  id: number;
  nom: string;
  etage: string;
}

export interface EtageItem {
  id: number;
  code: string;
  nom: string;
  ordre: number;
}

export interface TableAdditionItem {
  itemId: number;
  commandeId: number;
  cocktailId?: number;
  cocktailNom: string;
  varianteNom?: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  priceHT: number;
  vatAmount: number;
  vatRate: string;
}

export interface TableAdditionResponse {
  tableId: number;
  tableNumero: number;
  zone: string;
  serveurId?: number;
  serveurNom?: string;
  dateOccupation?: string;
  items: TableAdditionItem[];
  commandeIds: number[];
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  nombreArticles: number;
  hasUnpaidFacture: boolean;
  existingFactureId?: number;
}

export interface EncaissementRequest {
  modePaiement: string;
  pourboire?: number;
  remiseMontant?: number;
  remisePourcentage?: number;
  montantRecu?: number;
  notes?: string;
  libererTable?: boolean;
  commandeIds?: number[];
}

export interface ModifierCommandeItemRequest {
  id?: number;
  cocktailId: number;
  varianteId?: number;
  quantite: number;
  notes?: string;
  prioritaire?: boolean;
}

export interface ModifierCommandeRequest {
  items: ModifierCommandeItemRequest[];
  notes?: string;
  pourboire?: number;
}

/**
 * Feature service for the Waiter dashboard managing tables, orders, floor levels, zones, and transfers.
 */
@Injectable({ providedIn: 'root' })
export class DashboardServeurService {
  private readonly tablesUrl = `${environment.apiUrl}/tables`;
  private readonly commandesUrl = `${environment.apiUrl}/commandes`;
  private readonly facturesUrl = `${environment.apiUrl}/factures`;
  private readonly zonesUrl = `${environment.apiUrl}/zones`;
  private readonly etagesUrl = `${environment.apiUrl}/etages`;

  constructor(private readonly http: HttpClient) {}

  getAllTables(): Observable<TableView[]> {
    return this.http.get<TableBar[]>(this.tablesUrl).pipe(
      map(tables => tables.map(t => this.toTableView(t))),
    );
  }

  getZones(): Observable<ZoneItem[]> {
    return this.http.get<ZoneItem[]>(this.zonesUrl).pipe(
      catchError(() => of([]))
    );
  }

  getEtages(): Observable<EtageItem[]> {
    return this.http.get<EtageItem[]>(this.etagesUrl).pipe(
      catchError(() => of([]))
    );
  }

  getPlanSallePositions(): Observable<TablePosition[]> {
    return this.http.get<TablePosition[]>(`${this.tablesUrl}/positions`).pipe(
      catchError(() => of([]))
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

  modifierCommande(commandeId: number, request: ModifierCommandeRequest): Observable<Commande> {
    return this.http.put<Commande>(`${this.commandesUrl}/${commandeId}/modifier`, request);
  }

  annulerCommande(commandeId: number): Observable<Commande> {
    return this.http.patch<Commande>(`${this.commandesUrl}/${commandeId}/annuler`, {});
  }

  changerStatutCommande(commandeId: number, statut: CommandeStatut): Observable<Commande> {
    return this.http.patch<Commande>(`${this.commandesUrl}/${commandeId}/statut`, { statut });
  }

  transfererCommande(commandeId: number, targetTableId: number): Observable<Commande> {
    return this.http.put<Commande>(`${this.commandesUrl}/${commandeId}/table/${targetTableId}`, {});
  }

  getTableAddition(tableId: number): Observable<TableAdditionResponse> {
    return this.http.get<TableAdditionResponse>(`${this.facturesUrl}/table/${tableId}/addition`);
  }

  encaisserTable(tableId: number, request: EncaissementRequest): Observable<Facture> {
    return this.http.post<Facture>(`${this.facturesUrl}/table/${tableId}/encaisser`, request);
  }

  private toTableView(t: TableBar): TableView {
    return {
      id: t.id,
      nom: `Table ${t.numero}`,
      zone: t.zone,
      etage: t.etage,
      capacite: t.capacite,
      occupee: t.occupee,
      commandesActives: [],
    };
  }
}
