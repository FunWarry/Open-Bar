import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { AudioSettingsPopoverComponent } from '../../../../app/core/components/audio-settings/audio-settings-popover.component';
import { PreferencesService } from '../../../../app/core/services/preferences.service';
import { SoundService } from '../../../../app/core/services/sound.service';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('AudioSettingsPopoverComponent', () => {
  let component: AudioSettingsPopoverComponent;
  let fixture: ComponentFixture<AudioSettingsPopoverComponent>;
  let preferencesService: PreferencesService;
  let soundServiceSpy: jasmine.SpyObj<SoundService>;

  beforeEach(async () => {
    localStorage.removeItem('openbar_sound_enabled');
    localStorage.removeItem('openbar_audio_preferences');

    soundServiceSpy = jasmine.createSpyObj('SoundService', [
      'testSound',
      'updatePreferences',
      'isSoundEnabled',
      'setSoundEnabled',
      'toggleSound',
      'playNewOrderSound',
      'playTableCallSound',
      'playUrgentAlertSound',
    ]);

    await TestBed.configureTestingModule({
      imports: [
        AudioSettingsPopoverComponent,
        FormsModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        PreferencesService,
        { provide: SoundService, useValue: soundServiceSpy },
      ],
    }).compileComponents();

    preferencesService = TestBed.inject(PreferencesService);
    fixture = TestBed.createComponent(AudioSettingsPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('openbar_sound_enabled');
    localStorage.removeItem('openbar_audio_preferences');
  });

  it('should create the component successfully', () => {
    expect(component).toBeTruthy();
  });

  it('should read initial preferences from PreferencesService', () => {
    const p = component.prefs();
    expect(p.enabled).toBeTrue();
    expect(p.volume).toBe(80);
    expect(p.soundPack).toBe('SUBTLE_BELL');
    expect(p.triggerNewOrder).toBeTrue();
    expect(p.triggerTableCall).toBeTrue();
    expect(p.triggerUrgentOrder).toBeTrue();
    expect(p.urgentRepeatInterval).toBe('EVERY_1_MIN');
  });

  it('should toggle master audio enablement', () => {
    component.onToggleEnabled(false);
    expect(preferencesService.soundEnabled()).toBeFalse();
    expect(component.prefs().enabled).toBeFalse();

    component.onToggleEnabled(true);
    expect(preferencesService.soundEnabled()).toBeTrue();
    expect(component.prefs().enabled).toBeTrue();
  });

  it('should update master volume through onVolumeChange', () => {
    const mockEvent = { detail: { value: 65 } } as unknown as Event;
    component.onVolumeChange(mockEvent);
    expect(soundServiceSpy.updatePreferences).toHaveBeenCalledWith({ volume: 65 });
  });

  it('should change sound pack theme and audition it', () => {
    component.onSoundPackChange('SHAKER_CHIME');
    expect(preferencesService.audioPreferences().soundPack).toBe('SHAKER_CHIME');
    expect(soundServiceSpy.testSound).toHaveBeenCalledWith('SHAKER_CHIME', 'NEW_ORDER');
  });

  it('should toggle specific audio triggers independently', () => {
    component.onToggleTrigger('NEW_ORDER', false);
    expect(preferencesService.audioPreferences().triggerNewOrder).toBeFalse();

    component.onToggleTrigger('TABLE_CALL', false);
    expect(preferencesService.audioPreferences().triggerTableCall).toBeFalse();

    component.onToggleTrigger('URGENT_ORDER', false);
    expect(preferencesService.audioPreferences().triggerUrgentOrder).toBeFalse();
  });

  it('should update urgency repetition frequency', () => {
    component.onUrgentRepeatChange('EVERY_2_MIN');
    expect(preferencesService.audioPreferences().urgentRepeatInterval).toBe('EVERY_2_MIN');
  });

  it('should audition current sound pack', () => {
    component.onPreviewCurrentPack();
    expect(soundServiceSpy.testSound).toHaveBeenCalledWith('SUBTLE_BELL', 'NEW_ORDER');
  });

  it('should preview specific sound pack profiles', () => {
    component.onPreviewPack('RETRO_DING', 'NEW_ORDER');
    expect(soundServiceSpy.testSound).toHaveBeenCalledWith('RETRO_DING', 'NEW_ORDER');

    component.onPreviewPack('HIGH_URGENCY', 'URGENT_ORDER');
    expect(soundServiceSpy.testSound).toHaveBeenCalledWith('HIGH_URGENCY', 'URGENT_ORDER');
  });

  it('should emit closePanel when close button is clicked', () => {
    spyOn(component.closePanel, 'emit');
    component.onClose();
    expect(component.closePanel.emit).toHaveBeenCalled();
  });

  it('should hide popover header when embedded is set to true', () => {
    component.embedded = true;
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('.audio-popover-header');
    expect(header).toBeNull();
  });
});
