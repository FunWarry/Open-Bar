import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, NgZone, signal } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { firstValueFrom } from 'rxjs';
import { Commande, CreateCommandeRequest, OfflineQueuedOrder } from '../models/commande.model';

interface OfflineDB extends DBSchema {
  pending_orders: {
    key: string;
    value: OfflineQueuedOrder;
    indexes: {
      'by-status': string;
      'by-created': string;
    };
  };
}

const DB_NAME = 'openbar_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_orders';

/**
 * Service managing offline-first order queueing and background synchronization for waitstaff.
 * <p>
 * Backed by IndexedDB (via idb) to reliably store orders taken in Wi-Fi dead zones,
 * and automatically flushes pending orders once network connectivity is restored.
 */
@Injectable({
  providedIn: 'root',
})
export class OfflineOrderService {
  private readonly http = inject(HttpClient);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly ngZone = inject(NgZone);

  private readonly commandesUrl = '/api/commandes';
  private dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

  /**
   * Signal indicating whether the browser currently has network connectivity.
   */
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  /**
   * Signal containing the list of all orders currently stored in the offline queue.
   */
  readonly pendingOrders = signal<OfflineQueuedOrder[]>([]);

  /**
   * Computed signal representing the number of pending orders awaiting synchronization.
   */
  readonly pendingCount = computed(() => this.pendingOrders().length);

  /**
   * Signal indicating whether a synchronization batch is actively in progress.
   */
  readonly isSyncing = signal<boolean>(false);

  constructor() {
    this.initNetworkListeners();
    queueMicrotask(() => {
      void this.refreshPendingOrders();
    });
  }

  /**
   * Initializes browser online/offline event listeners.
   */
  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.ngZone.run(() => {
        this.isOnline.set(true);
        void this.syncPendingOrders();
      });
    });

    window.addEventListener('offline', () => {
      this.ngZone.run(() => {
        this.isOnline.set(false);
      });
    });
  }

  /**
   * Opens or returns the cached IndexedDB database connection.
   *
   * @returns Promise resolving to the IndexedDB database instance
   */
  private getDb(): Promise<IDBPDatabase<OfflineDB>> {
    this.dbPromise ??= openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'clientRequestId' });
          store.createIndex('by-status', 'status');
          store.createIndex('by-created', 'createdAt');
        }
      },
    });
    return this.dbPromise;
  }

  /**
   * Refreshes the internal signal with the current list of pending orders from IndexedDB.
   */
  async refreshPendingOrders(): Promise<void> {
    try {
      const db = await this.getDb();
      const allOrders = await db.getAll(STORE_NAME);
      this.ngZone.run(() => {
        this.pendingOrders.set(allOrders);
      });
    } catch (err) {
      console.warn('[OfflineOrderService] Failed to read pending orders from IndexedDB:', err);
    }
  }

  /**
   * Queues an order into IndexedDB for background synchronization.
   *
   * @param order Partial order payload without generated metadata
   * @returns The queued order with assigned metadata
   */
  async queueOrder(
    order: Omit<OfflineQueuedOrder, 'createdAt' | 'status' | 'retryCount'>,
  ): Promise<OfflineQueuedOrder> {
    const queued: OfflineQueuedOrder = {
      ...order,
      clientRequestId: order.clientRequestId || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0,
    };

    const db = await this.getDb();
    await db.put(STORE_NAME, queued);
    await this.refreshPendingOrders();

    return queued;
  }

  /**
   * Removes a specific order from the offline queue by its client request ID.
   *
   * @param clientRequestId Unique identifier of the queued order
   */
  async removeOrder(clientRequestId: string): Promise<void> {
    const db = await this.getDb();
    await db.delete(STORE_NAME, clientRequestId);
    await this.refreshPendingOrders();
  }

  /**
   * Clears all orders from the offline queue.
   */
  async clearAll(): Promise<void> {
    const db = await this.getDb();
    await db.clear(STORE_NAME);
    await this.refreshPendingOrders();
  }

  /**
   * Synchronizes all pending offline orders with the backend API.
   *
   * @returns Object summarizing the number of successfully synced and failed orders
   */
  async syncPendingOrders(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing() || !this.isOnline()) {
      return { synced: 0, failed: 0 };
    }

    const orders = this.pendingOrders();
    if (orders.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing.set(true);
    let synced = 0;
    let failed = 0;

    try {
      const db = await this.getDb();
      for (const order of orders) {
        const success = await this.syncSingleOrder(order, db);
        if (success) {
          synced++;
        } else {
          failed++;
          if (order.status !== 'FAILED') {
            break;
          }
        }
      }

      await this.refreshPendingOrders();
      await this.notifySyncResults(synced, failed);
    } finally {
      this.ngZone.run(() => {
        this.isSyncing.set(false);
      });
    }

    return { synced, failed };
  }

  /**
   * Attempts to synchronize a single queued order with the backend.
   *
   * @param order The queued offline order
   * @param db IndexedDB database handle
   * @returns True if successfully synchronized and deleted from queue, false otherwise
   */
  private async syncSingleOrder(
    order: OfflineQueuedOrder,
    db: IDBPDatabase<OfflineDB>,
  ): Promise<boolean> {
    try {
      const payload: CreateCommandeRequest = {
        tableId: order.tableId,
        notes: order.notes,
        clientRequestId: order.clientRequestId,
        items: order.items.map(it => ({
          cocktailId: it.cocktailId,
          quantite: it.quantite,
          prixUnitaire: it.prixUnitaire,
          varianteId: it.varianteId,
          notes: it.notes,
          prioritaire: it.prioritaire,
        })),
      };

      await firstValueFrom(this.http.post<Commande>(this.commandesUrl, payload));
      await db.delete(STORE_NAME, order.clientRequestId);
      return true;
    } catch (err: unknown) {
      console.error('[OfflineOrderService] Failed to sync order:', order.clientRequestId, err);
      await this.handleSyncFailure(order, db, err);
      return false;
    }
  }

  /**
   * Handles error state persistence for a failed order synchronization attempt.
   *
   * @param order The failed queued offline order
   * @param db IndexedDB database handle
   * @param err The caught synchronization error
   */
  private async handleSyncFailure(
    order: OfflineQueuedOrder,
    db: IDBPDatabase<OfflineDB>,
    err: unknown,
  ): Promise<void> {
    const httpStatus = (err as { status?: number })?.status;
    if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
      order.status = 'FAILED';
      order.lastError = `HTTP ${httpStatus}`;
    } else {
      order.retryCount = (order.retryCount || 0) + 1;
      order.status = 'PENDING';
    }
    await db.put(STORE_NAME, order);
  }

  /**
   * Displays toast notifications and emits events summarizing synchronization results.
   *
   * @param synced Number of successfully synchronized orders
   * @param failed Number of failed orders
   */
  private async notifySyncResults(synced: number, failed: number): Promise<void> {
    if (synced > 0) {
      const key = synced > 1 ? 'OFFLINE.SYNC_SUCCESS_PLURAL' : 'OFFLINE.SYNC_SUCCESS';
      const message = this.transloco.translate(key, { count: synced });
      const toast = await this.toastCtrl.create({
        message,
        duration: 3000,
        color: 'success',
        position: 'bottom',
      });
      await toast.present();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('openbar:orders-synced', { detail: { synced } }));
      }
      return;
    }

    if (failed > 0) {
      const message = this.transloco.translate('OFFLINE.SYNC_ERROR');
      const toast = await this.toastCtrl.create({
        message,
        duration: 3500,
        color: 'warning',
        position: 'bottom',
      });
      await toast.present();
    }
  }
}
