import { inject, Injectable } from '@angular/core';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IMessage } from '@stomp/stompjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private authService = inject(AuthService);
  private rxStomp = new RxStomp();

  connect(): void {
    if (this.rxStomp.active) return;

    this.rxStomp.configure({
      brokerURL: environment.wsUrl,
      // beforeConnect refreshes the JWT on every (re)connect — avoids stale token
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

  disconnect(): void {
    this.rxStomp.deactivate();
  }

  /**
   * Subscribe to a STOMP destination.
   * Subscriptions made before connect() are queued and replayed automatically.
   */
  watch(destination: string): Observable<IMessage> {
    return this.rxStomp.watch(destination);
  }

  get connected$(): Observable<boolean> {
    return this.rxStomp.connectionState$.pipe(
      map(state => state === RxStompState.OPEN)
    );
  }
}
