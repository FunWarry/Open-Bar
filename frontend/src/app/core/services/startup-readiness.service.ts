import { inject, Injectable, signal, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subscription, timer } from 'rxjs';
import { catchError, map, switchMap, takeWhile } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Service managing startup health and initial backend readiness detection.
 * <p>
 * Ensures an animated waiting screen is presented during cold application boots
 * (e.g. Raspberry Pi startup or database initialization). Once the backend has
 * successfully responded for the first time, the startup waiting screen is permanently
 * deactivated for the session and will NEVER reactivate if the backend experiences
 * subsequent runtime crashes.
 */
@Injectable({ providedIn: 'root' })
export class StartupReadinessService {
  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);

  private readonly probeUrl = `${environment.apiUrl}/setup/status`;
  private readonly probeHeaders = new HttpHeaders({ 'X-Silent-Probe': 'true' });

  private readonly isStartingUpSignal = signal<boolean>(false);
  private readonly elapsedSecondsSignal = signal<number>(0);
  private readonly attemptsSignal = signal<number>(0);
  private readonly isCheckingSignal = signal<boolean>(false);

  /** Whether the application is currently in its initial cold boot waiting phase. */
  readonly isStartingUp = this.isStartingUpSignal.asReadonly();

  /** Elapsed waiting time in seconds since initial startup probe failed. */
  readonly elapsedSeconds = this.elapsedSecondsSignal.asReadonly();

  /** Total number of connectivity probe attempts executed. */
  readonly attempts = this.attemptsSignal.asReadonly();

  /** Whether an active probe HTTP request is currently in-flight. */
  readonly isChecking = this.isCheckingSignal.asReadonly();

  /**
   * Tracks whether the backend has successfully responded at least once during this application session.
   * Once true, the startup waiting screen will never re-engage on subsequent failures.
   */
  private hasEverBeenReady = false;

  private pollSubscription: Subscription | null = null;
  private timerSubscription: Subscription | null = null;

  /**
   * Initiates the initial startup readiness check.
   * <p>
   * If the backend is already online, resolves silently without activating the waiting screen.
   * If the backend is offline or starting up, activates the startup screen and polls until healthy.
   *
   * @returns Observable emitting true once backend is confirmed ready
   */
  initStartupCheck(): Observable<boolean> {
    if (this.hasEverBeenReady) {
      this.isStartingUpSignal.set(false);
      return of(true);
    }

    this.isCheckingSignal.set(true);

    return this.http.get(this.probeUrl, { headers: this.probeHeaders }).pipe(
      map(() => {
        this.markBackendReady();
        return true;
      }),
      catchError(() => {
        // Backend not ready yet on cold boot: engage startup polling screen
        if (!this.hasEverBeenReady) {
          this.isStartingUpSignal.set(true);
          this.startStartupPolling();
        }
        return of(false);
      })
    );
  }

  /**
   * Triggers an immediate manual probe retry.
   */
  retryNow(): void {
    if (this.hasEverBeenReady) return;
    this.probeBackend();
  }

  /**
   * Indicates whether the backend has ever been operational during this session.
   *
   * @returns true if backend has responded successfully at least once
   */
  isBackendReady(): boolean {
    return this.hasEverBeenReady;
  }

  /**
   * Starts periodic polling and elapsed time incrementing.
   */
  private startStartupPolling(): void {
    if (this.pollSubscription) return;

    this.attemptsSignal.set(1);
    this.elapsedSecondsSignal.set(0);

    // Elapsed seconds increment timer
    this.ngZone.runOutsideAngular(() => {
      this.timerSubscription = timer(1000, 1000)
        .pipe(takeWhile(() => !this.hasEverBeenReady))
        .subscribe(() => {
          this.ngZone.run(() => {
            this.elapsedSecondsSignal.update(s => s + 1);
          });
        });

      // Periodic probe polling every 1.5s
      this.pollSubscription = timer(1500, 1500)
        .pipe(
          takeWhile(() => !this.hasEverBeenReady),
          switchMap(() => {
            this.ngZone.run(() => {
              this.attemptsSignal.update(a => a + 1);
              this.isCheckingSignal.set(true);
            });
            return this.http.get(this.probeUrl, { headers: this.probeHeaders }).pipe(
              catchError(() => of(null))
            );
          })
        )
        .subscribe((res) => {
          this.ngZone.run(() => {
            this.isCheckingSignal.set(false);
            if (res !== null) {
              this.markBackendReady();
            }
          });
        });
    });
  }

  /**
   * Executes a single probe request.
   */
  private probeBackend(): void {
    this.isCheckingSignal.set(true);
    this.attemptsSignal.update(a => a + 1);

    this.http.get(this.probeUrl, { headers: this.probeHeaders }).subscribe({
      next: () => {
        this.isCheckingSignal.set(false);
        this.markBackendReady();
      },
      error: () => {
        this.isCheckingSignal.set(false);
      }
    });
  }

  /**
   * Marks the backend as permanently ready for the duration of this browser session
   * and terminates active polling timers.
   */
  private markBackendReady(): void {
    this.hasEverBeenReady = true;
    this.isStartingUpSignal.set(false);
    this.isCheckingSignal.set(false);

    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = null;
    }

    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }
}
