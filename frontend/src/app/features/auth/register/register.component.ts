import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Store} from '@ngrx/store';
import * as AuthActions from '../../../core/store/auth.actions';
import {IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption} from '@ionic/angular/standalone';
import {NgFor, NgIf} from '@angular/common';

import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { PasswordInputComponent } from '../../../core/components/ui/password-input/password-input.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonNote,
    IonSelect,
    IonSelectOption,
    ReactiveFormsModule,
    NgIf,
    NgFor,
    InputFieldComponent,
    PasswordInputComponent,
    ActionButtonComponent
  ]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  roles = ['ADMIN', 'MANAGER', 'SERVEUR', 'BARMAN'];

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
    this.registerForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required]
    });
  }

  ngOnInit(): void {
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.store.dispatch(AuthActions.register({userData: this.registerForm.value}));
    }
  }
}
