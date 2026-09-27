import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  RouletteBroadcastSpinRequest,
  RouletteEvent,
  RoulettePin,
  RoulettePinVerification,
  RoulettePublicConfig,
  RouletteSpinRequest,
  RouletteSpinResult,
  RouletteWheelSector,
} from '../models/roulette.model';
import { WebSocketService } from './websocket.service';

/**
 * Service managing Cocktail Roulette wheel API operations, live STOMP synchronisation,
 * and sector configuration.
 */
@Injectable({
  providedIn: 'root'
})
export class RouletteService {
  private readonly http = inject(HttpClient);
  private readonly wsService = inject(WebSocketService, { optional: true });

  private readonly publicApiUrl = `${environment.apiUrl}/public/roulette`;
  private readonly adminApiUrl = `${environment.apiUrl}/roulette`;

  /**
   * Retrieves public configuration, active wheel sectors and pricing for customer self-ordering.
   *
   * @returns Observable of public roulette configuration
   */
  getPublicConfig(): Observable<RoulettePublicConfig> {
    return this.http.get<RoulettePublicConfig>(`${this.publicApiUrl}/config`);
  }

  /**
   * Requests a weighted roulette spin from customer view or server cart.
   *
   * @param request Spin filters and options
   * @returns Observable of spin outcome
   */
  spin(request: RouletteSpinRequest): Observable<RouletteSpinResult> {
    return this.http.post<RouletteSpinResult>(`${this.publicApiUrl}/spin`, request);
  }

  /**
   * Triggers a live broadcast roulette spin on secondary screens/TVs with optional bartender rigging.
   *
   * @param request Bartender trigger parameters and override options
   * @returns Observable of resolved outcome
   */
  triggerBroadcast(request: RouletteBroadcastSpinRequest): Observable<RouletteSpinResult> {
    return this.http.post<RouletteSpinResult>(`${this.adminApiUrl}/trigger-broadcast`, request);
  }

  /**
   * Retrieves all wheel sectors for management in App Settings.
   *
   * @returns Observable of all sectors
   */
  getAllSectors(): Observable<RouletteWheelSector[]> {
    return this.http.get<RouletteWheelSector[]>(`${this.adminApiUrl}/sectors`);
  }

  /**
   * Creates a new sector slice on the roulette wheel.
   *
   * @param dto Sector creation payload
   * @returns Observable of created sector
   */
  createSector(dto: Partial<RouletteWheelSector>): Observable<RouletteWheelSector> {
    return this.http.post<RouletteWheelSector>(`${this.adminApiUrl}/sectors`, dto);
  }

  /**
   * Updates an existing sector slice on the roulette wheel.
   *
   * @param id  Sector ID
   * @param dto Update payload
   * @returns Observable of updated sector
   */
  updateSector(id: number, dto: Partial<RouletteWheelSector>): Observable<RouletteWheelSector> {
    return this.http.put<RouletteWheelSector>(`${this.adminApiUrl}/sectors/${id}`, dto);
  }

  /**
   * Deletes a sector slice from the roulette wheel.
   *
   * @param id Sector ID
   * @returns Observable of void
   */
  deleteSector(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/sectors/${id}`);
  }

  /**
   * Subscribes to the real-time STOMP topic `/topic/roulette/events` for synchronous animations across screens.
   *
   * @returns Observable emitting roulette events
   */
  watchEvents(): Observable<RouletteEvent> {
    if (!this.wsService) {
      return new Observable<RouletteEvent>();
    }
    return this.wsService.watch('/topic/roulette/events').pipe(
      map(message => JSON.parse(message.body) as RouletteEvent)
    );
  }

  /**
   * Verifies a 4-digit PIN for access to the public TV display screen.
   *
   * @param pin 4-digit PIN
   * @returns Observable with verification outcome
   */
  verifyDisplayPin(pin: string): Observable<RoulettePinVerification> {
    return this.http.post<RoulettePinVerification>(`${this.publicApiUrl}/verify-pin`, { pin });
  }

  /**
   * Retrieves the current TV display PIN for staff management.
   *
   * @returns Observable with current PIN
   */
  getDisplayPin(): Observable<RoulettePin> {
    return this.http.get<RoulettePin>(`${this.adminApiUrl}/pin`);
  }

  /**
   * Updates the TV display PIN and forces active TV screens to re-authenticate.
   *
   * @param pin 4-digit PIN code
   * @returns Observable with updated PIN
   */
  updateDisplayPin(pin: string): Observable<RoulettePin> {
    return this.http.put<RoulettePin>(`${this.adminApiUrl}/pin`, { pin });
  }

  /**
   * Regenerates a new random 4-digit PIN and immediately revokes active TV display sessions.
   *
   * @returns Observable with newly generated PIN
   */
  regenerateDisplayPin(): Observable<RoulettePin> {
    return this.http.post<RoulettePin>(`${this.adminApiUrl}/pin/regenerate`, {});
  }
}
