import { Injectable, signal } from '@angular/core';

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
 * </ul>
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {

  private static readonly SOUND_KEY = 'openbar_sound_enabled';
  private static readonly VISUAL_KEY = 'openbar_visual_notif_enabled';

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
   * Enables or disables sound notifications and persists the choice to {@code localStorage}.
   *
   * @param enabled Whether sound alerts should be active.
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled.set(enabled);
    localStorage.setItem(PreferencesService.SOUND_KEY, String(enabled));
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
}
