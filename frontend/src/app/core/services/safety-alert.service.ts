import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, tap } from 'rxjs';
import { IMessage } from '@stomp/rx-stomp';
import { WebSocketService } from './websocket.service';
import {
  SafetyAlert,
  SafetyAlertRequest,
  SafetyAlertResolveRequest,
  SafetyAlertType
} from '../models/safety-alert.model';

/**
 * Service managing silent patron Angel Shot emergency assistance requests,
 * real-time dispatching to staff tablets, and restroom notice PDF generation.
 */
@Injectable({
  providedIn: 'root'
})
export class SafetyAlertService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly wsService = inject(WebSocketService);

  private readonly publicApiUrl = '/api/public/safety-alerts';
  private readonly staffApiUrl = '/api/safety-alerts';

  /**
   * Signal maintaining all active, unresolved emergency safety alerts in real time.
   */
  readonly activeAlerts = signal<SafetyAlert[]>([]);

  private safetySub?: Subscription;
  private appelsSub?: Subscription;

  constructor() {
    this.initRealtimeSubscriptions();
  }

  ngOnDestroy(): void {
    this.safetySub?.unsubscribe();
    this.appelsSub?.unsubscribe();
  }

  /**
   * Initializes WebSocket subscriptions on /topic/safety-alerts and /topic/serveur/appels.
   */
  private initRealtimeSubscriptions(): void {
    this.safetySub = this.wsService.watch('/topic/safety-alerts').subscribe((message: IMessage) => {
      try {
        const alert: SafetyAlert = JSON.parse(message.body);
        this.handleIncomingAlert(alert);
      } catch {
        // Ignore malformed message
      }
    });

    this.appelsSub = this.wsService.watch('/topic/serveur/appels').subscribe((message: IMessage) => {
      try {
        const payload = JSON.parse(message.body);
        if (payload && typeof payload.type === 'string' && payload.type.startsWith('ANGEL_SHOT')) {
          this.handleIncomingAlert(payload as SafetyAlert);
        }
      } catch {
        // Ignore malformed message
      }
    });
  }

  /**
   * Handles an incoming safety alert event by updating active alerts signal and triggering haptics.
   *
   * @param alert Incoming safety alert event
   */
  private handleIncomingAlert(alert: SafetyAlert): void {
    if (!alert?.id) {
      return;
    }

    if (alert.status === 'ACTIVE') {
      this.activeAlerts.update((current) => {
        const filtered = current.filter(a => a.id !== alert.id);
        return [alert, ...filtered];
      });
      this.triggerHapticFeedback();
    } else if (alert.status === 'RESOLVED') {
      this.activeAlerts.update((current) => current.filter(a => a.id !== alert.id));
    }
  }

  /**
   * Dispatches silent haptic vibration pulses on mobile devices without playing audible chimes.
   */
  private triggerHapticFeedback(): void {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch {
        // Safe ignore on devices without vibration hardware
      }
    }
  }

  /**
   * Dispatches a silent Angel Shot emergency assistance alert from the table QR menu.
   *
   * @param tableId Table primary key or number
   * @param type Specific Angel Shot code (ANGEL_SHOT_NEAT, ANGEL_SHOT_ICE, ANGEL_SHOT_LIME)
   * @param comment Optional confidential comment or instructions
   * @returns Observable of the dispatched SafetyAlert
   */
  triggerSafetyAlert(tableId: number, type: SafetyAlertType, comment?: string): Observable<SafetyAlert> {
    const payload: SafetyAlertRequest = { type, comment };
    return this.http.post<SafetyAlert>(`${this.publicApiUrl}/tables/${tableId}`, payload);
  }

  /**
   * Manually triggers an Angel Shot safety alert on behalf of a staff member (waitstaff / bartender).
   *
   * @param tableId Table primary key
   * @param type Specific Angel Shot variant code
   * @param comment Optional confidential detail or instructions
   * @returns Observable of the created SafetyAlert
   */
  triggerStaffAlert(tableId: number, type: SafetyAlertType, comment?: string): Observable<SafetyAlert> {
    const payload: SafetyAlertRequest = { type, comment };
    return this.http.post<SafetyAlert>(`${this.staffApiUrl}/tables/${tableId}`, payload).pipe(
      tap((alert) => {
        this.activeAlerts.update((current) => {
          const filtered = current.filter(a => a.id !== alert.id);
          return [alert, ...filtered];
        });
      })
    );
  }

  /**
   * Retrieves all currently active and unacknowledged safety alerts for staff supervision.
   *
   * @returns Observable list of active SafetyAlert records
   */
  getActiveAlerts(): Observable<SafetyAlert[]> {
    return this.http.get<SafetyAlert[]>(`${this.staffApiUrl}/active`).pipe(
      tap((alerts) => {
        this.activeAlerts.set(alerts);
      })
    );
  }

  /**
   * Retrieves active safety alerts for a specific table.
   *
   * @param tableId Table primary key
   * @returns Observable list of active SafetyAlert records for the table
   */
  getActiveAlertsForTable(tableId: number): Observable<SafetyAlert[]> {
    return this.http.get<SafetyAlert[]>(`${this.staffApiUrl}/tables/${tableId}`);
  }

  /**
   * Acknowledges and marks an active safety alert as resolved.
   *
   * @param alertId Alert primary key
   * @param resolvedBy Staff username or identifier
   * @returns Observable of the resolved SafetyAlert
   */
  resolveAlert(alertId: number, resolvedBy?: string): Observable<SafetyAlert> {
    const payload: SafetyAlertResolveRequest = { resolvedBy };
    return this.http.put<SafetyAlert>(`${this.staffApiUrl}/${alertId}/resolve`, payload).pipe(
      tap((resolved) => {
        this.activeAlerts.update((current) => current.filter(a => a.id !== resolved.id));
      })
    );
  }

  /**
   * Downloads the printable A4 bilingual Angel Shot restroom notice PDF.
   *
   * @returns Observable Blob with PDF content
   */
  downloadRestroomNoticePdf(): Observable<Blob> {
    return this.http.get(`${this.staffApiUrl}/poster/pdf`, { responseType: 'blob' });
  }
}
