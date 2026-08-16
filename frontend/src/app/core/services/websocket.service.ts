import { inject, Injectable, InjectionToken } from '@angular/core';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IMessage } from '@stomp/stompjs';
import { Store } from '@ngrx/store';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { selectIsAuthenticated } from '../store/auth.selectors';

/** Injection token allowing replacement or injection of a Mock {@link RxStomp} instance in unit tests. */
export const RX_STOMP = new InjectionToken<RxStomp>('RxStomp', {
  providedIn: 'root',
  factory: () => new RxStomp(),
});

/**
 * Angular service managing real-time WebSocket communication via STOMP protocol.
 * <p>
 * Maintains persistent connection with auto-reconnect and JWT authentication.
 */
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private readonly authService = inject(AuthService);
  private readonly store = inject(Store);
  private readonly rxStomp = inject(RX_STOMP);

  /**
   * Initializes automatic subscriptions to connect/disconnect WebSocket based on user authentication state.
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
   * Configures and establishes STOMP WebSocket connection with the backend.
   * Passes JWT token in the Authorization header upon connection.
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
   * Disconnects the STOMP WebSocket connection.
   */
  disconnect(): void {
    this.rxStomp.deactivate();
  }

  /**
   * Subscribes to a STOMP topic or destination (e.g. '/topic/commandes').
   *
   * @param destination STOMP topic destination path
   * @returns An {@link Observable} emitting {@link IMessage} updates in real time
   */
  watch(destination: string): Observable<IMessage> {
    return this.rxStomp.watch(destination);
  }

  /**
   * Observable emitting {@code true} when STOMP connection is active (OPEN state).
   */
  get connected$(): Observable<boolean> {
    return this.rxStomp.connectionState$.pipe(
      map(state => state === RxStompState.OPEN)
    );
  }
}
