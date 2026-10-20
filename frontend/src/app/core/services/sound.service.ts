import { Injectable, OnDestroy, signal } from '@angular/core';
import { PreferencesService } from './preferences.service';
import {
  AudioPreferences,
  AudioTriggerType,
  SoundPackId,
  UrgentRepeatInterval
} from '../models/sound-alert.model';

/**
 * Service managing Web Audio API sound synthesis, custom sound profiles,
 * volume levels, and audio triggers across bartender and waitstaff interfaces.
 *
 * <p>Generates high-fidelity acoustic sound cues (Subtle Bell, Cocktail Shaker Chime,
 * Retro Ding, High-Urgency Tone) entirely in-browser without external media files.
 * Provides user-gesture context auto-unlocking, master gain scaling, fine-grained
 * trigger routing, and overdue order urgency repeats.</p>
 */
@Injectable({ providedIn: 'root' })
export class SoundService implements OnDestroy {

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  /** Set of pending order IDs currently in overdue urgent status. */
  private readonly urgentOrderIds = new Set<string | number>();

  /** Interval timer handle for recurring urgent order reminders. */
  private urgentTimerId: ReturnType<typeof setInterval> | null = null;

  /** Unregister callback for global window unlock listeners. */
  private removeUnlockListeners: (() => void) | null = null;

  /** Reactive signal indicating whether Web Audio context is fully resumed. */
  readonly isAudioUnlocked = signal<boolean>(false);

  constructor(private readonly prefs: PreferencesService) {
    this.setupAutoUnlock();
  }

  ngOnDestroy(): void {
    if (this.removeUnlockListeners) {
      this.removeUnlockListeners();
      this.removeUnlockListeners = null;
    }
    this.stopUrgentTimer();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  /**
   * Checks if audio alerts are currently enabled.
   *
   * @returns True if sound is enabled, false if muted.
   */
  isSoundEnabled(): boolean {
    return this.prefs.soundEnabled();
  }

  /**
   * Updates global sound enablement state.
   *
   * @param enabled Whether audio alerts should be enabled.
   */
  setSoundEnabled(enabled: boolean): void {
    this.prefs.setSoundEnabled(enabled);
  }

  /**
   * Toggles the current master audio mute state.
   *
   * @returns The newly updated sound state.
   */
  toggleSound(): boolean {
    const next = !this.isSoundEnabled();
    this.setSoundEnabled(next);
    return next;
  }

  /**
   * Returns the current reactive audio preferences.
   *
   * @returns Current {@link AudioPreferences} snapshot.
   */
  getPreferences(): AudioPreferences {
    return this.prefs.audioPreferences();
  }

  /**
   * Updates audio preferences partially.
   *
   * @param partial Subset of preferences to update.
   */
  updatePreferences(partial: Partial<AudioPreferences>): void {
    this.prefs.updateAudioPreferences(partial);
    if (partial.volume !== undefined && this.masterGain && this.audioCtx) {
      const vol = Math.max(0, Math.min(1, partial.volume / 100));
      this.masterGain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    }
  }

  /**
   * Plays a synthesized alert for new incoming drink orders.
   * Respects user enablement, volume, and sound profile configuration.
   *
   * @param profileOverride Optional specific sound profile to use instead of preference.
   */
  playNewOrderSound(profileOverride?: SoundPackId): void {
    const prefs = this.prefs.audioPreferences();
    if (!prefs.enabled || !prefs.triggerNewOrder) return;
    const pack = profileOverride ?? prefs.soundOverrideNewOrder ?? prefs.soundPack;
    this.dispatchSoundPack(pack, 'NEW_ORDER');
  }

  /**
   * Plays a synthesized chime for orders marked ready (Server pickup alert).
   *
   * @param profileOverride Optional sound pack override.
   */
  playOrderReadySound(profileOverride?: SoundPackId): void {
    const prefs = this.prefs.audioPreferences();
    if (!prefs.enabled) return;
    const pack = profileOverride ?? prefs.soundPack;
    this.dispatchSoundPack(pack, 'NEW_ORDER');
  }

  /**
   * Plays a synthesized alert for table assistance or bill requests (Server dashboard).
   *
   * @param profileOverride Optional sound pack override.
   */
  playTableCallSound(profileOverride?: SoundPackId): void {
    const prefs = this.prefs.audioPreferences();
    if (!prefs.enabled || !prefs.triggerTableCall) return;
    const pack = profileOverride ?? prefs.soundOverrideTableCall ?? prefs.soundPack;
    this.dispatchSoundPack(pack, 'TABLE_CALL');
  }

  /**
   * Plays a synthesized high-priority alert for tickets in critical delay (> 10 min).
   *
   * @param profileOverride Optional sound pack override.
   */
  playUrgentAlertSound(profileOverride?: SoundPackId): void {
    const prefs = this.prefs.audioPreferences();
    if (!prefs.enabled || !prefs.triggerUrgentOrder) return;
    const pack = profileOverride ?? prefs.soundOverrideUrgentOrder ?? 'HIGH_URGENCY';
    this.dispatchSoundPack(pack, 'URGENT_ORDER');
  }

  /**
   * Tests and previews a specific sound pack profile regardless of mute state.
   *
   * @param pack The sound pack profile to audition.
   * @param event The simulated event trigger context.
   */
  testSound(pack: SoundPackId, event: AudioTriggerType = 'NEW_ORDER'): void {
    this.dispatchSoundPack(pack, event, true);
  }

  /**
   * Registers an order as urgently delayed (> 10 min without preparation).
   * Triggers the alert and schedules repeating alerts according to the configured interval.
   *
   * @param orderId Unique identifier of the overdue order.
   */
  triggerUrgentOrderAlert(orderId: string | number): void {
    const isNew = !this.urgentOrderIds.has(orderId);
    this.urgentOrderIds.add(orderId);

    if (isNew) {
      this.playUrgentAlertSound();
    }

    const interval = this.prefs.audioPreferences().urgentRepeatInterval;
    if (interval !== 'ONCE') {
      this.ensureUrgentTimer(interval);
    }
  }

  /**
   * Clears an order from the urgent list once preparation begins or order is completed.
   * Automatically terminates the repeating timer when no urgent orders remain.
   *
   * @param orderId Identifier of the order.
   */
  clearUrgentOrder(orderId: string | number): void {
    this.urgentOrderIds.delete(orderId);
    if (this.urgentOrderIds.size === 0) {
      this.stopUrgentTimer();
    }
  }

  /**
   * Clears all active urgent order alerts.
   */
  clearAllUrgentOrders(): void {
    this.urgentOrderIds.clear();
    this.stopUrgentTimer();
  }

  /**
   * Attempts to resume the Web Audio API AudioContext if suspended.
   *
   * @returns Promise resolving to true if context is active, false otherwise.
   */
  async resumeAudioContext(): Promise<boolean> {
    try {
      const ctx = this.getOrCreateAudioContext();
      if (!ctx) return false;
      if (ctx.state === 'suspended') {
        const timeoutPromise = new Promise<void>(resolve => setTimeout(resolve, 300));
        await Promise.race([ctx.resume(), timeoutPromise]);
      }
      const unlocked = ctx.state === 'running';
      this.isAudioUnlocked.set(unlocked);
      return unlocked;
    } catch {
      return false;
    }
  }

  /**
   * Dispatches audio generation based on the chosen sound pack.
   */
  private dispatchSoundPack(pack: SoundPackId, event: AudioTriggerType, force = false): void {
    const prefs = this.prefs.audioPreferences();
    if (!force && !prefs.enabled) return;

    try {
      const ctx = this.getOrCreateAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        void ctx.resume().then(() => {
          this.isAudioUnlocked.set(ctx.state === 'running');
        });
      }

      const master = this.getMasterGainNode(ctx, force ? prefs.volume : prefs.volume);

      switch (pack) {
        case 'SUBTLE_BELL':
          this.synthesizeSubtleBell(ctx, master, event);
          break;
        case 'SHAKER_CHIME':
          this.synthesizeShakerChime(ctx, master, event);
          break;
        case 'RETRO_DING':
          this.synthesizeRetroDing(ctx, master, event);
          break;
        case 'HIGH_URGENCY':
          this.synthesizeHighUrgencyTone(ctx, master, event);
          break;
        default:
          this.synthesizeSubtleBell(ctx, master, event);
          break;
      }
    } catch {
      // Audio playback errors safely handled in non-supported browser contexts
    }
  }

