import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { User } from '../../../../core/models/user.model';
import { ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  close,
  personOutline,
  mailOutline,
  lockClosed,
  lockClosedOutline,
  shieldCheckmarkOutline,
  checkmarkCircle,
  personAdd,
  createOutline,
  briefcaseOutline,
  restaurantOutline,
  wineOutline
} from 'ionicons/icons';
import { ModalComponent } from '../../../../core/components/ui/modal/modal.component';
import { InputFieldComponent } from '../../../../core/components/ui/input-field/input-field.component';
import { PasswordInputComponent } from '../../../../core/components/ui/password-input/password-input.component';
import { FilterChipComponent } from '../../../../core/components/ui/filter-chip/filter-chip.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { ToggleSwitchComponent } from '../../../../core/components/ui/toggle-switch/toggle-switch.component';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Role definition with label and icon for selection chips.
 */
interface AvailableRoleItem {
  value: string;
  labelKey: string;
  icon: string;
}

/**
 * Modernized dialog modal for creating or updating a staff user account.
 * Conforms to OpenBar Design System using ModalComponent, InputFieldComponent,
 * PasswordInputComponent, FilterChipComponent, and ActionButtonComponent.
 */
@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    InputFieldComponent,
    PasswordInputComponent,
    FilterChipComponent,
    ActionButtonComponent,
    ToggleSwitchComponent,
    TranslocoPipe
  ]
})
export class UserDialogComponent implements OnInit {
  /** User data for edit mode, or null for creation mode. */
  @Input() data: User | null = null;

  /** Reactive form managing user attributes and credentials. */
  userForm: FormGroup;

  /** Available employee roles selectable via chips. */
  readonly availableRoles: AvailableRoleItem[] = [
    { value: 'ADMIN', labelKey: 'SHIFTS.FILTERS.ADMIN', icon: 'shield-checkmark-outline' },
    { value: 'MANAGER', labelKey: 'SHIFTS.FILTERS.MANAGER', icon: 'briefcase-outline' },
    { value: 'SERVEUR', labelKey: 'SHIFTS.FILTERS.SERVEUR', icon: 'restaurant-outline' },
    { value: 'BARMAN', labelKey: 'SHIFTS.FILTERS.BARMAN', icon: 'wine-outline' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly modalCtrl: ModalController
  ) {
    addIcons({
      close,
      personOutline,
      mailOutline,
      lockClosed,
      lockClosedOutline,
      shieldCheckmarkOutline,
      checkmarkCircle,
      personAdd,
      createOutline,
      briefcaseOutline,
      restaurantOutline,
      wineOutline
    });

    this.userForm = this.fb.group(
      {
        username: ['', Validators.required],
        nom: [''],
        prenom: [''],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.minLength(6)]],
        confirmPassword: [''],
        roles: [[], [Validators.required, Validators.minLength(1)]],
        remoteAccessEnabled: [true]
      },
      { validators: [this.passwordMatchValidator] }
    );
  }

  ngOnInit(): void {
    if (this.data) {
      this.userForm.patchValue({
        username: this.data.username,
        nom: this.data.nom || '',
        prenom: this.data.prenom || '',
        email: this.data.email,
        roles: this.data.roles || [],
        remoteAccessEnabled: this.data.remoteAccessEnabled ?? true
      });
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('confirmPassword')?.clearValidators();
    } else {
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.userForm.get('confirmPassword')?.setValidators([Validators.required]);
    }
  }

  /**
   * Validator checking whether password and confirmation fields match.
   */
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (!password && !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Calculates password strength score from 0 (very weak) to 4 (strong).
   */
  get passwordStrengthScore(): number {
    const pwd = this.userForm.get('password')?.value || '';
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  }

  /**
   * Returns transloco translation key for password strength badge.
   */
  get passwordStrengthLabelKey(): string {
    const score = this.passwordStrengthScore;
    switch (score) {
      case 0:
      case 1:
        return 'USERS.PASSWORD_STRENGTH.VERY_WEAK';
      case 2:
        return 'USERS.PASSWORD_STRENGTH.WEAK';
      case 3:
        return 'USERS.PASSWORD_STRENGTH.MEDIUM';
      case 4:
      default:
        return 'USERS.PASSWORD_STRENGTH.STRONG';
    }
  }

  /**
   * Returns CSS modifier class for the password strength bars.
   */
  get passwordStrengthClass(): string {
    const score = this.passwordStrengthScore;
    switch (score) {
      case 0:
      case 1:
        return 'very-weak';
      case 2:
        return 'weak';
      case 3:
        return 'medium';
      case 4:
      default:
        return 'strong';
    }
  }

  /**
   * Checks if a given role is currently assigned in the form.
   */
  isRoleSelected(role: string): boolean {
    const currentRoles: string[] = this.userForm.get('roles')?.value || [];
    return currentRoles.includes(role);
  }

  /**
   * Toggles role membership in the multiselect form control.
   */
  toggleRole(role: string): void {
    const currentRoles: string[] = [...(this.userForm.get('roles')?.value || [])];
    const index = currentRoles.indexOf(role);
    if (index >= 0) {
      currentRoles.splice(index, 1);
    } else {
      currentRoles.push(role);
    }
    this.userForm.get('roles')?.setValue(currentRoles);
    this.userForm.get('roles')?.markAsTouched();
  }

  /**
   * Submits the form data and dismisses the modal with the payload.
   */
  onSubmit(): void {
    if (this.userForm.valid) {
      const formValue = { ...this.userForm.value };
      if (!formValue.password) {
        delete formValue.password;
        delete formValue.confirmPassword;
      } else {
        delete formValue.confirmPassword;
      }
      void this.modalCtrl.dismiss(formValue);
    }
  }

  /**
   * Cancels modal interaction and closes without changes.
   */
  onCancel(): void {
    void this.modalCtrl.dismiss(null);
  }
}
