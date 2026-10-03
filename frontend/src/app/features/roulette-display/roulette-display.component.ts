import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  trophyOutline,
  wineOutline,
  tvOutline,
  volumeHighOutline,
  volumeMuteOutline,
  flameOutline,
  settingsOutline,
  closeOutline,
  musicalNotesOutline,
  checkmarkOutline,
  globeOutline,
  lockClosedOutline,
  lockOpenOutline,
  keypadOutline,
  backspaceOutline,
  refreshOutline
} from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppCurrencyPipe } from '../../core/pipes/app-currency.pipe';
import { RouletteWheelComponent } from '../../core/components/ui/roulette-wheel/roulette-wheel.component';
import { RouletteService } from '../../core/services/roulette.service';
import { RouletteAudioService, RouletteSoundProfile } from '../../core/services/roulette-audio.service';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';
import {
  RouletteEvent,
  RoulettePublicConfig,
  RouletteSpinResult,
  RouletteWheelSector
} from '../../core/models/roulette.model';

interface RecentWinner {
  tableNumero: number;
  cocktailNom: string;
  prix: number;
  timeAgo: string;
}

/**
 * Dedicated display screen component for secondary TV monitors and bar tablet displays.
 * Protected by a 4-digit staff PIN code with instant real-time STOMP revocation.
 * Operates autonomously in real time over STOMP WebSocket topics (`/topic/roulette/events`),
 * animating live spins and showing celebratory full-screen winning announcements.
 * Settings and sound controls are cleanly tucked away inside a dedicated modal.
 */