  /**
   * Synthesizes the 'Subtle Bell' profile:
   * Warm harmonic acoustic chime using fundamental + partials with exponential decays.
   */
  private synthesizeSubtleBell(ctx: AudioContext, destination: GainNode, event: AudioTriggerType): void {
    const t0 = ctx.currentTime;
    const baseFreq = event === 'URGENT_ORDER' ? 740.0 : event === 'TABLE_CALL' ? 659.25 : 587.33;
    const partials = [
      { ratio: 1.0, gain: 0.45, decay: 0.7 },
      { ratio: 1.5, gain: 0.25, decay: 0.5 },
      { ratio: 2.0, gain: 0.18, decay: 0.4 },
      { ratio: 3.0, gain: 0.08, decay: 0.3 },
    ];

    partials.forEach(p => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * p.ratio, t0);

      gain.gain.setValueAtTime(p.gain, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + p.decay);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(t0);
      osc.stop(t0 + p.decay);
    });

    // Secondary harmonic ping for Table Call / Urgent to add richness
    if (event === 'TABLE_CALL' || event === 'URGENT_ORDER') {
      const t1 = t0 + 0.15;
      const secondFreq = event === 'URGENT_ORDER' ? 880.0 : 783.99;
      partials.forEach(p => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(secondFreq * p.ratio, t1);

        gain.gain.setValueAtTime(p.gain * 0.9, t1);
        gain.gain.exponentialRampToValueAtTime(0.0001, t1 + p.decay);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(t1);
        osc.stop(t1 + p.decay);
      });
    }
  }

  /**
   * Synthesizes the 'Cocktail Shaker Chime' profile:
   * Authentic mechanical shaker rhythm (bandpassed noise bursts) followed by an ice clink.
   */
  private synthesizeShakerChime(ctx: AudioContext, destination: GainNode, event: AudioTriggerType): void {
    const t0 = ctx.currentTime;
    const noise = this.getOrCreateNoiseBuffer(ctx);

    // 3 quick percussive shaker bursts (shake-shake-shake)
    const shakeTimes = [0, 0.09, 0.18];
    shakeTimes.forEach(dt => {
      const startTime = t0 + dt;
      const source = ctx.createBufferSource();
      source.buffer = noise;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, startTime);
      filter.Q.setValueAtTime(3.5, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.07);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      source.start(startTime);
      source.stop(startTime + 0.08);
    });

    // Ringing ice clink at the end of the shake
    const clinkTime = t0 + 0.26;
    const clinkFreq = event === 'URGENT_ORDER' ? 1480 : event === 'TABLE_CALL' ? 1318.5 : 1046.5;
    [clinkFreq, clinkFreq * 1.33].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, clinkTime);

      gain.gain.setValueAtTime(0.2, clinkTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, clinkTime + 0.45);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(clinkTime);
      osc.stop(clinkTime + 0.45);
    });
  }

  /**
   * Synthesizes the 'Retro Ding' profile:
   * Playful arpeggiated 8-bit arcade chime (C5 -> E5 -> G5 -> C6).
   */
  private synthesizeRetroDing(ctx: AudioContext, destination: GainNode, event: AudioTriggerType): void {
    const t0 = ctx.currentTime;
    let notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    if (event === 'URGENT_ORDER') {
      notes = [783.99, 880.0, 987.77, 1174.66]; // G5, A5, B5, D6
    } else if (event === 'TABLE_CALL') {
      notes = [659.25, 783.99, 880.0, 1046.5]; // E5, G5, A5, C6
    }

    const noteDuration = 0.07;
    notes.forEach((freq, idx) => {
      const start = t0 + idx * noteDuration;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      const isLast = idx === notes.length - 1;
      const decay = isLast ? 0.35 : 0.06;

      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(start);
      osc.stop(start + decay);
    });
  }

  /**
   * Synthesizes the 'High-Urgency Tone' profile:
   * Piercing attention-grabbing burst cutting through nightlife music.
   */
  private synthesizeHighUrgencyTone(ctx: AudioContext, destination: GainNode, _event: AudioTriggerType): void {
    const t0 = ctx.currentTime;
    const pulses = [
      { delay: 0, duration: 0.1 },
      { delay: 0.14, duration: 0.1 },
      { delay: 0.28, duration: 0.18 },
    ];

    pulses.forEach(p => {
      const start = t0 + p.delay;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880.0, start);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760.0, start);

      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + p.duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(destination);

      osc1.start(start);
      osc1.stop(start + p.duration);
      osc2.start(start);
      osc2.stop(start + p.duration);
    });
  }

  /**
   * Lazily initializes and returns the Web Audio API context.
   */
  private getOrCreateAudioContext(): AudioContext | null {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      return this.audioCtx;
    }
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      this.audioCtx = new AudioContextClass();
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Returns the master gain node configured for the current volume level.
   */
  private getMasterGainNode(ctx: AudioContext, volumePercent: number): GainNode {
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }
    const vol = Math.max(0, Math.min(1, volumePercent / 100));
    this.masterGain.gain.setValueAtTime(vol, ctx.currentTime);
    return this.masterGain;
  }

  /**
   * Generates a 0.2-second mono white noise buffer for percussion synthesis.
   */
  private getOrCreateNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = Math.floor(ctx.sampleRate * 0.2);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Sets up one-time user interaction listeners on the window to unlock AudioContext.
   */
  private setupAutoUnlock(): void {
    if (typeof window === 'undefined') return;

    const onUserInteraction = (): void => {
      void this.resumeAudioContext().then(unlocked => {
        if (unlocked && this.removeUnlockListeners) {
          this.removeUnlockListeners();
          this.removeUnlockListeners = null;
        }
      });
    };

    window.addEventListener('pointerdown', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });

    this.removeUnlockListeners = (): void => {
      window.removeEventListener('pointerdown', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
    };
  }

  /**
   * Ensures an active timer for urgent order auto-repeats.
   */
  private ensureUrgentTimer(interval: UrgentRepeatInterval): void {
    this.stopUrgentTimer();
    const intervalMs = interval === 'EVERY_2_MIN' ? 120_000 : 60_000;
    this.urgentTimerId = setInterval(() => {
      if (this.urgentOrderIds.size > 0) {
        this.playUrgentAlertSound();
      } else {
        this.stopUrgentTimer();
      }
    }, intervalMs);
  }

  /**
   * Stops the urgent repeat timer.
   */
  private stopUrgentTimer(): void {
    if (this.urgentTimerId !== null) {
      clearInterval(this.urgentTimerId);
      this.urgentTimerId = null;
    }
  }
}

/**
 * Architectural alias conforming to ticket naming conventions.
 */
export { SoundService as SoundAlertService };
