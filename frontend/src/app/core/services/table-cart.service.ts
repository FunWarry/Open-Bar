import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, Subscription, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  TableCart,
  TableCartItem,
  TableCartItemRequest,
  TableCartItemUpdateRequest,
  TableCartStatus,
  TableCartSubmitRequest,
} from '../models/table-cart.model';

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

  /** Loading indicator during initial fetch or network calls. */
  readonly loading = signal<boolean>(false);

  /** Submitting indicator during order placement. */
  readonly submitting = signal<boolean>(false);

  /** Currently initialized table identifier. */
  readonly activeTableId = signal<number | null>(null);

  /** Guest nickname signal for reactive UI bindings. */
  readonly currentGuestName = signal<string>(this.getGuestName() || '');

  private wsSubscription?: Subscription;

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
      let group = map.get(item.guestSessionId);
      if (!group) {
        group = {
          guestSessionId: item.guestSessionId,
          guestName: item.guestName,
          isCurrentGuest: item.guestSessionId === currentSessionId,
          items: [],
          totalItems: 0,
          totalPrice: 0,
        };
        map.set(item.guestSessionId, group);
      }
      group.items.push(item);
      group.totalItems += item.quantite;
      group.totalPrice += item.totalLigne;
    }

    // Sort so that the current user's group appears first, followed by others alphabetically
    return Array.from(map.values()).sort((a, b) => {
      if (a.isCurrentGuest && !b.isCurrentGuest) return -1;
      if (!a.isCurrentGuest && b.isCurrentGuest) return 1;
      return a.guestName.localeCompare(b.guestName);
    });
  });

  /**
   * Total items count in the collaborative cart.
   */
  readonly totalItems = computed<number>(() => this.cart()?.totalItems ?? 0);

  /**
   * Total price across all guests in the collaborative cart.
   */
  readonly totalPrice = computed<number>(() => this.cart()?.totalPrice ?? this.cart()?.tableTotal ?? 0);


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

    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }

    this.wsSubscription = this.webSocketService
      .watch(`/topic/tables/${tableId}/cart`)
      .subscribe({
        next: message => {
          try {
            const updatedCart: TableCart = JSON.parse(message.body);
            this.cart.set(updatedCart);
          } catch (err) {
            console.error('Failed to parse incoming table cart payload', err);
          }
        },
        error: err => console.warn('Table cart STOMP subscription error', err),
      });

    return this.http.get<TableCart>(`${environment.apiUrl}/public/tables/${tableId}/cart`).pipe(
      tap({
        next: fetchedCart => {
          this.cart.set(fetchedCart);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      })
    );
  }

  /**
   * Adds an item to the collaborative table cart.
   *
   * @param tableId Table identifier
   * @param request Add item request payload
   * @returns Observable emitting created TableCartItem
   */
  addItem(tableId: number, request: TableCartItemRequest): Observable<TableCartItem> {
    return this.http
      .post<TableCartItem>(`${environment.apiUrl}/public/tables/${tableId}/cart/items`, request)
      .pipe(
        tap(newItem => {
          const current = this.cart() ?? {
            tableId,
            status: 'OPEN' as TableCartStatus,
            items: [],
            totalItems: 0,
            totalPrice: 0,
          };
          const items = [...(current.items || []), newItem];
          const totalItems = items.reduce((acc, it) => acc + (it.quantite || 1), 0);
          const totalPrice = items.reduce(
            (acc, it) => acc + (it.totalLigne || (it.quantite || 1) * (it.prixUnitaire || 0)),
            0
          );
          this.cart.set({ ...current, items, totalItems, totalPrice });
        })
      );
  }


  /**
   * Updates quantity and notes for an existing cart item.
   *
   * @param tableId Table identifier
   * @param itemId Cart item identifier
   * @param request Update request payload
   * @returns Observable emitting updated TableCartItem
   */
  updateItem(tableId: number, itemId: number, request: TableCartItemUpdateRequest): Observable<TableCartItem> {
    return this.http
      .put<TableCartItem>(`${environment.apiUrl}/public/tables/${tableId}/cart/items/${itemId}`, request)
      .pipe(
        tap(updatedItem => {
          const current = this.cart();
          if (current) {
            const items = current.items.map(it => (it.id === itemId ? updatedItem : it));
            const totalItems = items.reduce((acc, it) => acc + it.quantite, 0);
            const totalPrice = items.reduce((acc, it) => acc + it.totalLigne, 0);
            this.cart.set({ ...current, items, totalItems, totalPrice });
          }
        })
      );
  }

  /**
   * Removes an item from the collaborative table cart.
   *
   * @param tableId Table identifier
   * @param itemId Cart item identifier
   * @returns Observable emitting completion
   */
  removeItem(tableId: number, itemId: number): Observable<void> {
    const guestSessionId = this.getOrCreateGuestSessionId();
    return this.http
      .delete<void>(`${environment.apiUrl}/public/tables/${tableId}/cart/items/${itemId}`, {
        params: { guestSessionId },
      })
      .pipe(
        tap(() => {
          const current = this.cart();
          if (current) {
            const items = current.items.filter(it => it.id !== itemId);
            const totalItems = items.reduce((acc, it) => acc + it.quantite, 0);
            const totalPrice = items.reduce((acc, it) => acc + it.totalLigne, 0);
            this.cart.set({ ...current, items, totalItems, totalPrice });
          }
        })
      );
  }

  /**
   * Clears all items from the collaborative table cart.
   *
   * @param tableId Table identifier
   * @returns Observable emitting completion
   */
  clearCart(tableId: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/public/tables/${tableId}/cart`)
      .pipe(
        tap(() => {
          const current = this.cart();
          if (current) {
            this.cart.set({ ...current, items: [], totalItems: 0, totalPrice: 0 });
          }
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
   * Resets local cart state and tears down WebSocket subscriptions.
   */
  reset(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = undefined;
    }
    this.cart.set(null);
    this.activeTableId.set(null);
    this.loading.set(false);
    this.submitting.set(false);
  }

  ngOnDestroy(): void {
    this.reset();
  }
}
