import { Injectable, signal } from '@angular/core';
import {
  AudioPreferences,
  DEFAULT_AUDIO_PREFERENCES,
  SoundPackId,
  AudioTriggerType,
  UrgentRepeatInterval
} from '../models/sound-alert.model';

/**
 * Service centralising user notification and UI preference persistence.
 *
 * <p>All preferences are stored in {@code localStorage} so they survive
 * page reloads without requiring a server round-trip. The service exposes
 * writable Angular signals so consumers can react to preference changes
 * in a fine-grained, push-based manner.</p>
 *
 * <p>Keys managed by this service:</p>
 * <ul>
 *   <li>{@code openbar_sound_enabled} – whether audio alerts are active</li>
 *   <li>{@code openbar_visual_notif_enabled} – whether toast notifications are shown</li>
 *   <li>{@code openbar_audio_preferences} – full audio configuration (volume, sound pack, triggers)</li>
 * </ul>
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {

  private static readonly SOUND_KEY = 'openbar_sound_enabled';
  private static readonly VISUAL_KEY = 'openbar_visual_notif_enabled';
  private static readonly AUDIO_PREFS_KEY = 'openbar_audio_preferences';

  /**
   * Angular signal tracking whether sound notifications are enabled.
   * Initialised from {@code localStorage} on construction.
   */
  readonly soundEnabled = signal<boolean>(this.loadBoolean(PreferencesService.SOUND_KEY, true));

  /**
   * Angular signal tracking whether visual (toast) notifications are enabled.
   * Initialised from {@code localStorage} on construction.
   */
  readonly visualNotifEnabled = signal<boolean>(this.loadBoolean(PreferencesService.VISUAL_KEY, true));

  /**
   * Angular signal tracking full audio preferences (volume, sound pack, triggers, repeat interval).
   * Initialised from {@code localStorage} on construction with {@link DEFAULT_AUDIO_PREFERENCES} fallback.
   */
  readonly audioPreferences = signal<AudioPreferences>(this.loadAudioPreferences());

  /**
   * Enables or disables sound notifications and persists the choice to {@code localStorage}.
   * Synchronises both the legacy boolean and the unified audio preferences.
   *
   * @param enabled Whether sound alerts should be active.
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled.set(enabled);
    localStorage.setItem(PreferencesService.SOUND_KEY, String(enabled));
    this.updateAudioPreferences({ enabled });
  }

  /**
   * Enables or disables visual (toast) notifications and persists the choice to {@code localStorage}.
   *
   * @param enabled Whether toast notifications should be displayed.
   */
  setVisualNotifEnabled(enabled: boolean): void {
    this.visualNotifEnabled.set(enabled);
    localStorage.setItem(PreferencesService.VISUAL_KEY, String(enabled));
  }

  /**
   * Updates partial audio preferences and persists them to {@code localStorage}.
   *
   * @param partial Subset of {@link AudioPreferences} to update.
   */
  updateAudioPreferences(partial: Partial<AudioPreferences>): void {
    const updated: AudioPreferences = {
      ...this.audioPreferences(),
      ...partial,
    };
    this.audioPreferences.set(updated);
    if (partial.enabled !== undefined && partial.enabled !== this.soundEnabled()) {
      this.soundEnabled.set(partial.enabled);
      localStorage.setItem(PreferencesService.SOUND_KEY, String(partial.enabled));
    }
    try {
      localStorage.setItem(PreferencesService.AUDIO_PREFS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore quota/private mode errors safely
    }
  }

  /**
   * Sets the master volume level (0 to 100) and persists.
   *
   * @param volume Integer volume level between 0 and 100.
   */
  setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    this.updateAudioPreferences({ volume: clamped });
  }

  /**
   * Sets the default sound pack theme and persists.
   *
   * @param soundPack The chosen {@link SoundPackId}.
   */
  setSoundPack(soundPack: SoundPackId): void {
    this.updateAudioPreferences({ soundPack });
  }

  /**
   * Sets whether a specific trigger is audibly active.
   *
   * @param trigger Trigger type to update.
   * @param enabled Active flag.
   */
  setTriggerEnabled(trigger: AudioTriggerType, enabled: boolean): void {
    switch (trigger) {
      case 'NEW_ORDER':
        this.updateAudioPreferences({ triggerNewOrder: enabled });
        break;
      case 'TABLE_CALL':
        this.updateAudioPreferences({ triggerTableCall: enabled });
        break;
      case 'URGENT_ORDER':
        this.updateAudioPreferences({ triggerUrgentOrder: enabled });
        break;
    }
  }

  /**
   * Sets a specific sound pack override for an individual trigger event.
   *
   * @param trigger Trigger type to configure.
   * @param soundPack Sound pack identifier or null to reset to default.
   */
  setSoundOverride(trigger: AudioTriggerType, soundPack: SoundPackId | null): void {
    switch (trigger) {
      case 'NEW_ORDER':
        this.updateAudioPreferences({ soundOverrideNewOrder: soundPack });
        break;
      case 'TABLE_CALL':
        this.updateAudioPreferences({ soundOverrideTableCall: soundPack });
        break;
      case 'URGENT_ORDER':
        this.updateAudioPreferences({ soundOverrideUrgentOrder: soundPack });
        break;
    }
  }

  /**
   * Configures the repeat interval for overdue urgent orders.
   *
   * @param urgentRepeatInterval Repetition frequency.
   */
  setUrgentRepeatInterval(urgentRepeatInterval: UrgentRepeatInterval): void {
    this.updateAudioPreferences({ urgentRepeatInterval });
  }

  /**
   * Reads a boolean flag from {@code localStorage}.
   *
   * @param key The localStorage key to read.
   * @param defaultValue The fallback value when the key is absent.
   * @returns The stored boolean, or {@code defaultValue} if the key does not exist.
   */
  private loadBoolean(key: string, defaultValue: boolean): boolean {
    const stored = localStorage.getItem(key);
    return stored !== null ? stored === 'true' : defaultValue;
  }

  /**
   * Loads persisted audio preferences from {@code localStorage}.
   * Merges with {@link DEFAULT_AUDIO_PREFERENCES} to ensure forward compatibility.
   *
   * @returns Complete {@link AudioPreferences} object.
   */
  private loadAudioPreferences(): AudioPreferences {
    try {
      const stored = localStorage.getItem(PreferencesService.AUDIO_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_AUDIO_PREFERENCES,
          ...parsed,
          enabled: this.loadBoolean(PreferencesService.SOUND_KEY, DEFAULT_AUDIO_PREFERENCES.enabled),
        };
      }
    } catch {
      // Fallback on parse failure
    }
    return {
      ...DEFAULT_AUDIO_PREFERENCES,
      enabled: this.loadBoolean(PreferencesService.SOUND_KEY, DEFAULT_AUDIO_PREFERENCES.enabled),
    };
  }
}
