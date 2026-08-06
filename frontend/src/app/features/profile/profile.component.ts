import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, AbstractControlOptions, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, ToastController, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { DatePipe } from '@angular/common';
import { selectCurrentUser } from '../../core/store/auth.selectors';
import { setCurrentUser } from '../../core/store/auth.actions';
import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { SoundService } from '../../core/services/sound.service';
import { LanguageService, SupportedLanguage } from '../../core/services/language.service';
import { PreferencesService } from '../../core/services/preferences.service';

import { UserAvatarComponent } from '../../core/components/ui/user-avatar/user-avatar.component';
import { InputFieldComponent } from '../../core/components/ui/input-field/input-field.component';
import { PasswordInputComponent } from '../../core/components/ui/password-input/password-input.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { RoleBadgeComponent } from '../../core/components/ui/role-badge/role-badge.component';
import { ToggleSwitchComponent } from '../../core/components/ui/toggle-switch/toggle-switch.component';

/**
 * Profile Component displaying personal user information, roles, profile settings form,
 * and user preferences (sound/visual notifications, language).
 *
 * <p>Aligned with Figma Vue système commun Profile layout ({@code 540:946}),
 * including the PREFERENCES section with toggles and language selector.</p>
 *
 * <p>The form fields (username, email) are reactively pre-filled from the NgRx Auth store
 * via {@link selectCurrentUser}. On submit, the changes are persisted through
 * {@link UserService#updateUser} and the store is updated accordingly.</p>
 *
 * <p>Preferences (sound, visual notifications, language) are persisted via
 * {@link PreferencesService} and {@link LanguageService} using {@code localStorage}.</p>
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: true,
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSelect,
    IonSelectOption,
    DatePipe,
    ReactiveFormsModule,
    TranslocoModule,
    UserAvatarComponent,
    InputFieldComponent,
    PasswordInputComponent,
    ActionButtonComponent,
    RoleBadgeComponent,
    ToggleSwitchComponent,
  ]
})
export class ProfileComponent implements OnInit, OnDestroy {
  /** Reactive profile form with username, email, and optional password fields. */
  profileForm: FormGroup;

  /** Currently authenticated user selected from the NgRx Auth store. */
  currentUser: User | null = null;

  /** Subject used to complete all subscriptions when the component is destroyed. */
  private readonly destroy$ = new Subject<void>();

  /** Whether a save operation is currently in progress. */
  isSaving = false;

  /** Whether sound notifications are currently enabled. Bound to the toggle switch. */
  soundEnabled = false;

  /** Whether visual (toast) notifications are currently enabled. Bound to the toggle switch. */
  visualNotifEnabled = false;

  /** Currently selected language ('fr' | 'en'). */
  selectedLanguage: SupportedLanguage = 'fr';

  constructor(
    private readonly fb: FormBuilder,
    private readonly store: Store,
    private readonly userService: UserService,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService,
    private readonly soundService: SoundService,
    private readonly languageService: LanguageService,
    private readonly preferences: PreferencesService
  ) {
    const groupOptions: AbstractControlOptions = { validators: [this.passwordMatchValidator] };
    this.profileForm = this.fb.group(
      {
        username: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        newPassword: ['', [Validators.minLength(6)]],
        confirmPassword: ['']
      },
      groupOptions
    );
  }

  /**
   * Initialises the component by subscribing to the NgRx Auth store to pre-fill
   * the profile form, and reads the current preference values from services.
   */
  ngOnInit(): void {
    this.store.select(selectCurrentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        if (user) {
          this.profileForm.patchValue({
            username: user.username,
            email: user.email
          });
        }
      });

    // Initialise preference toggles from PreferencesService signals
    this.soundEnabled = this.preferences.soundEnabled();
    this.visualNotifEnabled = this.preferences.visualNotifEnabled();
    this.selectedLanguage = this.languageService.currentLanguage;
  }

  /**
   * Completes the destroy subject to unsubscribe all active observables
   * and prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cross-field validator that returns a {@code passwordMismatch} error
   * when {@code newPassword} and {@code confirmPassword} differ.
   *
   * @param control The abstract control (expected to be a FormGroup) to validate.
   * @returns Validation error map or {@code null} if passwords match.
   */
  passwordMatchValidator(control: AbstractControl): { passwordMismatch: boolean } | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Handles profile form submission.
   * Calls {@link UserService#updateUser} with the updated data,
   * dispatches {@link setCurrentUser} to sync the NgRx store,
   * and shows a toast confirmation or error message.
   */
  onSubmit(): void {
    if (!this.profileForm.valid || !this.currentUser) {
      return;
    }

    this.isSaving = true;
    const { username, email, newPassword } = this.profileForm.value as {
      username: string;
      email: string;
      newPassword: string;
    };

    const payload: Partial<User> & { password?: string } = { username, email };
    if (newPassword) {
      payload['password'] = newPassword;
    }

    this.userService.updateUser(this.currentUser.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (updatedUser) => {
          this.isSaving = false;
          this.store.dispatch(setCurrentUser({ user: updatedUser }));
          this.profileForm.patchValue({ newPassword: '', confirmPassword: '' });
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('PROFILE.SAVE_SUCCESS'),
            duration: 2500,
            color: 'success'
          });
          await toast.present();
        },
        error: async () => {
          this.isSaving = false;
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('PROFILE.SAVE_ERROR'),
            duration: 2500,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  /**
   * Handles changes to the sound notification toggle.
   * Persists the new state via {@link SoundService}.
   *
   * @param enabled The new sound enabled state.
   */
  onSoundToggle(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.soundService.setSoundEnabled(enabled);
  }

  /**
   * Handles changes to the visual notification toggle.
   * Persists the new state via {@link PreferencesService}.
   *
   * @param enabled The new visual notification enabled state.
   */
  onVisualNotifToggle(enabled: boolean): void {
    this.visualNotifEnabled = enabled;
    this.preferences.setVisualNotifEnabled(enabled);
  }

  /**
   * Handles language selection changes.
   * Applies the selected language via {@link LanguageService}.
   *
   * @param lang The selected language code ('fr' or 'en').
   */
  onLanguageChange(lang: SupportedLanguage): void {
    this.selectedLanguage = lang;
    this.languageService.setLanguage(lang);
  }
}
