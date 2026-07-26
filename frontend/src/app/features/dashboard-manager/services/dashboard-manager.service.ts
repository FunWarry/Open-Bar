import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardStats } from '../models/dashboard-stats.model';
import { OngoingOrder } from '../models/ongoing-order.model';

@Injectable({ providedIn: 'root' })
export class DashboardManagerService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;
  private readonly commandesUrl = `${environment.apiUrl}/commandes`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

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
            orders.push({
              id: c.id,
              tableNumero: c.tableNumero ?? 0,
              statut: statuts[idx],
              dateCommande: c.dateCommande,
              serveurUsername: c.serveurUsername,
              itemCount: c.items?.length ?? 0,
            });
          });
        });
        return orders;
      })
    );
  }
}

