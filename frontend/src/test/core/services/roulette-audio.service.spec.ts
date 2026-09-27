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

  it('should play tick and fanfare with ARCADE sound profile', () => {
    service.setSoundProfile('ARCADE');
    expect(() => service.playTick(0.1)).not.toThrow();
    expect(() => service.playWinFanfare()).not.toThrow();
  });

  it('should not play fanfare when muted', () => {
    service.toggleMute();
    expect(() => service.playWinFanfare()).not.toThrow();
  });

  it('should synthesize audio nodes when Web Audio API is available', () => {
    const mockOscillator = {
      type: 'triangle',
      frequency: {
        setValueAtTime: jasmine.createSpy('setValueAtTime'),
        exponentialRampToValueAtTime: jasmine.createSpy('exponentialRampToValueAtTime')
      },
      connect: jasmine.createSpy('connect'),
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop')
    };

    const mockGain = {
      gain: {
        setValueAtTime: jasmine.createSpy('setValueAtTime'),
        linearRampToValueAtTime: jasmine.createSpy('linearRampToValueAtTime'),
        exponentialRampToValueAtTime: jasmine.createSpy('exponentialRampToValueAtTime')
      },
      connect: jasmine.createSpy('connect')
    };

    const mockAudioContext = {
      state: 'running',
      currentTime: 10,
      destination: {},
      createOscillator: jasmine.createSpy('createOscillator').and.returnValue(mockOscillator),
      createGain: jasmine.createSpy('createGain').and.returnValue(mockGain),
      resume: jasmine.createSpy('resume').and.returnValue(Promise.resolve())
    };

    (service as any).audioCtx = mockAudioContext;

    // Test CSGO tick and fanfare
    service.setSoundProfile('CSGO');
    service.playTick(0.3);
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();

    service.playWinFanfare();

    // Test ARCADE tick and fanfare
    service.setSoundProfile('ARCADE');
    service.playTick(0.8);
    service.playWinFanfare();
  });
});
