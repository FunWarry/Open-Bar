import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AbstractControl, AbstractControlOptions, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, ToastController, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moonOutline, sunnyOutline, laptopOutline, tvOutline, copyOutline, refreshOutline, openOutline, colorPaletteOutline, chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import { DatePipe } from '@angular/common';
import { selectCurrentUser } from '../../core/store/auth.selectors';
import { setCurrentUser } from '../../core/store/auth.actions';
import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { SoundService } from '../../core/services/sound.service';
import { LanguageService, SupportedLanguage } from '../../core/services/language.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { ThemeService, AppTheme } from '../../core/services/theme.service';
import { RouletteService } from '../../core/services/roulette.service';
import { FeatureFlagService } from '../../core/services/feature-flag.service';

import { UserAvatarComponent } from '../../core/components/ui/user-avatar/user-avatar.component';
import { InputFieldComponent } from '../../core/components/ui/input-field/input-field.component';
import { PasswordInputComponent } from '../../core/components/ui/password-input/password-input.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { RoleBadgeComponent } from '../../core/components/ui/role-badge/role-badge.component';
import { ToggleSwitchComponent } from '../../core/components/ui/toggle-switch/toggle-switch.component';
import { SearchableSelectComponent, SearchableOption } from '../../core/components/ui/searchable-select/searchable-select.component';
import { ThemeCustomizerComponent } from '../theme/theme-customizer.component';

/**
 * Profile Component displaying personal user information, roles, profile settings form,
 * user preferences (theme mode, sound/visual notifications, language), and Roulette TV PIN.
 *
 * <p>Aligned with Figma Common system view Profile layout ({@code 540:946}),
 * including the PREFERENCES section with toggles, theme switcher, and language selector.</p>
 *
 * <p>The form fields (username, email) are reactively pre-filled from the NgRx Auth store
 * via {@link selectCurrentUser}. On submit, the changes are persisted through
 * {@link UserService#updateUser} and the store is updated accordingly.</p>
 *
 * <p>Preferences (theme, sound, visual notifications, language) are persisted via
 * {@link ThemeService}, {@link PreferencesService}, and {@link LanguageService} using {@code localStorage}.</p>
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    RouterLink,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    TranslocoModule,
    UserAvatarComponent,
    InputFieldComponent,
    PasswordInputComponent,
    ActionButtonComponent,
    RoleBadgeComponent,
    ToggleSwitchComponent,
    SearchableSelectComponent,
    ThemeCustomizerComponent,
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

  /** Available language options for app-searchable-select dropdown. */
  readonly languageOptions: SearchableOption<SupportedLanguage>[] = [
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'en', label: '🇬🇧 English' },
  ];

  /** Current interface theme mode ('dark' | 'light' | 'system'). */
  currentTheme: AppTheme = 'dark';

  /** Whether the full theme customizer studio is expanded in profile. */
  showThemeStudio = false;

  /** Current 4-digit PIN code for the Roulette TV display screen. */
  roulettePin = '7777';

  /** Whether a PIN regeneration request is currently in flight. */
  isRegeneratingPin = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly store: Store,
    private readonly userService: UserService,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService,
    private readonly soundService: SoundService,
    private readonly languageService: LanguageService,
    private readonly preferences: PreferencesService,
    private readonly themeService: ThemeService,
    private readonly rouletteService: RouletteService,
    public readonly featureFlagService: FeatureFlagService,
    private readonly router: Router
  ) {
    addIcons({
      moonOutline,
      sunnyOutline,
      laptopOutline,
      tvOutline,
      copyOutline,
      refreshOutline,
      openOutline,
      colorPaletteOutline,
      chevronDownOutline,
      chevronUpOutline,
    });

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

    // Initializes preference toggles from PreferencesService signals
    this.soundEnabled = this.preferences.soundEnabled();
    this.visualNotifEnabled = this.preferences.visualNotifEnabled();
    this.selectedLanguage = this.languageService.currentLanguage;
    this.currentTheme = this.themeService.currentTheme;

    this.loadRoulettePin();
  }

  /**
   * Loads the current 4-digit PIN for the roulette TV display screen.
   */
  loadRoulettePin(): void {
    if (this.featureFlagService.mysteryRouletteEnabled()) {
      this.rouletteService.getDisplayPin()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res?.pin) {
              this.roulettePin = res.pin;
            }
          },
          error: () => {}
        });
    }
  }

  /**
   * Changes the application theme mode and updates localStorage.
   *
   * @param mode Theme mode to activate
   */
  onSetThemeMode(mode: AppTheme): void {
    this.themeService.setTheme(mode);
    this.currentTheme = mode;
  }

  /**
   * Toggles the inline theme studio customizer view.
   */
  toggleThemeStudio(): void {
    this.showThemeStudio = !this.showThemeStudio;
  }

  /**
   * Regenerates a new 4-digit PIN for the TV broadcast display.
   */
  regenerateRoulettePin(): void {
    this.isRegeneratingPin = true;
    this.rouletteService.regenerateDisplayPin()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res) => {
          this.roulettePin = res.pin;
          this.isRegeneratingPin = false;
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('ROULETTE.REGENERATE_PIN_SUCCESS'),
            duration: 3000,
            color: 'success'
          });
          await toast.present();
        },
        error: async () => {
          this.isRegeneratingPin = false;
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('ERRORS.GENERIC'),
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  /**
   * Copies the TV display PIN code to the user clipboard.
   */
  async copyPin(): Promise<void> {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(this.roulettePin);
      const toast = await this.toastCtrl.create({
        message: this.transloco.translate('ROULETTE.PIN_COPIED'),
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    }
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
  onLanguageChange(lang: string): void {
    const supported: SupportedLanguage = lang === 'en' ? 'en' : 'fr';
    this.selectedLanguage = supported;
    this.languageService.setLanguage(supported);
  }

  /**
   * Navigates to the interactive Onboarding tutorial screen.
   */
  onRestartOnboarding(): void {
    void this.router.navigate(['/onboarding']);
  }
}
