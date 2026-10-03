import { Injectable } from '@angular/core';

/**
 * Available audio sound profiles for the roulette wheel.
 */
export type RouletteSoundProfile = 'CSGO' | 'ARCADE';

/**
 * Service managing Web Audio API synthesis and haptic vibrations for the cocktail roulette.
 * Generates realistic mechanical ticking clicks that decelerate in sync with the spinning wheel,
 * and celebratory fanfare reveal sounds upon landing on a winning prize.
 * Completely offline and self-contained with no external media assets required.
 */
@Injectable({
  providedIn: 'root'
})
export class RouletteAudioService {
  private audioCtx: AudioContext | null = null;
  private isMuted = false;
  private soundProfile: RouletteSoundProfile = 'CSGO';

  constructor() {
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('openbar_roulette_muted');
      if (storedMute !== null) {
        this.isMuted = storedMute === 'true';
      }
      const storedProfile = localStorage.getItem('openbar_roulette_sound_profile') as RouletteSoundProfile | null;
      if (storedProfile === 'CSGO' || storedProfile === 'ARCADE') {
        this.soundProfile = storedProfile;
      }
    }
  }

  /**
   * Initializes or resumes the Web Audio context after a user interaction.
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    this.audioCtx ??= new AudioContextClass();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Plays a single tick click sound corresponding to passing a wheel sector divider.
   * Modulates frequency and envelope based on the wheel's deceleration progress.
   *
   * @param progress Progress ratio from 0.0 (start, fast) to 1.0 (near stop, slow)
   */
  playTick(progress = 0): void {
    if (this.isMuted) return;

    // Haptic vibration feedback on mobile devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignored on unsupported platforms
      }
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (this.soundProfile === 'CSGO') {
        // CS:GO Case unboxing tick: sharp mechanical click with short metallic transient
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Pitch slides slightly down as the wheel slows down
        const baseFreq = 950 - progress * 250;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
      } else {
        // Arcade synth blip
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(650 - progress * 200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.045);
      }
    } catch {
      // Audio autoplay restrictions or context error
    }
  }

  /**
   * Plays a triumphant celebratory fanfare sound when the wheel lands on the winning prize.
   */
  playWinFanfare(): void {
    if (this.isMuted) return;

    // Celebratory double-pulse haptics
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 50, 150]);
      } catch {
        // Ignored
      }
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (this.soundProfile === 'CSGO') {
        // Iconic CS:GO Rare Special Item / Gold Knife reveal resonant chime
        const frequencies = [587.33, 880.0, 1174.66, 1760.0]; // D5, A5, D6, A6 chord
        frequencies.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          const noteStart = now + idx * 0.06;
          gain.gain.setValueAtTime(0.0, noteStart);
          gain.gain.linearRampToValueAtTime(0.28, noteStart + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 1.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + 1.25);
        });
      } else {
        // Casino arcade celebration arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + index * 0.08);

          const noteStart = now + index * 0.08;
          gain.gain.setValueAtTime(0.2, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.7);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + 0.75);
        });
      }
    } catch {
      // Audio playback error
    }
  }

  /**
   * Toggles audio mute state and stores preference in localStorage.
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('openbar_roulette_muted', String(this.isMuted));
    }
    return this.isMuted;
  }

  /**
   * Gets current mute state.
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Sets current sound profile (CSGO or ARCADE).
   */
  setSoundProfile(profile: RouletteSoundProfile): void {
    this.soundProfile = profile;
    if (typeof window !== 'undefined') {
      localStorage.setItem('openbar_roulette_sound_profile', profile);
    }
  }

  /**
   * Gets current sound profile.
   */
  getSoundProfile(): RouletteSoundProfile {
    return this.soundProfile;
  }
}
