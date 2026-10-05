import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ToastController, ModalController, IonCheckbox } from '@ionic/angular';
import { SetupService } from '../../core/services/setup.service';
import { InputFieldComponent } from '../../core/components/ui/input-field/input-field.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { LegalComponent, LegalTab } from '../legal/legal.component';

/**
 * Validates that the password and confirmation password fields match.
 *
 * @param control The parent FormGroup containing password and confirmPassword fields
 * @returns Validation error object if mismatch, null otherwise
 */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

/**
 * Setup Component for initial establishment configuration and creation of the primary Administrator account.
 * Streamlined single-step initial provisioning directly redirecting to login and establishment onboarding.
 */
@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ReactiveFormsModule,
    TranslocoModule,
    IonCheckbox,
    InputFieldComponent,
    ActionButtonComponent
  ]
})
export class SetupComponent implements OnInit {
  /** Reactive form managing primary administrator credentials and legal consent. */
  setupForm: FormGroup;

  /** Error message to display if administrator provisioning fails. */
  errorMessage: string | null = null;

  /** Indicates whether the submission HTTP request is in progress. */
  loading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly setupService: SetupService,
    private readonly router: Router,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
    private readonly translocoService: TranslocoService
  ) {
    this.setupForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      nom: ['Admin'],
      prenom: ['Initial'],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    this.setupService.getStatus().subscribe({
      next: (status) => {
        if (status.initialized) {
          void this.router.navigate(['/auth/login']);
        }
      },
      error: () => {}
    });
  }

  /**
   * Handles form submission from the template, triggering administrator account provisioning.
   */
  onSubmit(): void {
    this.submitSetup();
  }

  /**
   * Completes initial setup by provisioning the primary administrator account.
   * Upon successful creation, displays a confirmation toast and navigates to the login page.
   */
  submitSetup(): void {
    this.errorMessage = null;

    if (this.setupForm.invalid) {
      this.setupForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { username, email, nom, prenom, password } = this.setupForm.value;

    this.setupService.createAdmin({
      username,
      email,
      nom,
      prenom,
      password,
      initialCocktailIds: []
    }).subscribe({
      next: async () => {
        this.loading = false;
        const msg = this.translocoService.translate('SETUP.SUCCESS');
        const toast = await this.toastCtrl.create({
          message: msg,
          duration: 4000,
          color: 'success'
        });
        await toast.present();
        await this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || this.translocoService.translate('COMMON.ERROR');
      }
    });
  }

  /**
   * Opens the legal viewer modal with terms of service or source-available license details.
   *
   * @param event DOM click event to stop propagation
   * @param tab Target legal tab to display ('terms' | 'license' | 'compliance' | 'commercial')
   */
  async openLegalModal(event: Event, tab: LegalTab = 'terms'): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: LegalComponent,
      componentProps: {
        initialTab: tab,
        isModal: true
      }
    });
    await modal.present();
  }
}
