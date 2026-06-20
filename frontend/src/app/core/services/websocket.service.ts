import { inject, Injectable, OnDestroy } from '@angular/core';
import { RxStomp, RxStompConfig } from '@stomp/rx-stomp';
import { Observable } from 'rxjs';
import { IMessage } from '@stomp/stompjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private authService = inject(AuthService);
  private rxStomp = new RxStomp();

  connect(): void {
    const token = this.authService.getToken();
    const config: RxStompConfig = {
      brokerURL: environment.wsUrl,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    };
    this.rxStomp.configure(config);
    this.rxStomp.activate();
  }

  disconnect(): void {
    this.rxStomp.deactivate();
  }

  watch(destination: string): Observable<IMessage> {
    return this.rxStomp.watch(destination);
  }

  get connected$(): Observable<boolean> {
    return new Observable(observer => {
      this.rxStomp.connected$.subscribe(state => observer.next(!!state));
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
