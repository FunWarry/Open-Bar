import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RouletteDisplayComponent } from '../../../app/features/roulette-display/roulette-display.component';
import { RouletteService } from '../../../app/core/services/roulette.service';
import { RouletteAudioService } from '../../../app/core/services/roulette-audio.service';
import { LanguageService } from '../../../app/core/services/language.service';
import { RouletteEvent, RoulettePublicConfig } from '../../../app/core/models/roulette.model';

describe('RouletteDisplayComponent', () => {
  let component: RouletteDisplayComponent;
  let fixture: ComponentFixture<RouletteDisplayComponent>;
  let rouletteServiceMock: jasmine.SpyObj<RouletteService>;
  let audioServiceMock: jasmine.SpyObj<RouletteAudioService>;
  let languageServiceMock: jasmine.SpyObj<LanguageService>;
  let eventsSubject: Subject<RouletteEvent>;

  const mockConfig: RoulettePublicConfig = {
    enabled: true,
    priceCocktail: 7.5,
    priceMocktail: 5.5,
    stockBias: 'BALANCED',
    soundProfile: 'CSGO',
    sectors: [
      { id: 1, label: 'Mojito', prizeType: 'COCKTAIL', colorHex: '#10b981', iconName: 'wine-outline', probabilityWeight: 2, active: true, displayOrder: 0 }
    ],
    availableCategories: ['ALL']
  };

  beforeEach(async () => {
    sessionStorage.clear();
    eventsSubject = new Subject<RouletteEvent>();
    rouletteServiceMock = jasmine.createSpyObj('RouletteService', ['getPublicConfig', 'watchEvents', 'verifyDisplayPin']);
    rouletteServiceMock.getPublicConfig.and.returnValue(of(mockConfig));
    rouletteServiceMock.watchEvents.and.returnValue(eventsSubject.asObservable());
    rouletteServiceMock.verifyDisplayPin.and.returnValue(of({ valid: true }));

    audioServiceMock = jasmine.createSpyObj('RouletteAudioService', [
      'getMuted',
      'toggleMute',
      'getSoundProfile',
      'setSoundProfile',
      'playWinFanfare'
    ]);
    audioServiceMock.getMuted.and.returnValue(false);
    audioServiceMock.getSoundProfile.and.returnValue('CSGO');

    languageServiceMock = jasmine.createSpyObj('LanguageService', ['setLanguage', 'toggleLanguage']);

    await TestBed.configureTestingModule({
      imports: [
        RouletteDisplayComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'fr' }
        })
      ],
      providers: [
        { provide: RouletteService, useValue: rouletteServiceMock },
        { provide: RouletteAudioService, useValue: audioServiceMock },
        { provide: LanguageService, useValue: languageServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RouletteDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
    fixture.destroy();
  });

  it('should create and initially require PIN unlock if not unlocked in sessionStorage', () => {
    expect(component).toBeTruthy();
    expect(component.isUnlocked()).toBeFalse();
  });

  it('should unlock screen and load config when valid 4-digit PIN is entered', () => {
    component.onPinDigit('7');
    component.onPinDigit('7');
    component.onPinDigit('7');
    component.onPinDigit('7');

    expect(rouletteServiceMock.verifyDisplayPin).toHaveBeenCalledWith('7777');
    expect(component.isUnlocked()).toBeTrue();
    expect(component.sectors).toHaveSize(1);
    expect(sessionStorage.getItem('openbar_roulette_display_unlocked')).toBe('true');
  });

  it('should handle invalid PIN gracefully', () => {
    rouletteServiceMock.verifyDisplayPin.and.returnValue(of({ valid: false }));
    component.onPinDigit('0');
    component.onPinDigit('0');
    component.onPinDigit('0');
    component.onPinDigit('0');

    expect(component.isUnlocked()).toBeFalse();
    expect(component.pinErrorMessage()).toBe('ROULETTE.PIN_INVALID');
  });

  it('should relock screen when PIN_REVOKED STOMP event is received', () => {
    component.isUnlocked.set(true);
    sessionStorage.setItem('openbar_roulette_display_unlocked', 'true');

    const revokeEvent: RouletteEvent = {
      eventType: 'PIN_REVOKED',
      eventId: 'rev-1',
      durationMs: 0,
      soundProfile: 'CSGO',
      timestamp: new Date().toISOString()
    };

    eventsSubject.next(revokeEvent);

    expect(component.isUnlocked()).toBeFalse();
    expect(sessionStorage.getItem('openbar_roulette_display_unlocked')).toBeNull();
    expect(component.pinErrorMessage()).toBe('ROULETTE.PIN_REVOKED_NOTICE');
  });

  it('should open and close settings modal', () => {
    expect(component.isSettingsModalOpen()).toBeFalse();

    component.openSettingsModal();
    expect(component.isSettingsModalOpen()).toBeTrue();

    component.closeSettingsModal();
    expect(component.isSettingsModalOpen()).toBeFalse();
  });

  it('should toggle audio mute through audio service', () => {
    component.toggleMute();
    expect(audioServiceMock.toggleMute).toHaveBeenCalled();
  });

  it('should set sound profile through audio service', () => {
    component.selectSoundProfile('ARCADE');
    expect(audioServiceMock.setSoundProfile).toHaveBeenCalledWith('ARCADE');
    expect(component.soundProfile()).toBe('ARCADE');
  });

  it('should trigger fanfare test on audio service', () => {
    component.testFanfare();
    expect(audioServiceMock.playWinFanfare).toHaveBeenCalled();
  });

  it('should change language through language service', () => {
    component.changeLanguage('en');
    expect(languageServiceMock.setLanguage).toHaveBeenCalledWith('en');
  });
});
