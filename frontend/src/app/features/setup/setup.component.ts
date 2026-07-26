import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, ToastController } from '@ionic/angular/standalone';
import { SetupService } from '../../core/services/setup.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css'],
  standalone: true,
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonNote,
    NgIf,
    ReactiveFormsModule
  ]
})
export class SetupComponent implements OnInit {
  setupForm: FormGroup;
  errorMessage: string | null = null;
  loading = false;

  constructor(private readonly fb: FormBuilder,private readonly setupService: SetupService,private readonly router: Router,private readonly toastCtrl: ToastController) {
    this.setupForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      nom: ['Admin'],
      prenom: ['Initial'],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    this.setupService.getStatus().subscribe({
      next: (status) => {
        if (status.initialized) {
          this.router.navigate(['/auth/login']);
        }
      },
      error: () => {
        // Ignorer
      }
    });
  }

  onSubmit(): void {
    this.errorMessage = null;

    if (this.setupForm.invalid) {
      return;
    }

    this.loading = true;
    const { username, email, nom, prenom, password } = this.setupForm.value;

    this.setupService.createAdmin({ username, email, nom, prenom, password }).subscribe({
      next: async () => {
        this.loading = false;
        const toast = await this.toastCtrl.create({
          message: 'Compte administrateur créé avec succès ! Connectez-vous maintenant.',
          duration: 4000,
          color: 'success'
        });
        await toast.present();
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Erreur lors de la création du compte administrateur.';
      }
    });
  }
}
