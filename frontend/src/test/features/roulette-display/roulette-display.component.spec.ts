import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
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

  it('should remove last digit with onPinBackspace and clear with onPinClear', () => {
    component.onPinDigit('1');
    component.onPinDigit('2');
    expect(component.pinInput()).toBe('12');

    component.onPinBackspace();
    expect(component.pinInput()).toBe('1');

    component.onPinClear();
    expect(component.pinInput()).toBe('');
  });

  it('should handle submitPin server error gracefully', () => {
    rouletteServiceMock.verifyDisplayPin.and.returnValue(throwError(() => new Error('Server error')));
    component.onPinDigit('9');
    component.onPinDigit('9');
    component.onPinDigit('9');
    component.onPinDigit('9');

    expect(component.isUnlocked()).toBeFalse();
    expect(component.pinErrorMessage()).toBe('ROULETTE.PIN_ERROR');
    expect(component.pinInput()).toBe('');
  });

  it('should lock screen and display custom reason key', () => {
    component.isUnlocked.set(true);
    component.lockScreen('ROULETTE.CUSTOM_LOCK');

    expect(component.isUnlocked()).toBeFalse();
    expect(component.pinErrorMessage()).toBe('ROULETTE.CUSTOM_LOCK');
  });

  it('should handle loadInitialConfig error gracefully', () => {
    rouletteServiceMock.getPublicConfig.and.returnValue(throwError(() => new Error('Network error')));
    component.loadInitialConfig();

    expect(component.isLoading).toBeFalse();
  });

  it('should reload config when SECTORS_UPDATED event is received', () => {
    spyOn(component, 'loadInitialConfig');
    const updateEvent: RouletteEvent = {
      eventType: 'SECTORS_UPDATED',
      eventId: 'upd-1',
      durationMs: 0,
      soundProfile: 'CSGO',
      timestamp: new Date().toISOString()
    };

    eventsSubject.next(updateEvent);
    expect(component.loadInitialConfig).toHaveBeenCalled();
  });

  it('should handle SPIN_TRIGGERED event and trigger spin animation', () => {
    const spinEvent: RouletteEvent = {
      eventType: 'SPIN_TRIGGERED',
      eventId: 'spin-1',
      durationMs: 4000,
      soundProfile: 'ARCADE',
      tableNumero: 12,
      spinResult: {
        sectorId: 1,
        winningIndex: 0,
        prizeType: 'COCKTAIL',
        cocktailId: 1,
        cocktailNom: 'Mojito',
        prix: 7.5,
        isMysteryDrink: true,
        addedToCart: false,
        activeSectors: mockConfig.sectors
      },
      timestamp: new Date().toISOString()
    };

    eventsSubject.next(spinEvent);

    expect(component.isSpinning).toBeTrue();
    expect(component.celebrationActive()).toBeFalse();
  });

  it('should celebrate winner and update recent winners on spin completed', () => {
    component.currentEvent = {
      eventType: 'SPIN_TRIGGERED',
      eventId: 'spin-1',
      durationMs: 4000,
      soundProfile: 'ARCADE',
      tableNumero: 7,
      spinResult: {
        sectorId: 1,
        winningIndex: 0,
        prizeType: 'COCKTAIL',
        cocktailId: 1,
        cocktailNom: 'Cosmopolitan',
        prix: 8.0,
        isMysteryDrink: true,
        addedToCart: false,
        activeSectors: mockConfig.sectors
      },
      timestamp: new Date().toISOString()
    };

    component.onSpinCompleted({ sector: mockConfig.sectors[0], index: 0 });

    expect(component.isSpinning).toBeFalse();
    expect(component.celebrationActive()).toBeTrue();
    expect(component.winningResult()?.cocktailNom).toBe('Cosmopolitan');
    expect(audioServiceMock.playWinFanfare).toHaveBeenCalled();
    expect(component.recentWinners()).toHaveSize(4);
    expect(component.recentWinners()[0].tableNumero).toBe(7);
  });

  it('should dismiss celebration cleanly', () => {
    component.celebrationActive.set(true);
    component.winningResult.set({
      sectorId: 1,
      winningIndex: 0,
      prizeType: 'COCKTAIL',
      cocktailNom: 'Cosmopolitan',
      prix: 8.0,
      isMysteryDrink: true,
      addedToCart: false,
      activeSectors: []
    });

    component.dismissCelebration();

    expect(component.celebrationActive()).toBeFalse();
    expect(component.winningResult()).toBeNull();
  });

  it('should close settings modal when backdrop is clicked', () => {
    component.openSettingsModal();
    const dummyTarget = document.createElement('div');
    const mockEvent = {
      target: dummyTarget,
      currentTarget: dummyTarget
    } as unknown as MouseEvent;

    component.onBackdropClick(mockEvent);
    expect(component.isSettingsModalOpen()).toBeFalse();
  });
});
