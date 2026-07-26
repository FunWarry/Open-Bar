import {Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {User} from '../../../../core/models/user.model';
import { ModalController, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonNote } from '@ionic/angular/standalone';

import {NgIf} from '@angular/common';

@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.css'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonNote,
    ReactiveFormsModule, NgIf
  ],
})
export class UserDialogComponent implements OnInit {
  @Input() data: User | null = null;

  userForm: FormGroup;

  constructor(private readonly fb: FormBuilder,private readonly modalCtrl: ModalController) {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      confirmPassword: [''],
      roles: [[], Validators.required]
    }, {validator: this.passwordMatchValidator});
  }

  ngOnInit(): void {
    if (this.data) {
      this.userForm.patchValue({
        username: this.data.username,
        email: this.data.email,
        roles: this.data.roles
      });
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('confirmPassword')?.clearValidators();
    }
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : {passwordMismatch: true};
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      const formValue = {...this.userForm.value};
      if (!formValue.password) {
        delete formValue.password;
        delete formValue.confirmPassword;
      }
      this.modalCtrl.dismiss(formValue);
    }
  }

  onCancel(): void {
    this.modalCtrl.dismiss(null);
  }
}
