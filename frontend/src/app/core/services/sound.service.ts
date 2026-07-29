import { Injectable } from '@angular/core';

/**
 * Service managing Web Audio API sound synthesis and user audio preference persistence.
 * <p>
 * Generates real-time sound cues for new orders and order ready alerts without requiring external media assets.
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly storageKey = 'openbar_sound_enabled';
  private soundEnabled = true;
  private audioCtx: AudioContext | null = null;

  constructor() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored !== null) {
      this.soundEnabled = stored === 'true';
    }
  }

  /**
   * Checks if sound notifications are enabled.
   *
   * @returns True if sound alerts are active, false otherwise.
   */
  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Updates sound notification preference and persists to localStorage.
   *
   * @param enabled Whether sound should be enabled or disabled.
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    localStorage.setItem(this.storageKey, String(enabled));
  }

  /**
   * Toggles the current sound preference state.
   *
   * @returns The updated sound enabled state.
   */
  toggleSound(): boolean {
    this.setSoundEnabled(!this.soundEnabled);
    return this.soundEnabled;
  }

  /**
   * Plays a synthesized chime for new incoming orders (Barman alert).
   */
  playNewOrderSound(): void {
    if (!this.soundEnabled) return;
    this.playBeepSequence([
      { frequency: 587.33, duration: 0.15, delay: 0 },   // D5 note
      { frequency: 880.0, duration: 0.25, delay: 0.15 },  // A5 note
    ]);
  }

  /**
   * Plays a synthesized chime for orders marked ready (Server alert).
   */
  playOrderReadySound(): void {
    if (!this.soundEnabled) return;
    this.playBeepSequence([
      { frequency: 523.25, duration: 0.12, delay: 0 },   // C5 note
      { frequency: 659.25, duration: 0.12, delay: 0.12 }, // E5 note
      { frequency: 783.99, duration: 0.25, delay: 0.24 }, // G5 note
    ]);
  }

  /**
   * Synthesizes audio tones using Web Audio API AudioContext.
   */
  private playBeepSequence(notes: Array<{ frequency: number; duration: number; delay: number }>): void {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }

      const startTime = this.audioCtx.currentTime;
      notes.forEach(note => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.frequency, startTime + note.delay);

        gain.gain.setValueAtTime(0.15, startTime + note.delay);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.delay + note.duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime + note.delay);
        osc.stop(startTime + note.delay + note.duration);
      });
    } catch {
      // Audio playback blocked or unhandled error safely ignored
    }
  }
}
