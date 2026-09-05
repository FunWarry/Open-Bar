import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ToastController, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { of, Subject, throwError } from 'rxjs';
import { ProfileComponent } from '../../../app/features/profile/profile.component';
import { DatePipe } from '@angular/common';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { UserService } from '../../../app/core/services/user.service';
import { SoundService } from '../../../app/core/services/sound.service';
import { LanguageService } from '../../../app/core/services/language.service';
import { PreferencesService } from '../../../app/core/services/preferences.service';
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

    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        ReactiveFormsModule,
        getTranslocoTestingModule(),
        IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption,
        DatePipe
      ],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: SoundService, useValue: soundServiceSpy },
        { provide: LanguageService, useValue: languageServiceSpy },
        { provide: PreferencesService, useValue: preferencesSpy }
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

  it('should pre-fill form with current user data from the store on init', () => {
    expect(component.profileForm.get('username')?.value).toBe('testuser');
    expect(component.profileForm.get('email')?.value).toBe('test@example.com');
  });

  it('should store current user reference from the NgRx store', () => {
    expect(component.currentUser).toEqual(mockUser);
  });

  it('should mark form invalid when username is empty', () => {
    component.profileForm.patchValue({ username: '', email: 'test@example.com' });
    expect(component.profileForm.get('username')?.valid).toBeFalse();
    expect(component.profileForm.valid).toBeFalse();
  });

  it('should mark form invalid when email is malformed', () => {
    component.profileForm.patchValue({ username: 'testuser', email: 'not-an-email' });
    expect(component.profileForm.get('email')?.valid).toBeFalse();
  });

  it('should mark form invalid when newPassword is shorter than 6 characters', () => {
    component.profileForm.patchValue({ newPassword: '123' });
    expect(component.profileForm.get('newPassword')?.valid).toBeFalse();
  });

  it('passwordMatchValidator returns null when passwords match', () => {
    component.profileForm.patchValue({ newPassword: 'password1', confirmPassword: 'password1' });
    const result = component.passwordMatchValidator(component.profileForm);
    expect(result).toBeNull();
  });

  it('passwordMatchValidator returns {passwordMismatch: true} when passwords differ', () => {
    component.profileForm.patchValue({ newPassword: 'password1', confirmPassword: 'different' });
    const result = component.passwordMatchValidator(component.profileForm);
    expect(result).toEqual({ passwordMismatch: true });
  });

  it('onSubmit() calls UserService.updateUser with form values on valid form', () => {
    component.profileForm.patchValue({
      username: 'testuser',
      email: 'test@example.com',
      newPassword: '',
      confirmPassword: ''
    });
    component.onSubmit();
    expect(userServiceSpy.updateUser).toHaveBeenCalledWith(1, { username: 'testuser', email: 'test@example.com' });
  });

  it('onSubmit() includes password in payload when newPassword is provided', () => {
    component.profileForm.patchValue({
      username: 'testuser',
      email: 'test@example.com',
      newPassword: 'newpass1',
      confirmPassword: 'newpass1'
    });
    component.onSubmit();
    expect(userServiceSpy.updateUser).toHaveBeenCalledWith(
      1,
      jasmine.objectContaining({ username: 'testuser', email: 'test@example.com' })
    );
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

  it('onSubmit() does nothing when currentUser is null', () => {
    storeSpy.select.and.returnValue(of(null));
    component.currentUser = null;
    component.profileForm.patchValue({ username: 'testuser', email: 'test@example.com' });
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

  it('should unsubscribe on destroy without errors', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
