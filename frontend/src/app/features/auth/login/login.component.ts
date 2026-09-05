import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Store } from '@ngrx/store';
import { login } from '../../../core/store/auth.actions';
import { selectAuthError, selectCurrentUser, selectIsAuthenticated } from '../../../core/store/auth.selectors';
import { filter, take, Subscription } from 'rxjs';
import { SetupService } from '../../../core/services/setup.service';
import { AuthService } from '../../../core/services/auth.service';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { PasswordInputComponent } from '../../../core/components/ui/password-input/password-input.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';

/**
 * Login Component allowing users to sign in to their OpenBar workspace.
 * Conforms to Figma Common system view Login card specs (`538:906`).
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslocoModule,
    InputFieldComponent,
    PasswordInputComponent,
    ActionButtonComponent
  ]
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  private readonly subscriptions: Subscription[] = [];
  private readonly setupService = inject(SetupService);
  private readonly authService = inject(AuthService);
  private readonly onboardingService = inject(OnboardingService);

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly store: Store,
    private readonly translocoService: TranslocoService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const setupSub = this.setupService.getStatus().subscribe({
      next: (status) => {
        if (!status.initialized) {
          this.authService.logout();
          this.router.navigate(['/setup']);
          return;
        }
        this.checkExistingAuth();
      },
      error: () => {
        this.checkExistingAuth();
      }
    });
    this.subscriptions.push(setupSub);
  }

  private checkExistingAuth(): void {
    const authSub = this.store
      .select(selectIsAuthenticated)
      .pipe(
        take(1),
        filter((isAuth) => isAuth)
      )
      .subscribe(() => {
        this.navigateAfterLogin();
      });

    this.subscriptions.push(authSub);
  }

  private navigateAfterLogin(): void {
    const userSub = this.store
      .select(selectCurrentUser)
      .pipe(take(1))
      .subscribe((user) => {
        const userKey = user?.id ? String(user.id) : (user?.roles?.[0] || 'CLIENT');
        if (!this.onboardingService.isCompleted(userKey)) {
          this.router.navigate(['/onboarding']);
        } else {
          this.router.navigate(['/app-home']);
        }
      });

    this.subscriptions.push(userSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onSubmit(): void {
    this.errorMessage = null;

    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;

      this.store.dispatch(login({ email: username, password }));

      const errorSub = this.store
        .select(selectAuthError)
        .pipe(
          filter((error) => error !== null),
          take(1)
        )
        .subscribe(() => {
          this.errorMessage = this.translocoService.translate('AUTH.INVALID_CREDENTIALS');
        });

      this.subscriptions.push(errorSub);

      const authSub = this.store
        .select(selectIsAuthenticated)
        .pipe(
          filter((isAuth) => isAuth),
          take(1)
        )
        .subscribe(() => {
          this.navigateAfterLogin();
        });

      this.subscriptions.push(authSub);
    }
  }
}
