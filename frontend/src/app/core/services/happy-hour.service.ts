import { inject, Injectable, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActiveCountdownInfo,
  DayOfWeek,
  DiscountType,
  HappyHourRule,
  HappyHourRuleRequest,
  HappyHourStateTransition,
  PricingPreviewResult,
  UpcomingTeaserInfo
} from '../models/happy-hour.model';

/**
 * Service managing Happy Hour dynamic pricing rules, live price calculation,
 * real-time countdown banners, upcoming promotion teasers, and rule simulation.
 */
@Injectable({ providedIn: 'root' })
export class HappyHourService implements OnDestroy {
  private readonly api = `${environment.apiUrl}/happy-hour`;
  private readonly http = inject(HttpClient);

  /** Internal reactive signal holding all configured rules. */
  private readonly rulesSignal = signal<HappyHourRule[]>([]);

  /** Read-only signal exposing all configured rules. */
  readonly rules = this.rulesSignal.asReadonly();

  /** Signal exposing only active rules currently enabled. */
  readonly activeRules = computed(() => this.rulesSignal().filter(r => r.active));

  /** Signal exposing rules that are currently valid right now. */
  readonly currentActiveRules = computed(() =>
    this.rulesSignal().filter(r => r.active && this.isRuleApplicableNow(r))
  );

  /** Internal reactive signal for active Happy Hour countdown state. */
  private readonly activeCountdownSignal = signal<ActiveCountdownInfo | null>(null);

  /** Read-only signal exposing live active Happy Hour countdown banner information. */
  readonly activeCountdown = this.activeCountdownSignal.asReadonly();

  /** Internal reactive signal for upcoming Happy Hour teaser preview state. */
  private readonly upcomingTeaserSignal = signal<UpcomingTeaserInfo | null>(null);

  /** Read-only signal exposing upcoming Happy Hour teaser information (starts within <= 60m). */
  readonly upcomingTeaser = this.upcomingTeaserSignal.asReadonly();

  /** Event stream emitting whenever Happy Hour status transitions between active and inactive. */
  readonly stateTransition$ = new Subject<HappyHourStateTransition>();

  private tickerTimer: ReturnType<typeof setInterval> | null = null;
  private wasActiveLastTick: boolean | null = null;

  constructor() {
    this.startLiveTicker();
  }

  /**
   * Cleans up interval timers and event subjects upon service teardown.
   */
  ngOnDestroy(): void {
    this.stopLiveTicker();
    this.stateTransition$.complete();
  }

  /**
   * Starts live 1-second interval ticker for updating countdown and teaser signals.
   */
  startLiveTicker(): void {
    if (this.tickerTimer) {
      return;
    }
    this.updateCountdownAndTeaser();
    this.tickerTimer = setInterval(() => {
      this.updateCountdownAndTeaser();
    }, 1000);
  }

  /**
   * Halts live interval ticker.
   */
  stopLiveTicker(): void {
    if (this.tickerTimer) {
      clearInterval(this.tickerTimer);
      this.tickerTimer = null;
    }
  }

  /**
   * Fetches all configured Happy Hour rules from the backend.
   *
   * @returns Observable array of HappyHourRule
   */
  getAllRules(): Observable<HappyHourRule[]> {
    return this.http.get<HappyHourRule[]>(this.api).pipe(
      tap(rules => {
        this.rulesSignal.set(rules);
        this.updateCountdownAndTeaser();
      })
    );
  }

  /**
   * Alias for getAllRules to fetch and refresh the in-memory rules signal.
   */
  loadRules(): Observable<HappyHourRule[]> {
    return this.getAllRules();
  }

  /**
   * Fetches only active Happy Hour rules from the backend.
   *
   * @returns Observable array of active HappyHourRule
   */
  getActiveRules(): Observable<HappyHourRule[]> {
    return this.http.get<HappyHourRule[]>(`${this.api}/active`);
  }

  /**
   * Retrieves a single Happy Hour rule by its unique identifier.
   *
   * @param id The rule identifier
   * @returns Observable of HappyHourRule
   */
  getRuleById(id: number): Observable<HappyHourRule> {
    return this.http.get<HappyHourRule>(`${this.api}/${id}`);
  }

