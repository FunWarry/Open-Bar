import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { ProfileComponent } from '../../../app/features/profile/profile.component';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonButton, IonBadge, IonText, IonNote
} from '@ionic/angular/standalone';
import { NgIf, NgFor, AsyncPipe, DatePipe } from '@angular/common';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let storeSpy: jasmine.SpyObj<Store>;

  const mockUser = {
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

    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        ReactiveFormsModule,
        getTranslocoTestingModule(),
        IonCard, IonCardHeader, IonCardTitle, IonCardContent,
        IonItem, IonLabel, IonInput, IonButton, IonBadge, IonText, IonNote,
        NgIf, NgFor, AsyncPipe, DatePipe
      ],
      providers: [
        { provide: Store, useValue: storeSpy }
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

  it('should patch form values with current user on init', () => {
    expect(component.profileForm.get('username')?.value).toBe('testuser');
    expect(component.profileForm.get('email')?.value).toBe('test@example.com');
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

  it('onSubmit() does not throw when form is valid', () => {
    component.profileForm.patchValue({
      username: 'testuser',
      email: 'test@example.com',
      newPassword: '',
      confirmPassword: ''
    });
    expect(() => component.onSubmit()).not.toThrow();
  });

  it('onSubmit() does nothing when form is invalid', () => {
    const consoleSpy = spyOn(console, 'log');
    component.profileForm.patchValue({ username: '', email: 'bad' });
    component.onSubmit();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('currentUser$ emits the user from the store', (done) => {
    component.currentUser$.subscribe(user => {
      expect(user).toEqual(mockUser);
      done();
    });
  });

  it('should not patch form when store emits null', async () => {
    storeSpy.select.and.returnValue(of(null));

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        ReactiveFormsModule,
        getTranslocoTestingModule(),
        IonCard, IonCardHeader, IonCardTitle, IonCardContent,
        IonItem, IonLabel, IonInput, IonButton, IonBadge, IonText, IonNote,
        NgIf, NgFor, AsyncPipe, DatePipe
      ],
      providers: [
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    const fixture2 = TestBed.createComponent(ProfileComponent);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(component2.profileForm.get('username')?.value).toBe('');
    expect(component2.profileForm.get('email')?.value).toBe('');
  });
});
