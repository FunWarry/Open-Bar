import { inject, Injectable, InjectionToken } from '@angular/core';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IMessage } from '@stomp/stompjs';
import { Store } from '@ngrx/store';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { selectIsAuthenticated } from '../store/auth.selectors';

/** Token d'injection permettant de remplacer ou d'injecter une instance Mock de {@link RxStomp} dans les tests unitaire. */
export const RX_STOMP = new InjectionToken<RxStomp>('RxStomp', {
  providedIn: 'root',
  factory: () => new RxStomp(),
});

/**
 * Service Angular gérant la communication WebSocket temps réel via le protocole STOMP.
 * <p>
 * Maintient une connexion persistante avec reconnexion automatique et authentification JWT.
 */
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private readonly authService = inject(AuthService);
  private readonly store = inject(Store);
  private readonly rxStomp = inject(RX_STOMP);

  /**
   * Initialise les abonnements automatiques pour connecter/déconnecter le WebSocket selon le statut d'authentification utilisateur.
   */
  constructor() {
    this.store.select(selectIsAuthenticated).subscribe(isAuth => {
      if (isAuth && !this.rxStomp.active) {
        this.connect();
      } else if (!isAuth && this.rxStomp.active) {
        this.rxStomp.deactivate();
      }
    });
  }

  /**
   * Configure et active la connexion WebSocket STOMP avec le backend.
   * Transmet le jeton JWT dans le header Authorization lors de la connexion.
   */
  connect(): void {
    if (this.rxStomp.active) return;

    this.rxStomp.configure({
      brokerURL: environment.wsUrl,
      beforeConnect: () => {
        const token = this.authService.getToken();
        this.rxStomp.stompClient.connectHeaders = token
          ? { Authorization: `Bearer ${token}` }
          : {};
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });
    this.rxStomp.activate();
  }

  /**
   * Désactive la connexion WebSocket STOMP.
   */
  disconnect(): void {
    this.rxStomp.deactivate();
  }

  /**
   * S'abonne à un topic ou une destination STOMP (ex: '/topic/commandes').
   *
   * @param destination Le chemin du topic STOMP auquel s'abonner
   * @returns Un {@link Observable} émettant les messages {@link IMessage} reçus en temps réel
   */
  watch(destination: string): Observable<IMessage> {
    return this.rxStomp.watch(destination);
  }

  /**
   * Observable émettant {@code true} lorsque la connexion STOMP est ouverte et active (état OPEN).
   */
  get connected$(): Observable<boolean> {
    return this.rxStomp.connectionState$.pipe(
      map(state => state === RxStompState.OPEN)
    );
  }
}
