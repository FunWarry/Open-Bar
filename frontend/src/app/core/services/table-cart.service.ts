import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, Subscription, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  TableCart,
  TableCartItem,
  TableCartItemRequest,
  TableCartItemUpdateRequest,
  TableCartSubmitRequest,
  TableOrdersSummary,
} from '../models/table-cart.model';
import { TableJoinRequest } from '../models/table-session.model';

import { WebSocketService } from './websocket.service';

/**
 * Guest grouping representation for collaborative cart UI display.
 */
export interface GuestCartGroup {
  /**
   * Contributor session UUID.
   */
  guestSessionId: string;

  /**
   * Contributor nickname.
   */
  guestName: string;

  /**
   * Whether this group belongs to the currently active smartphone user.
   */
  isCurrentGuest: boolean;

  /**
   * Items added by this guest.
   */
  items: TableCartItem[];

  /**
   * Total items count for this guest.
   */
  totalItems: number;

  /**
   * Subtotal cost for this guest's items.
   */
  totalPrice: number;
}

/**
 * Public response returned upon successful collaborative order submission.
 */
export interface PublicOrderSubmissionResponse {
  /**
   * Created order ID.
   */
  commandeId: number;

  /**
   * Public tracking token.
   */
  trackingToken: string;
}

/**
 * Angular service managing collaborative multi-guest table carts.
 * <p>
 * Handles persistent guest session identity, real-time STOMP synchronization
 * with other patrons at the same table, optimistic updates, and consolidated order submission.
 */
