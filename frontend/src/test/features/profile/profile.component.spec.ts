import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { Store } from '@ngrx/store';
import { ToastController, IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ProfileComponent } from '../../../app/features/profile/profile.component';
import { DatePipe } from '@angular/common';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { UserService } from '../../../app/core/services/user.service';
import { SoundService } from '../../../app/core/services/sound.service';
import { LanguageService } from '../../../app/core/services/language.service';
import { PreferencesService } from '../../../app/core/services/preferences.service';
import { ThemeService } from '../../../app/core/services/theme.service';
import { RouletteService } from '../../../app/core/services/roulette.service';
import { FeatureFlagService } from '../../../app/core/services/feature-flag.service';
import { setCurrentUser } from '../../../app/core/store/auth.actions';
import { User } from '../../../app/core/models/user.model';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let storeSpy: jasmine.SpyObj<Store>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;
  let soundServiceSpy: jasmine.SpyObj<SoundService>;
  let languageServiceSpy: jasmine.SpyObj<LanguageService>;
  let preferencesSpy: jasmine.SpyObj<PreferencesService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;
  let rouletteServiceSpy: jasmine.SpyObj<RouletteService>;
  let featureFlagServiceSpy: jasmine.SpyObj<FeatureFlagService>;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    roles: ['SERVEUR'],
    enabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01')
  };

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(mockUser));

    userServiceSpy = jasmine.createSpyObj('UserService', ['updateUser']);
    userServiceSpy.updateUser.and.returnValue(of(mockUser));

    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastSpy.present.and.returnValue(Promise.resolve());

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    soundServiceSpy = jasmine.createSpyObj('SoundService', ['setSoundEnabled']);
    languageServiceSpy = jasmine.createSpyObj('LanguageService', ['setLanguage'], { currentLanguage: 'fr' });
    preferencesSpy = jasmine.createSpyObj('PreferencesService', ['setSoundEnabled', 'setVisualNotifEnabled', 'soundEnabled', 'visualNotifEnabled']);
    preferencesSpy.soundEnabled.and.returnValue(true);
    preferencesSpy.visualNotifEnabled.and.returnValue(true);

    themeServiceSpy = jasmine.createSpyObj('ThemeService', ['setTheme'], { currentTheme: 'dark' });
    rouletteServiceSpy = jasmine.createSpyObj('RouletteService', ['getDisplayPin', 'regenerateDisplayPin']);
    rouletteServiceSpy.getDisplayPin.and.returnValue(of({ pin: '7777', establishmentId: 1 }));
    rouletteServiceSpy.regenerateDisplayPin.and.returnValue(of({ pin: '8888', establishmentId: 1 }));

    featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['isModuleEnabled'], {
      mysteryRouletteEnabled: signal(true)
    });

    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        RouterTestingModule,
        ReactiveFormsModule,
        getTranslocoTestingModule(),
        IonCard, IonCardHeader, IonCardTitle, IonCardContent,
        DatePipe
      ],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: SoundService, useValue: soundServiceSpy },
        { provide: LanguageService, useValue: languageServiceSpy },
        { provide: PreferencesService, useValue: preferencesSpy },
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: RouletteService, useValue: rouletteServiceSpy },
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise profileForm with controls username, email, newPassword, confirmPassword', () => {
    expect(component.profileForm.contains('username')).toBeTrue();
    expect(component.profileForm.contains('email')).toBeTrue();
    expect(component.profileForm.contains('newPassword')).toBeTrue();
    expect(component.profileForm.contains('confirmPassword')).toBeTrue();
  });

  it('should load roulette TV PIN on initialization when module is active', () => {
    expect(rouletteServiceSpy.getDisplayPin).toHaveBeenCalled();
    expect(component.roulettePin).toBe('7777');
  });

  it('should switch theme mode and invoke ThemeService', () => {
    component.onSetThemeMode('light');
    expect(themeServiceSpy.setTheme).toHaveBeenCalledWith('light');
    expect(component.currentTheme).toBe('light');
  });

  it('should regenerate roulette TV PIN and display confirmation toast', async () => {
    component.regenerateRoulettePin();
    expect(rouletteServiceSpy.regenerateDisplayPin).toHaveBeenCalled();
    await Promise.resolve();
    expect(component.roulettePin).toBe('8888');
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should prefill profileForm with currentUser values', () => {
    expect(component.profileForm.get('username')?.value).toBe('testuser');
    expect(component.profileForm.get('email')?.value).toBe('test@example.com');
  });

  it('onSubmit() dispatches setCurrentUser action on success', () => {
    component.profileForm.patchValue({ username: 'testuser', email: 'test@example.com' });
    component.onSubmit();
    expect(storeSpy.dispatch).toHaveBeenCalledWith(setCurrentUser({ user: mockUser }));
  });

  it('onSubmit() shows a success toast on successful save', async () => {
    component.profileForm.patchValue({ username: 'testuser', email: 'test@example.com' });
    component.onSubmit();
    await Promise.resolve();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
    expect(toastSpy.present).toHaveBeenCalled();
  });

  it('onSubmit() shows an error toast when UserService fails', async () => {
    userServiceSpy.updateUser.and.returnValue(throwError(() => new Error('API error')));
    component.profileForm.patchValue({ username: 'testuser', email: 'test@example.com' });
    component.onSubmit();
    await Promise.resolve();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
    expect(toastSpy.present).toHaveBeenCalled();
  });

  it('onSubmit() does nothing when form is invalid', () => {
    component.profileForm.patchValue({ username: '', email: 'bad' });
    component.onSubmit();
    expect(userServiceSpy.updateUser).not.toHaveBeenCalled();
  });

  it('should handle sound toggle changes', () => {
    component.onSoundToggle(false);
    expect(component.soundEnabled).toBeFalse();
    expect(soundServiceSpy.setSoundEnabled).toHaveBeenCalledWith(false);
  });

  it('should handle visual notification toggle changes', () => {
    component.onVisualNotifToggle(false);
    expect(component.visualNotifEnabled).toBeFalse();
    expect(preferencesSpy.setVisualNotifEnabled).toHaveBeenCalledWith(false);
  });

  it('should handle language selection changes', () => {
    component.onLanguageChange('en');
    expect(component.selectedLanguage).toBe('en');
    expect(languageServiceSpy.setLanguage).toHaveBeenCalledWith('en');
  });

  it('should handle theme mode changes', () => {
    component.onSetThemeMode('light');
    expect(component.currentTheme).toBe('light');
    expect(themeServiceSpy.setTheme).toHaveBeenCalledWith('light');
  });

  it('should toggle theme studio visibility', () => {
    expect(component.showThemeStudio).toBeFalse();
    component.toggleThemeStudio();
    expect(component.showThemeStudio).toBeTrue();
    component.toggleThemeStudio();
    expect(component.showThemeStudio).toBeFalse();
  });

  it('should unsubscribe on destroy without errors', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
