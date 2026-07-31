import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../../../core/models/user.model';
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  personOutline,
  mailOutline,
  lockClosedOutline,
  shieldCheckmarkOutline,
  checkbox,
  squareOutline,
  checkmarkCircle,
  personAdd
} from 'ionicons/icons';
import { InputFieldComponent } from '../../../../core/components/ui/input-field/input-field.component';

@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.css'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    InputFieldComponent,
    ReactiveFormsModule
  ]
})
export class UserDialogComponent implements OnInit {
  @Input() data: User | null = null;

  userForm: FormGroup;

  readonly availableRoles = [
    { value: 'ADMIN', label: 'Administrateur' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'SERVEUR', label: 'Serveur' },
    { value: 'BARMAN', label: 'Barman' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly modalCtrl: ModalController
  ) {
    addIcons({
      close,
      personOutline,
      mailOutline,
      lockClosedOutline,
      shieldCheckmarkOutline,
      checkbox,
      squareOutline,
      checkmarkCircle,
      personAdd
    });

    this.userForm = this.fb.group(
      {
        username: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.minLength(6)]],
        confirmPassword: [''],
        roles: [[], [Validators.required, Validators.minLength(1)]]
      },
      { validators: [this.passwordMatchValidator] }
    );
  }

  ngOnInit(): void {
    if (this.data) {
      this.userForm.patchValue({
        username: this.data.username,
        email: this.data.email,
        roles: this.data.roles || []
      });
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('confirmPassword')?.clearValidators();
    } else {
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.userForm.get('confirmPassword')?.setValidators([Validators.required]);
    }
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    if (!password && !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  isRoleSelected(role: string): boolean {
    const currentRoles: string[] = this.userForm.get('roles')?.value || [];
    return currentRoles.includes(role);
  }

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

  onSubmit(): void {
    if (this.userForm.valid) {
      const formValue = { ...this.userForm.value };
      if (!formValue.password) {
        delete formValue.password;
        delete formValue.confirmPassword;
      } else {
        delete formValue.confirmPassword;
      }
      this.modalCtrl.dismiss(formValue);
    }
  }

  onCancel(): void {
    this.modalCtrl.dismiss(null);
  }
}
