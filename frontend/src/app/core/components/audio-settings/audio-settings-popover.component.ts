import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import {
  IonIcon,
  IonRange,
  RangeCustomEvent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  volumeHighOutline,
  volumeMuteOutline,
  volumeLowOutline,
  playOutline,
  notificationsOutline,
  timerOutline,
  handLeftOutline,
  musicalNotesOutline,
  closeOutline
} from 'ionicons/icons';

import { PreferencesService } from '../../services/preferences.service';
import { SoundService } from '../../services/sound.service';
import {
  AudioPreferences,
  AudioTriggerType,
  SoundPackId,
  UrgentRepeatInterval
} from '../../models/sound-alert.model';
import { ToggleSwitchComponent } from '../ui/toggle-switch/toggle-switch.component';
import { SearchableSelectComponent, SearchableOption } from '../ui/searchable-select/searchable-select.component';
import { ActionButtonComponent } from '../ui/action-button/action-button.component';

/**
 * Interactive audio configuration panel conforming to OpenBar Design System.
 *
 * <p>Provides quick master mute toggling, master volume adjustment, sound pack auditioning,
 * per-trigger route enable/disable, and overdue urgency repeat frequency selection.</p>
 */
@Component({
  selector: 'app-audio-settings-popover',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonIcon,
    IonRange,
    ToggleSwitchComponent,
    SearchableSelectComponent,
    ActionButtonComponent,
  ],
  templateUrl: './audio-settings-popover.component.html',
  styleUrls: ['./audio-settings-popover.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class AudioSettingsPopoverComponent {
  private readonly preferencesService = inject(PreferencesService);
  private readonly soundService = inject(SoundService);
  private readonly transloco = inject(TranslocoService);

  /** Whether the component is embedded inside an existing page/card (e.g. Profile) rather than an overlay popover. */
  @Input() embedded = false;

  /** Event emitted when the user requests closing the popover/modal. */
  @Output() closePanel = new EventEmitter<void>();

  /** Current reactive preferences signal from {@link PreferencesService}. */
  readonly prefs = this.preferencesService.audioPreferences;

  /** Precomputed options for sound pack selection combobox. */
  readonly soundPackOptions = computed<SearchableOption<SoundPackId>[]>(() => [
    {
      value: 'SUBTLE_BELL',
      label: this.transloco.translate('AUDIO_SETTINGS.PACK_SUBTLE_BELL'),
      subLabel: this.transloco.translate('AUDIO_SETTINGS.PACK_SUBTLE_BELL_DESC'),
      badge: 'Harmonic',
      badgeType: 'primary',
      icon: 'musical-notes-outline',
    },
    {
      value: 'SHAKER_CHIME',
      label: this.transloco.translate('AUDIO_SETTINGS.PACK_SHAKER_CHIME'),
      subLabel: this.transloco.translate('AUDIO_SETTINGS.PACK_SHAKER_CHIME_DESC'),
      badge: 'Bar Signature',
      badgeType: 'success',
      icon: 'wine-outline',
    },
    {
      value: 'RETRO_DING',
      label: this.transloco.translate('AUDIO_SETTINGS.PACK_RETRO_DING'),
      subLabel: this.transloco.translate('AUDIO_SETTINGS.PACK_RETRO_DING_DESC'),
      badge: '8-Bit Arcade',
      badgeType: 'neutral',
      icon: 'game-controller-outline',
    },
    {
      value: 'HIGH_URGENCY',
      label: this.transloco.translate('AUDIO_SETTINGS.PACK_HIGH_URGENCY'),
      subLabel: this.transloco.translate('AUDIO_SETTINGS.PACK_HIGH_URGENCY_DESC'),
      badge: 'Loud Venues',
      badgeType: 'danger',
      icon: 'warning-outline',
    },
  ]);

  /** Precomputed options for urgency repeat intervals. */
  readonly urgentRepeatOptions = computed<SearchableOption<UrgentRepeatInterval>[]>(() => [
    {
      value: 'ONCE',
      label: this.transloco.translate('AUDIO_SETTINGS.REPEAT_ONCE'),
      subLabel: this.transloco.translate('AUDIO_SETTINGS.REPEAT_ONCE_DESC'),
      badge: '1x',
      badgeType: 'neutral',
    },
    {
      value: 'EVERY_1_MIN',
      label: this.transloco.translate('AUDIO_SETTINGS.REPEAT_1_MIN'),
      subLabel: this.transloco.translate('AUDIO_SETTINGS.REPEAT_1_MIN_DESC'),
      badge: '60s',
      badgeType: 'warning',
    },
    {
      value: 'EVERY_2_MIN',
      label: this.transloco.translate('AUDIO_SETTINGS.REPEAT_2_MIN'),
      subLabel: this.transloco.translate('AUDIO_SETTINGS.REPEAT_2_MIN_DESC'),
      badge: '120s',
      badgeType: 'neutral',
    },
  ]);

  constructor() {
    addIcons({
      volumeHighOutline,
      volumeMuteOutline,
      volumeLowOutline,
      playOutline,
      notificationsOutline,
      timerOutline,
      handLeftOutline,
      musicalNotesOutline,
      closeOutline,
    });
  }

  /**
   * Toggles master audio enablement.
   *
   * @param enabled New audio active state.
   */
  onToggleEnabled(enabled: boolean): void {
    this.preferencesService.setSoundEnabled(enabled);
  }

  /**
   * Updates master volume level from ion-range slider.
   *
   * @param event Slider change event.
   */
  onVolumeChange(event: Event): void {
    const customEvent = event as RangeCustomEvent;
    const value = customEvent.detail?.value;
    if (typeof value === 'number') {
      this.soundService.updatePreferences({ volume: value });
    }
  }

  /**
   * Updates default sound pack theme.
   *
   * @param pack Selected {@link SoundPackId}.
   */
  onSoundPackChange(pack: SoundPackId): void {
    if (pack) {
      this.preferencesService.setSoundPack(pack);
      this.soundService.testSound(pack, 'NEW_ORDER');
    }
  }

  /**
   * Updates trigger enabled flag.
   *
   * @param trigger Target trigger type.
   * @param enabled New flag state.
   */
  onToggleTrigger(trigger: AudioTriggerType, enabled: boolean): void {
    this.preferencesService.setTriggerEnabled(trigger, enabled);
  }

  /**
   * Updates urgency repeat repetition frequency.
   *
   * @param interval Chosen repeat interval.
   */
  onUrgentRepeatChange(interval: UrgentRepeatInterval): void {
    if (interval) {
      this.preferencesService.setUrgentRepeatInterval(interval);
    }
  }

  /**
   * Previews the current sound pack with the active volume level.
   */
  onPreviewCurrentPack(): void {
    this.soundService.testSound(this.prefs().soundPack, 'NEW_ORDER');
  }

  /**
   * Plays a live preview of any specific sound pack profile.
   *
   * @param pack Sound pack to preview.
   * @param event Event context to simulate.
   */
  onPreviewPack(pack: SoundPackId, event: AudioTriggerType = 'NEW_ORDER'): void {
    this.soundService.testSound(pack, event);
  }

  /**
   * Requests dismissal of the popover.
   */
  onClose(): void {
    this.closePanel.emit();
  }
}
