import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of, Subject, takeUntil, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ESTABLISHMENT_PRESETS,
  EstablishmentModule,
  EstablishmentModules,
  EstablishmentPresetType
} from '../models/establishment-module.model';
import { WebSocketService } from './websocket.service';

/** Default fallback configuration with all modules enabled. */
const DEFAULT_MODULES: EstablishmentModules = {
  cuisineKds: true,
  happyHour: true,
  employeeManagement: true,
  floorPlan: true,
  qrClientOrdering: true,
  stockTracking: true,
};

/**
 * Service managing establishment modular capability flags and feature switches.
 * Provides reactive signals, HTTP synchronization, and real-time WebSocket updates.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagService implements OnDestroy {
  private readonly api = `${environment.apiUrl}/establishment/modules`;
  private readonly http = inject(HttpClient, { optional: true });
  private readonly ws = inject(WebSocketService, { optional: true });
  private readonly destroy$ = new Subject<void>();

  /** Current state of all modular capabilities. */
  readonly modules = signal<EstablishmentModules>(DEFAULT_MODULES);

  /** Indicates whether the initial feature flags have been loaded from the server. */
  readonly isLoaded = signal<boolean>(false);

  /** Computed signal for CUISINE_KDS capability status. */
  readonly cuisineKdsEnabled = computed(() => this.modules().cuisineKds);

  /** Computed signal for HAPPY_HOUR capability status. */
  readonly happyHourEnabled = computed(() => this.modules().happyHour);

  /** Computed signal for EMPLOYEE_MANAGEMENT capability status. */
  readonly employeeManagementEnabled = computed(() => this.modules().employeeManagement);

  /** Computed signal for FLOOR_PLAN capability status. */
  readonly floorPlanEnabled = computed(() => this.modules().floorPlan);

  /** Computed signal for QR_CLIENT_ORDERING capability status. */
  readonly qrClientOrderingEnabled = computed(() => this.modules().qrClientOrdering);

  /** Computed signal for STOCK_TRACKING capability status. */
  readonly stockTrackingEnabled = computed(() => this.modules().stockTracking);

  constructor() {
    this.initWebSocketSubscription();
    this.loadModules().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Checks whether a specific modular capability is currently enabled.
   *
   * @param module Capability identifier to verify
   * @returns True if enabled, false otherwise
   */
  isModuleEnabled(module: EstablishmentModule): boolean {
    const current = this.modules();
    switch (module) {
      case EstablishmentModule.CUISINE_KDS:
        return current.cuisineKds;
      case EstablishmentModule.HAPPY_HOUR:
        return current.happyHour;
      case EstablishmentModule.EMPLOYEE_MANAGEMENT:
        return current.employeeManagement;
      case EstablishmentModule.FLOOR_PLAN:
        return current.floorPlan;
      case EstablishmentModule.QR_CLIENT_ORDERING:
        return current.qrClientOrdering;
      case EstablishmentModule.STOCK_TRACKING:
        return current.stockTracking;
      default:
        return true;
    }
  }

  /**
   * Fetches latest modular feature configuration from the backend API.
   *
   * @returns Observable emitting loaded {@link EstablishmentModules}
   */
  loadModules(): Observable<EstablishmentModules> {
    if (!this.http) {
      this.isLoaded.set(true);
      return of(this.modules());
    }

    return this.http.get<EstablishmentModules>(this.api).pipe(
      tap(mods => {
        if (mods) {
          this.modules.set(mods);
          this.isLoaded.set(true);
        }
      }),
      catchError(err => {
        console.warn('[FeatureFlagService] Failed to load modules, keeping defaults', err);
        this.isLoaded.set(true);
        return of(this.modules());
      })
    );
  }

  /**
   * Updates establishment modular configuration via the backend API.
   *
   * @param updated Complete updated modular configuration
   * @returns Observable emitting confirmed {@link EstablishmentModules}
   */
  updateModules(updated: EstablishmentModules): Observable<EstablishmentModules> {
    if (!this.http) {
      this.modules.set(updated);
      return of(updated);
    }

    return this.http.put<EstablishmentModules>(this.api, updated).pipe(
      tap(confirmed => {
        if (confirmed) {
          this.modules.set(confirmed);
        }
      })
    );
  }

  /**
   * Toggles or updates a single module capability.
   *
   * @param module Capability to update
   * @param enabled New status
   * @returns Observable emitting updated {@link EstablishmentModules}
   */
  setModule(module: EstablishmentModule, enabled: boolean): Observable<EstablishmentModules> {
    const current = { ...this.modules() };
    switch (module) {
      case EstablishmentModule.CUISINE_KDS:
        current.cuisineKds = enabled;
        break;
      case EstablishmentModule.HAPPY_HOUR:
        current.happyHour = enabled;
        break;
      case EstablishmentModule.EMPLOYEE_MANAGEMENT:
        current.employeeManagement = enabled;
        break;
      case EstablishmentModule.FLOOR_PLAN:
        current.floorPlan = enabled;
        break;
      case EstablishmentModule.QR_CLIENT_ORDERING:
        current.qrClientOrdering = enabled;
        break;
      case EstablishmentModule.STOCK_TRACKING:
        current.stockTracking = enabled;
        break;
    }
    return this.updateModules(current);
  }

  /**
   * Applies an establishment preset (e.g. BAR, RESTAURANT, FOOD_TRUCK, NIGHTCLUB).
   *
   * @param preset Preset key to apply
   * @returns Observable emitting updated {@link EstablishmentModules}
   */
  applyPreset(preset: Exclude<EstablishmentPresetType, 'CUSTOM'>): Observable<EstablishmentModules> {
    const config = ESTABLISHMENT_PRESETS[preset];
    if (!config) {
      return of(this.modules());
    }
    return this.updateModules(config);
  }

  private initWebSocketSubscription(): void {
    if (!this.ws) {
      return;
    }

    this.ws.watch('/topic/establishment/modules')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
          if (data && typeof data === 'object') {
            this.modules.set(data as EstablishmentModules);
            this.isLoaded.set(true);
          }
        } catch (err) {
          console.error('[FeatureFlagService] Failed to parse module update message', err);
        }
      });
  }
}
