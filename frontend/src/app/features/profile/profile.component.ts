import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectCurrentUser} from '../../core/store/auth.selectors';
import {User} from '../../core/models/user.model';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonButton, IonBadge, IonText, IonNote
} from '@ionic/angular/standalone';
import {NgIf, NgFor, AsyncPipe, DatePipe} from '@angular/common';

import { UserAvatarComponent } from '../../core/components/ui/user-avatar/user-avatar.component';
import { InputFieldComponent } from '../../core/components/ui/input-field/input-field.component';
import { PasswordInputComponent } from '../../core/components/ui/password-input/password-input.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { RoleBadgeComponent } from '../../core/components/ui/role-badge/role-badge.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonButton, IonBadge, IonText, IonNote,
    NgIf, NgFor, AsyncPipe, DatePipe, ReactiveFormsModule,
    UserAvatarComponent, InputFieldComponent, PasswordInputComponent, ActionButtonComponent, RoleBadgeComponent
  ]
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentUser$: Observable<User | null>;

  constructor(private readonly fb: FormBuilder,private readonly store: Store) {
    this.currentUser$ = this.store.select(selectCurrentUser);
    this.profileForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      newPassword: ['', [Validators.minLength(6)]],
      confirmPassword: ['']
    }, {validator: this.passwordMatchValidator});
  }

  ngOnInit(): void {
    this.currentUser$.subscribe(user => {
      if (user) {
        this.profileForm.patchValue({
          username: user.username,
          email: user.email
        });
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : {passwordMismatch: true};
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      // TODO: Implémenter la mise à jour du profil
      console.log('Formulaire soumis:', this.profileForm.value);
    }
  }
}