  /**
   * Creates a new Happy Hour pricing rule.
   *
   * @param rule The rule creation payload
   * @returns Observable of the newly created HappyHourRule
   */
  createRule(rule: HappyHourRuleRequest): Observable<HappyHourRule> {
    return this.http.post<HappyHourRule>(this.api, rule).pipe(
      tap(created => this.rulesSignal.update(list => [...list, created]))
    );
  }

  /**
   * Updates an existing Happy Hour pricing rule.
   *
   * @param id The identifier of the rule to update
   * @param rule The updated rule payload
   * @returns Observable of the updated HappyHourRule
   */
  updateRule(id: number, rule: HappyHourRuleRequest): Observable<HappyHourRule> {
    return this.http.put<HappyHourRule>(`${this.api}/${id}`, rule).pipe(
      tap(updated => this.rulesSignal.update(list => list.map(r => r.id === id ? updated : r)))
    );
  }

  /**
   * Toggles the active status of a Happy Hour rule.
   *
   * @param id The identifier of the rule to toggle
   * @returns Observable of the updated HappyHourRule
   */
  toggleRule(id: number): Observable<HappyHourRule> {
    return this.http.patch<HappyHourRule>(`${this.api}/${id}/toggle`, {}).pipe(
      tap(updated => this.rulesSignal.update(list => list.map(r => r.id === id ? updated : r)))
    );
  }