@Component({
  selector: 'app-roulette-display',
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    TranslocoModule,
    AppCurrencyPipe,
    RouletteWheelComponent
  ],
  templateUrl: './roulette-display.component.html',
  styleUrl: './roulette-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouletteDisplayComponent implements OnInit, OnDestroy {
  @ViewChild('wheel') wheel?: RouletteWheelComponent;

  private readonly rouletteService = inject(RouletteService);
  private readonly audioService = inject(RouletteAudioService);
  public readonly languageService = inject(LanguageService);
  private readonly authService = inject(AuthService);
  private readonly wsService = inject(WebSocketService, { optional: true });
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  // PIN Unlock State
  isUnlocked = signal(false);
  pinInput = signal('');
  isPinChecking = signal(false);
  pinErrorMessage = signal<string | null>(null);

  isLoading = true;
  config: RoulettePublicConfig | null = null;
  sectors: RouletteWheelSector[] = [];

  isSpinning = false;
  currentEvent: RouletteEvent | null = null;
  winningResult = signal<RouletteSpinResult | null>(null);
  celebrationActive = signal(false);

  // Settings Modal State
  isSettingsModalOpen = signal(false);
  isMuted = signal(false);
  soundProfile = signal<RouletteSoundProfile>('CSGO');

  recentWinners = signal<RecentWinner[]>([
    { tableNumero: 4, cocktailNom: 'Mojito Passion', prix: 7.50, timeAgo: '2m' },
    { tableNumero: 2, cocktailNom: 'Création Barman', prix: 7.50, timeAgo: '8m' },
    { tableNumero: 6, cocktailNom: 'Tournée de Shooters', prix: 0, timeAgo: '15m' }
  ]);

  private celebrationTimeout: any = null;

  constructor() {
    addIcons({
      sparklesOutline,
      trophyOutline,
      wineOutline,
      tvOutline,
      volumeHighOutline,
      volumeMuteOutline,
      flameOutline,
      settingsOutline,
      closeOutline,
      musicalNotesOutline,
      checkmarkOutline,
      globeOutline,
      lockClosedOutline,
      lockOpenOutline,
      keypadOutline,
      backspaceOutline,
      refreshOutline
    });
    this.isMuted.set(this.audioService.getMuted());
    this.soundProfile.set(this.audioService.getSoundProfile());
  }

  ngOnInit(): void {
    const isAlreadyUnlocked = typeof window !== 'undefined' && sessionStorage.getItem('openbar_roulette_display_unlocked') === 'true';
    const savedPin = typeof window !== 'undefined' ? sessionStorage.getItem('openbar_roulette_display_pin') : null;

    if (isAlreadyUnlocked && savedPin) {
      // Validate saved PIN with backend to detect if PIN was regenerated while screen was closed
      this.rouletteService.verifyDisplayPin(savedPin)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.valid) {
              this.isUnlocked.set(true);
              this.loadInitialConfig();
            } else {
              this.lockScreen('ROULETTE.PIN_REVOKED_NOTICE');
            }
          },
          error: () => {
            this.isUnlocked.set(true);
            this.loadInitialConfig();
          }
        });
    } else {
      this.lockScreen();
    }

    this.subscribeToLiveEvents();
    this.startPeriodicPinVerification();
  }

  ngOnDestroy(): void {
    if (this.celebrationTimeout) {
      clearTimeout(this.celebrationTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPinDigit(digit: string): void {
    if (this.pinInput().length >= 4 || this.isPinChecking()) return;
    this.pinErrorMessage.set(null);
    const updated = this.pinInput() + digit;
    this.pinInput.set(updated);
    if (updated.length === 4) {
      this.submitPin(updated);
    }
  }

  onPinBackspace(): void {
    if (this.isPinChecking()) return;
    this.pinErrorMessage.set(null);
    this.pinInput.update(p => p.slice(0, -1));
  }

  onPinClear(): void {
    if (this.isPinChecking()) return;
    this.pinErrorMessage.set(null);
    this.pinInput.set('');
  }

  submitPin(pin?: string): void {
    const toCheck = pin || this.pinInput();
    if (toCheck.length !== 4 || this.isPinChecking()) return;

    this.isPinChecking.set(true);
    this.cdr.markForCheck();

    this.rouletteService.verifyDisplayPin(toCheck).subscribe({
      next: (res) => {
        this.isPinChecking.set(false);
        if (res.valid) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('openbar_roulette_display_unlocked', 'true');
            sessionStorage.setItem('openbar_roulette_display_pin', toCheck);
          }
          this.isUnlocked.set(true);
          this.pinInput.set('');
          this.pinErrorMessage.set(null);
          this.loadInitialConfig();
        } else {
          this.pinErrorMessage.set('ROULETTE.PIN_INVALID');
          this.pinInput.set('');
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.isPinChecking.set(false);
        this.pinErrorMessage.set('ROULETTE.PIN_ERROR');
        this.pinInput.set('');
        this.cdr.markForCheck();
      }
    });
  }

  lockScreen(reasonKey?: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('openbar_roulette_display_unlocked');
      sessionStorage.removeItem('openbar_roulette_display_pin');
    }
    this.isUnlocked.set(false);
    this.pinInput.set('');
    this.closeSettingsModal();
    if (reasonKey) {
      this.pinErrorMessage.set(reasonKey);
    }
    this.cdr.detectChanges();
  }

  loadInitialConfig(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.rouletteService.getPublicConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cfg) => {
          this.config = cfg;
          this.sectors = cfg.sectors || [];
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private subscribeToLiveEvents(): void {
    if (this.wsService) {
      if (this.authService.getToken()) {
        this.wsService.connect();
      } else {
        const guestId = 'roulette-tv-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
        this.wsService.connectAsGuest(guestId);
      }
    }

    this.rouletteService.watchEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event: RouletteEvent) => {
          this.ngZone.run(() => this.handleIncomingEvent(event));
        },
        error: (err: unknown) => {
          // Reconnection is handled automatically by STOMP
        }
      });
  }

  private startPeriodicPinVerification(): void {
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isUnlocked()) return;
        const savedPin = typeof window !== 'undefined' ? sessionStorage.getItem('openbar_roulette_display_pin') : null;
        if (!savedPin) {
          this.lockScreen();
          return;
        }
        this.rouletteService.verifyDisplayPin(savedPin)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (!res.valid) {
                this.ngZone.run(() => this.lockScreen('ROULETTE.PIN_REVOKED_NOTICE'));
              }
            }
          });
      });
  }

  private handleIncomingEvent(event: RouletteEvent): void {
    if (event.eventType === 'PIN_REVOKED') {
      this.lockScreen('ROULETTE.PIN_REVOKED_NOTICE');
      return;
    }

    if (event.eventType === 'SECTORS_UPDATED') {
      this.loadInitialConfig();
      return;
    }

    if (event.eventType === 'SPIN_TRIGGERED' && event.spinResult) {
      this.currentEvent = event;
      this.celebrationActive.set(false);
      this.winningResult.set(null);
      this.isSpinning = true;
      this.cdr.markForCheck();

      // Launch wheel animation synchronously
      const duration = event.durationMs || 5000;
      setTimeout(() => {
        if (this.wheel && event.spinResult) {
          this.wheel.spinTo(event.spinResult.winningIndex, duration);
        }
      }, 100);
    }
  }

  onSpinCompleted(event: { sector: RouletteWheelSector; index: number }): void {
    this.isSpinning = false;
    if (this.currentEvent?.spinResult) {
      const win = this.currentEvent.spinResult;
      this.winningResult.set(win);
      this.celebrationActive.set(true);

      // Add to recent winners
      if (this.currentEvent.tableNumero) {
        const newWinner: RecentWinner = {
          tableNumero: this.currentEvent.tableNumero,
          cocktailNom: win.cocktailNom || 'Cocktail Mystère',
          prix: win.prix,
          timeAgo: '1m'
        };
        this.recentWinners.update(list => [newWinner, ...list.slice(0, 4)]);
      }

      // Play fanfare
      this.audioService.playWinFanfare();

      // Auto-dismiss celebration after 12 seconds to return to ambient idle
      if (this.celebrationTimeout) {
        clearTimeout(this.celebrationTimeout);
      }
      this.celebrationTimeout = setTimeout(() => {
        this.celebrationActive.set(false);
        this.winningResult.set(null);
        this.currentEvent = null;
        this.cdr.markForCheck();
      }, 12000);

      this.cdr.markForCheck();
    }
  }

  dismissCelebration(): void {
    if (this.celebrationTimeout) {
      clearTimeout(this.celebrationTimeout);
    }
    this.celebrationActive.set(false);
    this.winningResult.set(null);
    this.currentEvent = null;
    this.cdr.markForCheck();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeSettingsModal();
    }
  }

  openSettingsModal(): void {
    this.isSettingsModalOpen.set(true);
  }

  closeSettingsModal(): void {
    this.isSettingsModalOpen.set(false);
  }

  toggleMute(): void {
    const newMute = this.audioService.toggleMute();
    this.isMuted.set(newMute);
  }

  selectSoundProfile(profile: RouletteSoundProfile): void {
    this.audioService.setSoundProfile(profile);
    this.soundProfile.set(profile);
  }

  testFanfare(): void {
    this.audioService.playWinFanfare();
  }

  changeLanguage(lang: string): void {
    if (lang === 'fr' || lang === 'en') {
      this.languageService.setLanguage(lang);
    }
  }
}
