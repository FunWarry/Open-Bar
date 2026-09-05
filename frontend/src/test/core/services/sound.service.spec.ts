import { TestBed } from '@angular/core/testing';
import { SoundService } from '../../../app/core/services/sound.service';
import { PreferencesService } from '../../../app/core/services/preferences.service';

describe('SoundService', () => {
  let service: SoundService;

  beforeEach(() => {
    localStorage.removeItem('openbar_sound_enabled');
    TestBed.configureTestingModule({
      providers: [SoundService],
    });
    service = TestBed.inject(SoundService);
  });

  afterEach(() => {
    localStorage.removeItem('openbar_sound_enabled');
  });

  it('should initialize with sound enabled by default if no localStorage entry exists', () => {
    expect(service.isSoundEnabled()).toBeTrue();
  });

  it('should restore soundEnabled preference from localStorage if set to false', () => {
    localStorage.setItem('openbar_sound_enabled', 'false');
    const prefs = new PreferencesService();
    const customService = new SoundService(prefs);
    expect(customService.isSoundEnabled()).toBeFalse();
  });

  it('should toggle sound state and update localStorage', () => {
    expect(service.isSoundEnabled()).toBeTrue();

    const newState = service.toggleSound();

    expect(newState).toBeFalse();
    expect(service.isSoundEnabled()).toBeFalse();
    expect(localStorage.getItem('openbar_sound_enabled')).toBe('false');

    service.toggleSound();
    expect(service.isSoundEnabled()).toBeTrue();
    expect(localStorage.getItem('openbar_sound_enabled')).toBe('true');
  });

  it('should set sound state explicitly', () => {
    service.setSoundEnabled(false);
    expect(service.isSoundEnabled()).toBeFalse();
    expect(localStorage.getItem('openbar_sound_enabled')).toBe('false');
  });

  it('should play new order sound when sound is enabled without throwing errors', () => {
    expect(() => service.playNewOrderSound()).not.toThrow();
  });

  it('should not attempt audio playback when sound is disabled', () => {
    service.setSoundEnabled(false);
    expect(() => service.playNewOrderSound()).not.toThrow();
    expect(() => service.playOrderReadySound()).not.toThrow();
  });

  it('should play order ready sound when sound is enabled without throwing errors', () => {
    expect(() => service.playOrderReadySound()).not.toThrow();
  });
});
