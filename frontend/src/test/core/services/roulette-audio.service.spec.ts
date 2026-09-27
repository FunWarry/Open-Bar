import { TestBed } from '@angular/core/testing';
import { RouletteAudioService } from '../../../app/core/services/roulette-audio.service';

describe('RouletteAudioService', () => {
  let service: RouletteAudioService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [RouletteAudioService]
    });
    service = TestBed.inject(RouletteAudioService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have default CSGO sound profile and unmuted state', () => {
    expect(service.getSoundProfile()).toBe('CSGO');
    expect(service.getMuted()).toBeFalse();
  });

  it('should toggle mute state and persist to localStorage', () => {
    service.toggleMute();
    expect(service.getMuted()).toBeTrue();
    expect(localStorage.getItem('openbar_roulette_muted')).toBe('true');

    service.toggleMute();
    expect(service.getMuted()).toBeFalse();
    expect(localStorage.getItem('openbar_roulette_muted')).toBe('false');
  });

  it('should set sound profile and persist to localStorage', () => {
    service.setSoundProfile('ARCADE');
    expect(service.getSoundProfile()).toBe('ARCADE');
    expect(localStorage.getItem('openbar_roulette_sound_profile')).toBe('ARCADE');
  });

  it('should execute playTick without error even when AudioContext is stubbed/unavailable', () => {
    expect(() => service.playTick(0.5)).not.toThrow();
  });

  it('should execute playWinFanfare without error', () => {
    expect(() => service.playWinFanfare()).not.toThrow();
  });

  it('should respect muted state when playTick is called', () => {
    service.toggleMute();
    expect(service.getMuted()).toBeTrue();
    expect(() => service.playTick(0.2)).not.toThrow();
  });
});
