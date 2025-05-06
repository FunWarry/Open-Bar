import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectCurrentUser} from '../../core/store/auth.selectors';
import {User} from '../../core/models/user.model';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatError} from '@angular/material/form-field';
import {MatChip, MatChipsModule} from '@angular/material/chips';
import { NgIf, NgFor, AsyncPipe, DatePipe } from '@angular/common';
@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: true,
  imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatFormFieldModule, MatInputModule, MatButtonModule, MatError, MatChipsModule, NgIf, NgFor, MatChip, AsyncPipe, DatePipe, ReactiveFormsModule]
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentUser$: Observable<User | null>;

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
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
        // Convertir les chaînes de date en objets Date
        const transformedUser = {
          ...user,
          createdAt: user.createdAt ? new Date(user.createdAt) : null,
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
          roles: user.roles.map(role => role.charAt(0).toUpperCase() + role.slice(1))
        };

        this.profileForm.patchValue({
          username: transformedUser.username,
          email: transformedUser.email
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