@Injectable({ providedIn: 'root' })
export class TableCartService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly webSocketService = inject(WebSocketService);

  private readonly GUEST_SESSION_KEY = 'openbar_guest_session_id';
  private readonly GUEST_NAME_KEY = 'openbar_guest_name';

  /** Current consolidated table cart state. */
  readonly cart = signal<TableCart | null>(null);

  /** Summary of all rounds placed on this table with bill tracking. */
  readonly tableOrdersSummary = signal<TableOrdersSummary | null>(null);

  /** Remaining seconds in the 2-minute grouping grace period window. */
  readonly graceRemainingSeconds = signal<number>(0);

  /** Whether the current patron is the host/owner of this table. */
  readonly isOwner = signal<boolean>(false);

  /** Nickname of the table host. */
  readonly ownerGuestName = signal<string | null>(null);

  /** Pending table join requests awaiting host approval (only populated if isOwner). */
  readonly pendingJoinRequests = signal<TableJoinRequest[]>([]);

  /** Loading indicator during initial fetch or network calls. */
  readonly loading = signal<boolean>(false);

  /** Submitting indicator during order placement. */
  readonly submitting = signal<boolean>(false);

  /** Currently initialized table identifier. */
  readonly activeTableId = signal<number | null>(null);

  /** Guest nickname signal for reactive UI bindings. */
  readonly currentGuestName = signal<string>(this.getGuestName() || '');

  private wsSubscription?: Subscription;
  private ordersWsSubscription?: Subscription;
  private ownerWsSubscription?: Subscription;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private visibilityListener: (() => void) | null = null;

  /**
   * Computed list of items grouped by guest contributor.
   */
  readonly guestGroups = computed<GuestCartGroup[]>(() => {
    const currentCart = this.cart();
    if (!currentCart?.items?.length) {
      return [];
    }

    const currentSessionId = this.getOrCreateGuestSessionId();
    const map = new Map<string, GuestCartGroup>();

    for (const item of currentCart.items) {
      const sessionId = item.guestSessionId || 'unknown';
      let group = map.get(sessionId);
      if (!group) {
        const isCurrent = sessionId === currentSessionId;
        const fallbackName = isCurrent ? (this.currentGuestName() || 'Moi') : 'Convive';
        group = {
          guestSessionId: sessionId,
          guestName: item.guestName?.trim() || fallbackName,
          isCurrentGuest: isCurrent,
          items: [],
          totalItems: 0,
          totalPrice: 0,
        };
        map.set(sessionId, group);
      }
      group.items.push(item);
      const qty = Number(item.quantite);
      const lineTotal = Number(item.totalLigne ?? (qty * Number(item.prixUnitaire ?? 0)));
      group.totalItems += Number.isFinite(qty) ? qty : 0;
      group.totalPrice += Number.isFinite(lineTotal) ? lineTotal : 0;
    }

    // Sort so that the current user's group appears first, followed by others alphabetically
    return Array.from(map.values()).sort((a, b) => {
      if (a.isCurrentGuest && !b.isCurrentGuest) return -1;
      if (!a.isCurrentGuest && b.isCurrentGuest) return 1;
      return (a.guestName || '').localeCompare(b.guestName || '');
    });
  });

  /**
   * Total items count in the collaborative cart.
   */
  readonly totalItems = computed<number>(() => {
    const c = this.cart();
    if (!c) return 0;
    if (c.totalItems != null && !Number.isNaN(Number(c.totalItems))) {
      return Number(c.totalItems);
    }
    return c.items?.reduce((acc, it) => acc + (Number(it.quantite) || 0), 0) ?? 0;
  });

  /**
   * Total price across all guests in the collaborative cart.
   */
  readonly totalPrice = computed<number>(() => {
    const c = this.cart();
    if (!c) return 0;
    const price = c.totalPrice ?? c.tableTotal;
    if (price != null && !Number.isNaN(Number(price))) {
      return Number(price);
    }
    return c.items?.reduce((acc, it) => acc + (Number(it.totalLigne) || (Number(it.quantite) || 1) * (Number(it.prixUnitaire) || 0)), 0) ?? 0;
  });


  /**
   * Retrieves or initializes a unique guest session UUID stored in local storage.
   *
   * @returns Stable guest session UUID
   */
  getOrCreateGuestSessionId(): string {
    let sessionId = localStorage.getItem(this.GUEST_SESSION_KEY);
    if (!sessionId) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        sessionId = crypto.randomUUID();
      } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        sessionId = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      } else {
        sessionId = 'guest-session-' + Date.now().toString(36);
      }
      localStorage.setItem(this.GUEST_SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  /**
   * Retrieves saved guest nickname.
   */
  getGuestName(): string | null {
    return localStorage.getItem(this.GUEST_NAME_KEY);
  }

  /**
   * Persists guest nickname into storage and updates reactive signal.
   *
   * @param name Guest nickname
   */
  setGuestName(name: string): void {
    const trimmed = name.trim();
    localStorage.setItem(this.GUEST_NAME_KEY, trimmed);
    this.currentGuestName.set(trimmed);
  }

  /**
   * Checks whether the current user has configured a nickname.
   */
  hasGuestName(): boolean {
    const name = this.getGuestName();
    return !!name && name.trim().length > 0;
  }

  /**
   * Initializes collaborative cart for a table, fetching initial state and subscribing to STOMP updates.
   *
   * @param tableId Table identifier
   * @param sessionToken Optional table session token for anti-fraud validation
   * @returns Observable emitting initial TableCart
   */
  initCart(tableId: number, sessionToken?: string): Observable<TableCart> {
    this.activeTableId.set(tableId);
    this.loading.set(true);

    const guestSessionId = this.getOrCreateGuestSessionId();
    this.webSocketService.connectAsGuest(guestSessionId, sessionToken);

    this.teardownSubscriptions();

    this.wsSubscription = this.webSocketService
      .watch(`/topic/tables/${tableId}/cart`)
      .subscribe({
        next: message => {
          try {
            const updatedCart: TableCart = JSON.parse(message.body);
            this.cart.set(updatedCart);
            this.handleCartGracePeriod(updatedCart);
          } catch (err) {
            console.error('Failed to parse incoming table cart payload', err);
          }
        },
        error: err => console.warn('Table cart STOMP subscription error', err),
      });

    this.ordersWsSubscription = this.webSocketService
      .watch(`/topic/tables/${tableId}/orders`)
      .subscribe({
        next: message => {
          try {
            const summary: TableOrdersSummary = JSON.parse(message.body);
            this.tableOrdersSummary.set(summary);
          } catch (err) {
            console.error('Failed to parse incoming table orders summary', err);
          }
        },
        error: err => console.warn('Table orders STOMP subscription error', err),
      });

    this.ownerWsSubscription = this.webSocketService
      .watch(`/topic/tables/${tableId}/owner`)
      .subscribe({
        next: message => {
          try {
            const joinReq: TableJoinRequest = JSON.parse(message.body);
            this.handleIncomingJoinRequest(joinReq);
          } catch (err) {
            console.error('Failed to parse incoming owner join request notification', err);
          }
        },
        error: err => console.warn('Table owner STOMP subscription error', err),
      });

    // Start soft periodic polling (every 5 seconds) to guarantee synchronization across companion screens
    this.startSoftPolling(tableId);

    // Register visibility change listener to immediately re-sync on device wake-up
    this.setupVisibilityListener(tableId);

    // Eagerly fetch table orders summary alongside cart
    this.fetchTableOrdersSummary(tableId).subscribe({
      error: err => console.warn('Failed to fetch initial table orders summary', err),
    });

    return this.http.get<TableCart>(`${environment.apiUrl}/public/tables/${tableId}/cart`).pipe(
      tap({
        next: fetchedCart => {
          this.cart.set(fetchedCart);
          this.handleCartGracePeriod(fetchedCart);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      })
    );
  }

  /**
   * Fetches latest table orders summary including cumulative bill and rounds status.
   *
   * @param tableId Table identifier
   * @returns Observable emitting {@link TableOrdersSummary}
   */
  fetchTableOrdersSummary(tableId: number): Observable<TableOrdersSummary> {
    return this.http.get<TableOrdersSummary>(`${environment.apiUrl}/public/tables/${tableId}/cart/orders`).pipe(
      tap(summary => this.tableOrdersSummary.set(summary))
    );
  }

  /**
   * Immediately finalizes the active 2-minute grouping grace period, releasing the round to the bar.
   *
   * @param tableId Table identifier
   * @returns Observable emitting action result
   */
  finalizeGrace(tableId: number): Observable<{ success: boolean; message: string; commandeId: number }> {
    return this.http.post<{ success: boolean; message: string; commandeId: number }>(
      `${environment.apiUrl}/public/tables/${tableId}/cart/finalize-grace`,
      {}
    ).pipe(
      tap(() => {
        this.stopGraceCountdown();
        this.refreshCartAndOrders(tableId);
      })
    );
  }

  /**
   * Silently refreshes both collaborative cart and table orders summary.
   *
   * @param tableId Table identifier
   */
  refreshCartAndOrders(tableId: number): void {
    this.http.get<TableCart>(`${environment.apiUrl}/public/tables/${tableId}/cart`).subscribe({
      next: cart => {
        this.cart.set(cart);
        this.handleCartGracePeriod(cart);
      },
      error: err => console.warn('Silent cart refresh error', err),
    });

    this.http.get<TableOrdersSummary>(`${environment.apiUrl}/public/tables/${tableId}/cart/orders`).subscribe({
      next: summary => this.tableOrdersSummary.set(summary),
      error: err => console.warn('Silent orders refresh error', err),
    });
  }

  private handleCartGracePeriod(cart: TableCart | null): void {
    if (!cart) {
      this.stopGraceCountdown();
      return;
    }

    if (cart.gracePeriodRemainingSeconds != null && cart.gracePeriodRemainingSeconds > 0) {
      this.startGraceCountdown(cart.gracePeriodRemainingSeconds);
      return;
    }

    if (cart.dispatchAt) {
      const dispatchMs = new Date(cart.dispatchAt).getTime();
      const remainingSec = Math.max(0, Math.floor((dispatchMs - Date.now()) / 1000));
      if (remainingSec > 0) {
        this.startGraceCountdown(remainingSec);
        return;
      }
    }

    this.stopGraceCountdown();
  }

  /**
   * Starts a countdown timer ticking every second for the collaborative grace window.
   *
   * @param initialSeconds Seconds remaining in countdown
   */
  startGraceCountdown(initialSeconds: number): void {
    this.stopGraceCountdown();
    this.graceRemainingSeconds.set(initialSeconds);

    this.countdownTimer = setInterval(() => {
      const current = this.graceRemainingSeconds();
      if (current <= 1) {
        this.stopGraceCountdown();
        const activeTable = this.activeTableId();
        if (activeTable) {
          this.refreshCartAndOrders(activeTable);
        }
      } else {
        this.graceRemainingSeconds.set(current - 1);
      }
    }, 1000);
  }

  /**
   * Stops and clears the active grace period countdown timer.
   */
  stopGraceCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.graceRemainingSeconds.set(0);
  }

  private startSoftPolling(tableId: number): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    this.pollingTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.refreshCartAndOrders(tableId);
      }
    }, 5000);
  }

  private setupVisibilityListener(tableId: number): void {
    if (typeof document === 'undefined') return;
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
    }
    this.visibilityListener = () => {
      if (document.visibilityState === 'visible') {
        this.refreshCartAndOrders(tableId);
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  private handleIncomingJoinRequest(joinReq: TableJoinRequest): void {
    if (!this.isOwner()) return;
    const currentList = this.pendingJoinRequests();
    if (joinReq.status === 'PENDING') {
      const filtered = currentList.filter(r => r.id !== joinReq.id);
      this.pendingJoinRequests.set([...filtered, joinReq]);
    } else {
      this.pendingJoinRequests.set(currentList.filter(r => r.id !== joinReq.id));
    }
  }

  private teardownSubscriptions(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = undefined;
    }
    if (this.ordersWsSubscription) {
      this.ordersWsSubscription.unsubscribe();
      this.ordersWsSubscription = undefined;
    }
    if (this.ownerWsSubscription) {
      this.ownerWsSubscription.unsubscribe();
      this.ownerWsSubscription = undefined;
    }
  }

  /**
   * Adds an item to the collaborative table cart.
   *
   * @param tableId Table identifier
   * @param request Add item request payload
   * @returns Observable emitting updated TableCart
   */
  addItem(tableId: number, request: TableCartItemRequest): Observable<TableCart> {
    return this.http
      .post<TableCart>(`${environment.apiUrl}/public/tables/${tableId}/cart/items`, request)
      .pipe(
        tap(updatedCart => {
          this.cart.set(updatedCart);
        })
      );
  }

  /**
   * Updates quantity and notes for an existing cart item.
   *
   * @param tableId Table identifier
   * @param itemId Cart item identifier
   * @param request Update request payload
   * @returns Observable emitting updated TableCart
   */
  updateItem(tableId: number, itemId: number, request: TableCartItemUpdateRequest): Observable<TableCart> {
    return this.http
      .put<TableCart>(`${environment.apiUrl}/public/tables/${tableId}/cart/items/${itemId}`, request)
      .pipe(
        tap(updatedCart => {
          this.cart.set(updatedCart);
        })
      );
  }

  /**
   * Removes an item from the collaborative table cart.
   *
   * @param tableId Table identifier
   * @param itemId Cart item identifier
   * @returns Observable emitting updated TableCart
   */
  removeItem(tableId: number, itemId: number): Observable<TableCart> {
    const guestSessionId = this.getOrCreateGuestSessionId();
    return this.http
      .delete<TableCart>(`${environment.apiUrl}/public/tables/${tableId}/cart/items/${itemId}`, {
        params: { guestSessionId },
      })
      .pipe(
        tap(updatedCart => {
          this.cart.set(updatedCart);
        })
      );
  }

  /**
   * Clears all items from the collaborative table cart.
   *
   * @param tableId Table identifier
   * @returns Observable emitting updated TableCart
   */
  clearCart(tableId: number): Observable<TableCart> {
    return this.http
      .delete<TableCart>(`${environment.apiUrl}/public/tables/${tableId}/cart`)
      .pipe(
        tap(updatedCart => {
          this.cart.set(updatedCart);
        })
      );
  }


  /**
   * Submits the consolidated collaborative cart to the bar as an official order.
   *
   * @param tableId Table identifier
   * @param request Submit payload
   * @returns Observable emitting public order creation details
   */
  submitCart(tableId: number, request: TableCartSubmitRequest): Observable<PublicOrderSubmissionResponse> {
    this.submitting.set(true);
    return this.http
      .post<{ commandeId?: number; id?: number; trackingToken?: string }>(
        `${environment.apiUrl}/public/tables/${tableId}/cart/submit`,
        request
      )
      .pipe(
        map(res => ({
          commandeId: res.commandeId ?? res.id ?? 0,
          trackingToken: res.trackingToken ?? '',
        })),
        tap({
          next: () => this.submitting.set(false),
          error: () => this.submitting.set(false),
        })
      );
  }


  /**
   * Updates ownership status and host nickname for the active patron.
   *
   * @param isOwner Whether current patron is table host
   * @param ownerName Nickname of the table host
   */
  setOwnership(isOwner: boolean, ownerName?: string | null): void {
    this.isOwner.set(isOwner);
    this.ownerGuestName.set(ownerName || null);
  }

  /**
   * Directly updates pending join requests list.
   *
   * @param requests Array of pending requests
   */
  setPendingJoinRequests(requests: TableJoinRequest[]): void {
    this.pendingJoinRequests.set(requests);
  }

  /**
   * Resets local cart state and tears down WebSocket subscriptions.
   */
  reset(): void {
    this.teardownSubscriptions();
    this.stopGraceCountdown();

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    if (typeof document !== 'undefined' && this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }

    this.cart.set(null);
    this.tableOrdersSummary.set(null);
    this.pendingJoinRequests.set([]);
    this.isOwner.set(false);
    this.ownerGuestName.set(null);
    this.activeTableId.set(null);
    this.loading.set(false);
    this.submitting.set(false);
  }

  ngOnDestroy(): void {
    this.reset();
  }
}
