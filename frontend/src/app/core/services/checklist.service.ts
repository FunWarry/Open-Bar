import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, tap, catchError, of, takeUntil, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChecklistCategory,
  ChecklistEvent,
  ChecklistRun,
  ChecklistRunStatus,
  ChecklistStats,
  ChecklistTemplate,
  CompleteChecklistRunRequest,
  CreateChecklistTemplateRequest,
  StartChecklistRunRequest,
  ToggleChecklistRunItemRequest
} from '../models/checklist.model';
import { WebSocketService } from './websocket.service';

/**
 * Service managing operational task checklists, SOP procedure templates, and execution audit sessions.
 * Provides reactive signals, REST API calls, and real-time STOMP WebSocket synchronization on `/topic/checklists`.
 */
@Injectable({ providedIn: 'root' })
export class ChecklistService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly wsService = inject(WebSocketService, { optional: true });
  private readonly baseUrl = `${environment.apiUrl}/checklists`;
  private readonly destroy$ = new Subject<void>();

  /**
   * Guarantees consistent non-null values for calculation properties across frontend components.
   */
  private normalizeRun(run: ChecklistRun): ChecklistRun {
    if (!run) return run;
    const progress = run.progressPercentage ?? run.completionPercentage ?? 0;
    const completed = run.completedItemsCount ?? (run.items ? run.items.filter(i => i.isCompleted).length : 0);
    const total = run.totalItemsCount ?? (run.items ? run.items.length : 0);
    const mandatory = run.mandatoryPendingCount ?? (run.items ? run.items.filter(i => i.isMandatory && !i.isCompleted).length : 0);
    return {
      ...run,
      progressPercentage: progress,
      completionPercentage: progress,
      completedItemsCount: completed,
      totalItemsCount: total,
      mandatoryPendingCount: mandatory
    };
  }

  /**
   * Idempotently inserts or updates an execution run in the reactive signal list.
   * Guarantees no duplicate items even when WebSocket broadcasts and HTTP responses overlap.
   */
  private upsertRun(run: ChecklistRun): void {
    if (!run) return;
    const normalized = this.normalizeRun(run);
    this.runs.update(current => {
      const exists = current.some(r => r.id === normalized.id);
      return exists ? current.map(r => (r.id === normalized.id ? normalized : r)) : [normalized, ...current];
    });
  }

  /**
   * Idempotently inserts or updates a template in the reactive signal list.
   */
  private upsertTemplate(template: ChecklistTemplate): void {
    if (!template) return;
    this.templates.update(current => {
      const exists = current.some(t => t.id === template.id);
      return exists ? current.map(t => (t.id === template.id ? template : t)) : [template, ...current];
    });
  }

  /** Reactive list of reusable SOP templates. */
  readonly templates = signal<ChecklistTemplate[]>([]);

  /** Reactive list of execution runs (in-progress and recent history). */
  readonly runs = signal<ChecklistRun[]>([]);

  /** Selected active run being viewed or worked on. */
  readonly selectedRun = signal<ChecklistRun | null>(null);

  /** Operational statistics overview. */
  readonly stats = signal<ChecklistStats>({
    activeRunsCount: 0,
    completedTodayCount: 0,
    totalTemplatesCount: 0,
    completionRateToday: 100,
  });

  /** Loading state flag. */
  readonly isLoading = signal<boolean>(false);

  /** Computed list of active in-progress runs. */
  readonly activeRuns = computed(() =>
    this.runs().filter(r => r.status === 'IN_PROGRESS')
  );

  /** Computed list of completed historical runs. */
  readonly completedRuns = computed(() =>
    this.runs().filter(r => r.status === 'COMPLETED')
  );

  /** Real-time WebSocket event feed. */
  readonly events$ = new Subject<ChecklistEvent>();

  constructor() {
    this.initWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all SOP checklist templates from the backend.
   *
   * @param category Optional category filter
   * @param activeOnly Whether to retrieve only active templates (defaults to true)
   * @returns Observable emitting loaded templates
   */
  loadTemplates(category?: ChecklistCategory, activeOnly: boolean = false): Observable<ChecklistTemplate[]> {
    let params = new HttpParams().set('activeOnly', activeOnly.toString());
    if (category) {
      params = params.set('category', category);
    }

    return this.http.get<ChecklistTemplate[]>(`${this.baseUrl}/templates`, { params }).pipe(
      tap(templates => this.templates.set(templates)),
      catchError(err => {
        console.error('[ChecklistService] Failed to load templates', err);
        return of([]);
      })
    );
  }

  /**
   * Retrieves a single template by ID.
   *
   * @param id Template identifier
   * @returns Observable emitting the template
   */
  getTemplate(id: number): Observable<ChecklistTemplate> {
    return this.http.get<ChecklistTemplate>(`${this.baseUrl}/templates/${id}`);
  }

  /**
   * Creates a new reusable SOP checklist template.
   *
   * @param request Template creation payload
   * @returns Observable emitting the created template
   */
  createTemplate(request: CreateChecklistTemplateRequest): Observable<ChecklistTemplate> {
    return this.http.post<ChecklistTemplate>(`${this.baseUrl}/templates`, request).pipe(
      tap(created => {
        this.upsertTemplate(created);
      })
    );
  }

  /**
   * Updates an existing SOP checklist template.
   *
   * @param id Template identifier
   * @param request Update payload
   * @returns Observable emitting the updated template
   */
  updateTemplate(id: number, request: CreateChecklistTemplateRequest): Observable<ChecklistTemplate> {
    return this.http.put<ChecklistTemplate>(`${this.baseUrl}/templates/${id}`, request).pipe(
      tap(updated => {
        this.templates.update(current => current.map(t => t.id === id ? updated : t));
      })
    );
  }

  /**
   * Deactivates or deletes a checklist template.
   *
   * @param id Template identifier
   * @returns Observable emitting completion
   */
  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/templates/${id}`).pipe(
      tap(() => {
        this.templates.update(current => current.filter(t => t.id !== id));
      })
    );
  }

  /**
   * Loads execution runs from the backend.
   *
   * @param status Optional run lifecycle status filter
   * @param category Optional category filter
   * @returns Observable emitting loaded runs
   */
  loadRuns(status?: ChecklistRunStatus, category?: ChecklistCategory): Observable<ChecklistRun[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (category) {
      params = params.set('category', category);
    }

    this.isLoading.set(true);
    return this.http.get<ChecklistRun[]>(`${this.baseUrl}/runs`, { params }).pipe(
      map(runs => (runs || []).map(r => this.normalizeRun(r))),
      tap(runs => {
        this.runs.set(runs);
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.error('[ChecklistService] Failed to load runs', err);
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  /**
   * Retrieves a specific checklist run session by ID.
   *
   * @param id Run identifier
   * @returns Observable emitting the run
   */
  getRun(id: number): Observable<ChecklistRun> {
    return this.http.get<ChecklistRun>(`${this.baseUrl}/runs/${id}`).pipe(
      map(run => this.normalizeRun(run)),
      tap(run => {
        this.selectedRun.set(run);
      })
    );
  }

  /**
   * Starts a new checklist execution run from a template.
   *
   * @param request Run launch payload
   * @returns Observable emitting the started run
   */
  startRun(request: StartChecklistRunRequest): Observable<ChecklistRun> {
    return this.http.post<ChecklistRun>(`${this.baseUrl}/runs`, request).pipe(
      map(run => this.normalizeRun(run)),
      tap(run => {
        this.upsertRun(run);
        this.selectedRun.set(run);
        this.refreshStats();
      })
    );
  }

  /**
   * Toggles completion status and audit details of an individual run task item.
   *
   * @param runId Run identifier
   * @param itemId Item identifier
   * @param request Toggle payload with optional comment and photo proof
   * @returns Observable emitting the updated run
   */
  toggleRunItem(runId: number, itemId: number, request: ToggleChecklistRunItemRequest): Observable<ChecklistRun> {
    return this.http.put<ChecklistRun>(`${this.baseUrl}/runs/${runId}/items/${itemId}`, request).pipe(
      map(run => this.normalizeRun(run)),
      tap(updatedRun => {
        this.runs.update(current =>
          current.map(run => (run.id === runId ? updatedRun : run))
        );
        if (this.selectedRun()?.id === runId) {
          this.selectedRun.set(updatedRun);
        }
        this.refreshStats();
      })
    );
  }

  /**
   * Finalizes and completes a checklist run session.
   *
   * @param runId Run identifier
   * @param request Completion request with optional final notes
   * @returns Observable emitting the finalized run
   */
  completeRun(runId: number, request: CompleteChecklistRunRequest = {}): Observable<ChecklistRun> {
    return this.http.post<ChecklistRun>(`${this.baseUrl}/runs/${runId}/complete`, request).pipe(
      map(run => this.normalizeRun(run)),
      tap(completed => {
        this.runs.update(current => current.map(r => r.id === runId ? completed : r));
        if (this.selectedRun()?.id === runId) {
          this.selectedRun.set(completed);
        }
        this.refreshStats();
      })
    );
  }

  /**
   * Cancels an ongoing checklist run session.
   *
   * @param runId Run identifier
   * @returns Observable emitting the cancelled run
   */
  cancelRun(runId: number): Observable<ChecklistRun> {
    return this.http.post<ChecklistRun>(`${this.baseUrl}/runs/${runId}/cancel`, {}).pipe(
      map(run => this.normalizeRun(run)),
      tap(cancelled => {
        this.runs.update(current => current.map(r => r.id === runId ? cancelled : r));
        if (this.selectedRun()?.id === runId) {
          this.selectedRun.set(cancelled);
        }
        this.refreshStats();
      })
    );
  }

  /**
   * Retrieves dashboard statistics for operational checklists.
   *
   * @returns Observable emitting current statistics
   */
  loadStats(): Observable<ChecklistStats> {
    return this.http.get<ChecklistStats>(`${this.baseUrl}/stats`).pipe(
      map(stats => ({
        activeRunsCount: stats?.activeRunsCount ?? 0,
        completedTodayCount: stats?.completedTodayCount ?? 0,
        totalTemplatesCount: stats?.totalTemplatesCount ?? stats?.activeTemplatesCount ?? 0,
        completionRateToday: stats?.completionRateToday ?? stats?.averageCompletionPercentageToday ?? 0,
      })),
      tap(stats => this.stats.set(stats)),
      catchError(err => {
        console.error('[ChecklistService] Failed to load stats', err);
        return of(this.stats());
      })
    );
  }

  /**
   * Uploads an SOP guide media file (photo or video demonstration).
   *
   * @param file File binary
   * @returns Observable emitting the media URL and media type
   */
  uploadMedia(file: File): Observable<{ url: string; mediaType: 'IMAGE' | 'VIDEO' }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; mediaType: 'IMAGE' | 'VIDEO' }>(`${this.baseUrl}/media/upload`, formData);
  }

  /** Refreshes operational statistics. */
  refreshStats(): void {
    this.loadStats().subscribe();
  }

  private initWebSocket(): void {
    if (!this.wsService) {
      return;
    }

    this.wsService
      .watch('/topic/checklists')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const event = (typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body) as ChecklistEvent;
          if (event) {
            this.handleWebSocketEvent(event);
          }
        } catch (err) {
          console.error('[ChecklistService] Failed to parse WebSocket message', err);
        }
      });
  }

  private handleWebSocketEvent(event: ChecklistEvent): void {
    this.events$.next(event);

    if (event.eventType === 'RUN_STARTED' && event.run) {
      this.upsertRun(event.run);
      this.refreshStats();
    } else if (event.eventType === 'ITEM_UPDATED' && event.run) {
      this.upsertRun(event.run);
      if (this.selectedRun()?.id === event.run.id) {
        this.selectedRun.set(this.normalizeRun(event.run));
      }
    } else if ((event.eventType === 'RUN_COMPLETED' || event.eventType === 'RUN_CANCELLED') && event.run) {
      this.upsertRun(event.run);
      if (this.selectedRun()?.id === event.run.id) {
        this.selectedRun.set(this.normalizeRun(event.run));
      }
      this.refreshStats();
    } else if (event.eventType === 'TEMPLATE_UPDATED' && event.template) {
      this.upsertTemplate(event.template);
    }
  }
}
