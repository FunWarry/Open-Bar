import { TestBed } from '@angular/core/testing';
import { PreferencesService } from '../../../app/core/services/preferences.service';

describe('PreferencesService', () => {
  let service: PreferencesService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [PreferencesService]
    });
    service = TestBed.inject(PreferencesService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created with default true values when localStorage is empty', () => {
    expect(service.soundEnabled()).toBeTrue();
    expect(service.visualNotifEnabled()).toBeTrue();
  });

  it('should update soundEnabled signal and persist to localStorage', () => {
    service.setSoundEnabled(false);
    expect(service.soundEnabled()).toBeFalse();
    expect(localStorage.getItem('openbar_sound_enabled')).toBe('false');
  });

  it('should update visualNotifEnabled signal and persist to localStorage', () => {
    service.setVisualNotifEnabled(false);
    expect(service.visualNotifEnabled()).toBeFalse();
    expect(localStorage.getItem('openbar_visual_notif_enabled')).toBe('false');
  });
});
