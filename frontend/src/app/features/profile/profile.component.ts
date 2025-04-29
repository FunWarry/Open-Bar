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
  template: `
    <div class="profile-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Mon Profil</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Nom d'utilisateur</mat-label>
                <input matInput formControlName="username" required>
                <mat-error *ngIf="profileForm.get('username')?.hasError('required')">
                  Le nom d'utilisateur est requis
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email" required>
                <mat-error *ngIf="profileForm.get('email')?.hasError('required')">
                  L'email est requis
                </mat-error>
                <mat-error *ngIf="profileForm.get('email')?.hasError('email')">
                  Format d'email invalide
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Nouveau mot de passe</mat-label>
                <input matInput formControlName="newPassword" type="password">
                <mat-error *ngIf="profileForm.get('newPassword')?.hasError('minlength')">
                  Le mot de passe doit contenir au moins 6 caractères
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Confirmer le mot de passe</mat-label>
                <input matInput formControlName="confirmPassword" type="password">
                <mat-error *ngIf="profileForm.hasError('passwordMismatch')">
                  Les mots de passe ne correspondent pas
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit" [disabled]="profileForm.invalid">
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card class="info-card">
        <mat-card-header>
          <mat-card-title>Informations du compte</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="info-item">
            <span class="label">Rôles :</span>
            <span class="value">
              <mat-chip-set>
                <mat-chip *ngFor="let role of (currentUser$ | async)?.roles">
                  {{ role }}
                </mat-chip>
              </mat-chip-set>
            </span>
          </div>
          <div class="info-item">
            <span class="label">Compte créé le :</span>
            <span class="value">{{ (currentUser$ | async)?.createdAt | date:'longDate' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Dernière modification :</span>
            <span class="value">{{ (currentUser$ | async)?.updatedAt | date:'longDate' }}</span>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .info-card {
      margin-top: 20px;
    }

    .info-item {
      display: flex;
      margin-bottom: 16px;
      align-items: center;
    }

    .label {
      font-weight: 500;
      width: 200px;
    }

    .value {
      flex: 1;
    }

    mat-form-field {
      width: 100%;
    }
  `],
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