  /**
   * Deletes a Happy Hour pricing rule.
   *
   * @param id The identifier of the rule to delete
   * @returns Observable of void
   */
  deleteRule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`).pipe(
      tap(() => this.rulesSignal.update(list => list.filter(r => r.id !== id)))
    );
  }

  /**
   * Requests a live price preview for a cocktail from the backend.
   *
   * @param cocktailId The cocktail identifier
   * @param varianteId Optional variant identifier
   * @param at Optional ISO instant or date-time string
   * @returns Observable of PricingPreviewResult
   */
  previewPrice(cocktailId: number, varianteId?: number | null, at?: string): Observable<PricingPreviewResult> {
    let params = new HttpParams().set('cocktailId', cocktailId.toString());
    if (varianteId != null) {
      params = params.set('varianteId', varianteId.toString());
    }
    if (at) {
      params = params.set('at', at);
    }
    return this.http.get<PricingPreviewResult>(`${this.api}/preview`, { params });
  }

  /**
   * Simulates dynamic pricing under a draft rule definition.
   *
   * @param rule Draft rule definition
   * @param at Optional target date-time string
   * @returns Observable array of PricingPreviewResult for catalog items
   */
  simulateRule(rule: HappyHourRuleRequest, at?: string): Observable<PricingPreviewResult[]> {
    let params = new HttpParams();
    if (at) {
      params = params.set('at', at);
    }
    return this.http.post<PricingPreviewResult[]>(`${this.api}/simulate`, rule, { params });
  }

  /**
   * Checks if a Happy Hour rule is applicable at a given date/time (default: now).
   * Supports rules spanning midnight (e.g. 22:00 to 02:00).
   *
   * @param rule The rule to test
   * @param date The date/time to evaluate against
   * @returns boolean true if applicable
   */
  isRuleApplicableNow(rule: HappyHourRule, date: Date = new Date()): boolean {
    if (!rule.active) {
      return false;
    }

    const dayName = this.getDayOfWeek(date);
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dayName)) {
      return false;
    }

    const timeStr = this.formatTimeString(date);
    const start = rule.startTime.substring(0, 5);
    const end = rule.endTime.substring(0, 5);

    if (start <= end) {
      return timeStr >= start && timeStr <= end;
    } else {
      // Overnight rule (e.g., 22:00 to 02:00)
      return timeStr >= start || timeStr <= end;
    }
  }

  /**
   * Resolves the promotional price for a cocktail given active rules in memory.
   *
   * @param basePrice The regular catalog base price
   * @param cocktailId The cocktail ID
   * @param category The cocktail category or null
   * @param date Optional date for evaluation (default: now)
   * @returns Object containing effectivePrice, isHappyHour, savings, and applied rule
   */
  resolvePrice(
    basePrice: number,
    cocktailId: number,
    category?: string | null,
    date: Date = new Date()
  ): {
    effectivePrice: number;
    isHappyHour: boolean;
    appliedRule: HappyHourRule | null;
    savings: number;
  } {
    const applicableRules = this.rulesSignal().filter(rule => {
      if (!this.isRuleApplicableNow(rule, date)) {
        return false;
      }
      return this.ruleMatchesItem(rule, cocktailId, category);
    });

    if (applicableRules.length === 0) {
      return {
        effectivePrice: basePrice,
        isHappyHour: false,
        appliedRule: null,
        savings: 0
      };
    }

    let lowestPrice = basePrice;
    let selectedRule: HappyHourRule | null = null;

    for (const rule of applicableRules) {
      const discounted = this.calculateDiscount(basePrice, rule.discountType, rule.discountValue);
      if (discounted < lowestPrice) {
        lowestPrice = discounted;
        selectedRule = rule;
      }
    }

    const savings = Math.max(0, Math.round((basePrice - lowestPrice) * 100) / 100);
    return {
      effectivePrice: lowestPrice,
      isHappyHour: lowestPrice < basePrice,
      appliedRule: selectedRule,
      savings
    };
  }

  /**
   * Computes the discounted price according to the discount strategy.
   *
   * @param basePrice Original catalog price
   * @param type Discount calculation strategy
   * @param value Discount value (percentage or monetary amount)
   * @returns Calculated price rounded to 2 decimals, min 0
   */
  calculateDiscount(basePrice: number, type: DiscountType, value: number): number {
    let result = basePrice;
    switch (type) {
      case 'PERCENTAGE':
        result = basePrice * (1.0 - value / 100.0);
        break;
      case 'FIXED_PRICE':
        result = Math.min(basePrice, value);
        break;
      case 'FIXED_DISCOUNT':
        result = basePrice - value;
        break;
    }
    return Math.max(0, Math.round(result * 100) / 100);
  }

  /**
   * Helper to check if a rule targets a cocktail ID or category.
   */
  private ruleMatchesItem(rule: HappyHourRule, cocktailId: number, category?: string | null): boolean {
    const hasCategoryFilter = rule.categories && rule.categories.length > 0;
    const hasCocktailFilter = rule.cocktailIds && rule.cocktailIds.length > 0;

    // If both are empty, rule applies to all catalog items
    if (!hasCategoryFilter && !hasCocktailFilter) {
      return true;
    }

    if (hasCocktailFilter && rule.cocktailIds.includes(cocktailId)) {
      return true;
    }

    if (hasCategoryFilter && category && rule.categories.includes(category)) {
      return true;
    }

    return false;
  }

  /**
   * Calculates the percentage discount between regular base price and promotional price.
   *
   * @param basePrice Non-discounted base price
   * @param effectivePrice Promotional discounted price
   * @returns Integer percentage saved (e.g. 25 for -25%), or null if no savings
   */
  calculateDiscountPercentage(basePrice: number, effectivePrice: number): number | null {
    if (basePrice > effectivePrice && basePrice > 0) {
      return Math.round(((basePrice - effectivePrice) / basePrice) * 100);
    }
    return null;
  }

  /**
   * Computes the number of seconds remaining until the specified active rule window expires.
   *
   * @param rule Applicable Happy Hour rule
   * @param date Evaluation timestamp
   * @returns Remaining seconds (minimum 0)
   */
  getSecondsUntilEnd(rule: HappyHourRule, date: Date = new Date()): number {
    const [endH, endM] = rule.endTime.substring(0, 5).split(':').map(Number);
    const target = new Date(date);
    target.setHours(endH, endM, 0, 0);

    const start = rule.startTime.substring(0, 5);
    const end = rule.endTime.substring(0, 5);
    const timeStr = this.formatTimeString(date);

    // If overnight rule and current time is before midnight, end target is tomorrow
    if (start > end && timeStr >= start) {
      target.setDate(target.getDate() + 1);
    }

    const diff = Math.floor((target.getTime() - date.getTime()) / 1000);
    return Math.max(0, diff);
  }

  /**
   * Computes the number of seconds until an upcoming rule starts, if scheduled within 60 minutes.
   *
   * @param rule Active rule definition
   * @param date Evaluation timestamp
   * @returns Remaining seconds until start (<= 3600), or null if not starting within 60 minutes
   */
  getSecondsUntilStart(rule: HappyHourRule, date: Date = new Date()): number | null {
    if (!rule.active) {
      return null;
    }
    const dayName = this.getDayOfWeek(date);
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dayName)) {
      return null;
    }

    const [startH, startM] = rule.startTime.substring(0, 5).split(':').map(Number);
    const target = new Date(date);
    target.setHours(startH, startM, 0, 0);

    const diff = Math.floor((target.getTime() - date.getTime()) / 1000);
    if (diff > 0 && diff <= 3600) {
      return diff;
    }
    return null;
  }

  /**
   * Formats a duration in seconds into MM:SS or HH:MM:SS format.
   *
   * @param seconds Total seconds
   * @returns Formatted time string
   */
  formatDuration(seconds: number): string {
    const s = seconds % 60;
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    const m = Math.floor(seconds / 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Resolves the transloco scope translation key and parameters for a rule.
   *
   * @param rule Target rule
   * @returns Object containing translation key and optional interpolation params
   */
  getRuleScope(rule: HappyHourRule): { key: string; params?: Record<string, unknown> } {
    if (rule.categories && rule.categories.length > 0) {
      return {
        key: 'PRICING.TARGET_CATEGORIES',
        params: { categories: rule.categories.map(c => c.toLowerCase()).join(', ') }
      };
    }
    if (rule.name && !rule.name.toLowerCase().includes('happy hour')) {
      return {
        key: 'PRICING.TARGET_NAMED',
        params: { name: rule.name }
      };
    }
    return { key: 'PRICING.TARGET_ALL' };
  }

  /**
   * Recalculates the active countdown and upcoming teaser state signals based on the current time,
   * detecting state transitions and broadcasting notification events.
   *
   * @param referenceDate Optional reference timestamp for testing
   */
  updateCountdownAndTeaser(referenceDate: Date = new Date()): void {
    const activeRules = this.rulesSignal().filter(r => r.active && this.isRuleApplicableNow(r, referenceDate));

    if (activeRules.length > 0) {
      // Urgent-first: select rule expiring soonest
      let soonestRule = activeRules[0];
      let minRemainingSeconds = this.getSecondsUntilEnd(soonestRule, referenceDate);

      for (let i = 1; i < activeRules.length; i++) {
        const remaining = this.getSecondsUntilEnd(activeRules[i], referenceDate);
        if (remaining < minRemainingSeconds) {
          minRemainingSeconds = remaining;
          soonestRule = activeRules[i];
        }
      }

      const scope = this.getRuleScope(soonestRule);
      this.activeCountdownSignal.set({
        rule: soonestRule,
        remainingSeconds: minRemainingSeconds,
        formattedTime: this.formatDuration(minRemainingSeconds),
        scopeDescriptionKey: scope.key,
        scopeDescriptionParams: scope.params
      });
      this.upcomingTeaserSignal.set(null);

      if (this.wasActiveLastTick === false) {
        this.stateTransition$.next({ type: 'STARTED', rule: soonestRule });
      }
      this.wasActiveLastTick = true;
    } else {
      this.activeCountdownSignal.set(null);

      if (this.wasActiveLastTick === true) {
        this.stateTransition$.next({ type: 'ENDED' });
      }
      this.wasActiveLastTick = false;

      // Look for upcoming rules starting within 60 minutes
      const upcomingCandidates = this.rulesSignal()
        .filter(r => r.active && !this.isRuleApplicableNow(r, referenceDate))
        .map(rule => ({ rule, secondsUntilStart: this.getSecondsUntilStart(rule, referenceDate) }))
        .filter((entry): entry is { rule: HappyHourRule; secondsUntilStart: number } => entry.secondsUntilStart != null);

      if (upcomingCandidates.length > 0) {
        upcomingCandidates.sort((a, b) => a.secondsUntilStart - b.secondsUntilStart);
        const earliest = upcomingCandidates[0];
        const minutesUntilStart = Math.ceil(earliest.secondsUntilStart / 60);
        const scope = this.getRuleScope(earliest.rule);

        this.upcomingTeaserSignal.set({
          rule: earliest.rule,
          minutesUntilStart,
          scopeDescriptionKey: scope.key,
          scopeDescriptionParams: scope.params
        });
      } else {
        this.upcomingTeaserSignal.set(null);
      }
    }
  }

  private getDayOfWeek(date: Date): DayOfWeek {
    const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }

  private formatTimeString(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}
