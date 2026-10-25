/**
 * Identifier for synthesized audio sound packs available in OpenBar.
 */
export type SoundPackId = 'SUBTLE_BELL' | 'SHAKER_CHIME' | 'RETRO_DING' | 'HIGH_URGENCY';

/**
 * Supported real-time audio trigger event categories.
 */
export type AudioTriggerType = 'NEW_ORDER' | 'TABLE_CALL' | 'URGENT_ORDER';

/**
 * Repetition interval for tickets remaining in urgent delay (> 10 min without preparation).
 */
export type UrgentRepeatInterval = 'ONCE' | 'EVERY_1_MIN' | 'EVERY_2_MIN';

/**
 * Persistent audio preferences configuration per client terminal.
 */
export interface AudioPreferences {
  /** Master toggle enabling or disabling all audio synthesis. */
  enabled: boolean;
  /** Master volume level (integer from 0 to 100). */
  volume: number;
  /** Primary sound pack theme used as the default for all alerts. */
  soundPack: SoundPackId;
  /** Whether new incoming orders trigger an audible alert. */
  triggerNewOrder: boolean;
  /** Whether table calls and bill requests trigger an audible alert. */
  triggerTableCall: boolean;
  /** Whether tickets waiting > 10 min without preparation trigger an alert. */
  triggerUrgentOrder: boolean;
  /** Optional sound pack override for new incoming orders (null uses default soundPack). */
  soundOverrideNewOrder: SoundPackId | null;
  /** Optional sound pack override for table calls (null uses default soundPack). */
  soundOverrideTableCall: SoundPackId | null;
  /** Optional sound pack override for urgent wait orders (null uses default soundPack). */
  soundOverrideUrgentOrder: SoundPackId | null;
  /** Repetition frequency for unresolved urgent orders. */
  urgentRepeatInterval: UrgentRepeatInterval;
}

/**
 * Default audio configuration for newly initialised terminals.
 */
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  enabled: true,
  volume: 80,
  soundPack: 'SUBTLE_BELL',
  triggerNewOrder: true,
  triggerTableCall: true,
  triggerUrgentOrder: true,
  soundOverrideNewOrder: null,
  soundOverrideTableCall: null,
  soundOverrideUrgentOrder: null,
  urgentRepeatInterval: 'EVERY_1_MIN',
};
