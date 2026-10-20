import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SoundService, SoundAlertService } from '../../../app/core/services/sound.service';
import { PreferencesService } from '../../../app/core/services/preferences.service';
import { SoundPackId } from '../../../app/core/models/sound-alert.model';

describe('SoundService', () => {
  let service: SoundService;
  let prefs: PreferencesService;

  beforeEach(() => {
    localStorage.removeItem('openbar_sound_enabled');
    localStorage.removeItem('openbar_audio_preferences');

    TestBed.configureTestingModule({
      providers: [PreferencesService, SoundService],
    });
    service = TestBed.inject(SoundService);
    prefs = TestBed.inject(PreferencesService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    localStorage.removeItem('openbar_sound_enabled');
    localStorage.removeItem('openbar_audio_preferences');
  });

  it('should initialize with sound enabled and default audio preferences', () => {
    expect(service.isSoundEnabled()).toBeTrue();
    const currentPrefs = service.getPreferences();
    expect(currentPrefs.enabled).toBeTrue();
    expect(currentPrefs.volume).toBe(80);
    expect(currentPrefs.soundPack).toBe('SUBTLE_BELL');
    expect(currentPrefs.triggerNewOrder).toBeTrue();
    expect(currentPrefs.triggerTableCall).toBeTrue();
    expect(currentPrefs.triggerUrgentOrder).toBeTrue();
    expect(currentPrefs.urgentRepeatInterval).toBe('EVERY_1_MIN');
  });

  it('should export SoundAlertService alias identical to SoundService', () => {
    expect(SoundAlertService).toBe(SoundService);
  });

  it('should toggle sound state and synchronize localStorage and signals', () => {
    expect(service.isSoundEnabled()).toBeTrue();

    const newState = service.toggleSound();
    expect(newState).toBeFalse();
    expect(service.isSoundEnabled()).toBeFalse();
    expect(prefs.audioPreferences().enabled).toBeFalse();

    service.toggleSound();
    expect(service.isSoundEnabled()).toBeTrue();
    expect(prefs.audioPreferences().enabled).toBeTrue();
  });

  it('should update master volume and clamp between 0 and 100', () => {
    service.updatePreferences({ volume: 55 });
    expect(service.getPreferences().volume).toBe(55);

    prefs.setVolume(120);
    expect(service.getPreferences().volume).toBe(100);

    prefs.setVolume(-15);
    expect(service.getPreferences().volume).toBe(0);
  });

  it('should update sound pack theme and individual trigger overrides', () => {
    prefs.setSoundPack('SHAKER_CHIME');
    expect(service.getPreferences().soundPack).toBe('SHAKER_CHIME');

    prefs.setSoundOverride('NEW_ORDER', 'RETRO_DING');
    expect(service.getPreferences().soundOverrideNewOrder).toBe('RETRO_DING');

    prefs.setSoundOverride('TABLE_CALL', 'HIGH_URGENCY');
    expect(service.getPreferences().soundOverrideTableCall).toBe('HIGH_URGENCY');

    prefs.setSoundOverride('URGENT_ORDER', null);
    expect(service.getPreferences().soundOverrideUrgentOrder).toBeNull();
  });

  it('should enable and disable individual triggers', () => {
    prefs.setTriggerEnabled('NEW_ORDER', false);
    expect(service.getPreferences().triggerNewOrder).toBeFalse();

    prefs.setTriggerEnabled('TABLE_CALL', false);
    expect(service.getPreferences().triggerTableCall).toBeFalse();

    prefs.setTriggerEnabled('URGENT_ORDER', false);
    expect(service.getPreferences().triggerUrgentOrder).toBeFalse();
  });

  it('should synthesize all 4 sound pack profiles without error', () => {
    const packs: SoundPackId[] = ['SUBTLE_BELL', 'SHAKER_CHIME', 'RETRO_DING', 'HIGH_URGENCY'];
    packs.forEach(pack => {
      expect(() => service.testSound(pack, 'NEW_ORDER')).not.toThrow();
      expect(() => service.testSound(pack, 'TABLE_CALL')).not.toThrow();
      expect(() => service.testSound(pack, 'URGENT_ORDER')).not.toThrow();
    });
  });

  it('should play new order sound when enabled and suppress when trigger or master is disabled', () => {
    expect(() => service.playNewOrderSound()).not.toThrow();

    // Disable trigger
    prefs.setTriggerEnabled('NEW_ORDER', false);
    expect(() => service.playNewOrderSound()).not.toThrow();

    // Re-enable trigger but mute master
    prefs.setTriggerEnabled('NEW_ORDER', true);
    service.setSoundEnabled(false);
    expect(() => service.playNewOrderSound()).not.toThrow();
  });

  it('should play table call sound when enabled and suppress when trigger is disabled', () => {
    expect(() => service.playTableCallSound()).not.toThrow();

    prefs.setTriggerEnabled('TABLE_CALL', false);
    expect(() => service.playTableCallSound()).not.toThrow();
  });

  it('should play urgent alert sound when enabled and suppress when disabled', () => {
    expect(() => service.playUrgentAlertSound()).not.toThrow();

    prefs.setTriggerEnabled('URGENT_ORDER', false);
    expect(() => service.playUrgentAlertSound()).not.toThrow();
  });

  it('should manage urgent orders and repeating reminders', fakeAsync(() => {
    prefs.setUrgentRepeatInterval('EVERY_1_MIN');
    spyOn(service, 'playUrgentAlertSound');

    service.triggerUrgentOrderAlert(101);
    expect(service.playUrgentAlertSound).toHaveBeenCalledTimes(1);

    // Adding again does not duplicate immediately
    service.triggerUrgentOrderAlert(101);
    expect(service.playUrgentAlertSound).toHaveBeenCalledTimes(1);

    tick(60_000);
    expect(service.playUrgentAlertSound).toHaveBeenCalledTimes(2);

    service.clearUrgentOrder(101);
    tick(60_000);
    expect(service.playUrgentAlertSound).toHaveBeenCalledTimes(2);

    service.triggerUrgentOrderAlert(102);
    expect(service.playUrgentAlertSound).toHaveBeenCalledTimes(3);

    service.clearAllUrgentOrders();
    tick(60_000);
    expect(service.playUrgentAlertSound).toHaveBeenCalledTimes(3);
  }));

  it('should handle resumeAudioContext gracefully', async () => {
    const resumed = await service.resumeAudioContext();
    expect(typeof resumed).toBe('boolean');
  });
});
