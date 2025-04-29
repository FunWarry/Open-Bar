import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {User} from '../../../../core/models/user.model';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatError} from '@angular/material/form-field';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-user-dialog',
  template: `
    <h2 mat-dialog-title>{{ data ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur' }}</h2>
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Nom d'utilisateur</mat-label>
            <input matInput formControlName="username" required>
            <mat-error *ngIf="userForm.get('username')?.hasError('required')">
              Le nom d'utilisateur est requis
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" required>
            <mat-error *ngIf="userForm.get('email')?.hasError('required')">
              L'email est requis
            </mat-error>
            <mat-error *ngIf="userForm.get('email')?.hasError('email')">
              Format d'email invalide
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Mot de passe</mat-label>
            <input matInput formControlName="password" type="password" [required]="!data">
            <mat-error *ngIf="userForm.get('password')?.hasError('required')">
              Le mot de passe est requis
            </mat-error>
            <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
              Le mot de passe doit contenir au moins 6 caractères
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Confirmer le mot de passe</mat-label>
            <input matInput formControlName="confirmPassword" type="password" [required]="!data">
            <mat-error *ngIf="userForm.hasError('passwordMismatch')">
              Les mots de passe ne correspondent pas
            </mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Rôles</mat-label>
          <mat-select formControlName="roles" multiple required>
            <mat-option value="USER">Utilisateur</mat-option>
            <mat-option value="ADMIN">Administrateur</mat-option>
          </mat-select>
          <mat-error *ngIf="userForm.get('roles')?.hasError('required')">
            Au moins un rôle est requis
          </mat-error>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Annuler</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="userForm.invalid">
          {{ data ? 'Modifier' : 'Créer' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      width: 100%;
    }
  `],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatError, ReactiveFormsModule, NgIf]
})
export class UserDialogComponent implements OnInit {
  userForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User | null
  ) {
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
      // Le mot de passe n'est pas requis pour l'édition
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('confirmPassword')?.clearValidators();
    }
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : {passwordMismatch: true};
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      const formValue = this.userForm.value;
      if (!formValue.password) {
        delete formValue.password;
        delete formValue.confirmPassword;
      }
      this.dialogRef.close(formValue);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
