import {Component, OnInit, OnDestroy, inject} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote} from '@ionic/angular/standalone';
import {NgIf} from '@angular/common';
import {Store} from '@ngrx/store';
import {login} from "../../../core/store/auth.actions";
import {selectAuthError, selectIsAuthenticated} from '../../../core/store/auth.selectors';
import {filter, take, Subscription} from 'rxjs';
import { SetupService } from '../../../core/services/setup.service';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { PasswordInputComponent } from '../../../core/components/ui/password-input/password-input.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, NgIf, ReactiveFormsModule,
    InputFieldComponent, PasswordInputComponent, ActionButtonComponent
  ]
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  private subscriptions: Subscription[] = [];
  private setupService = inject(SetupService);

  constructor(private readonly fb: FormBuilder,private readonly router: Router,private readonly store: Store) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const setupSub = this.setupService.getStatus().subscribe({
      next: (status) => {
        if (!status.initialized) {
          this.router.navigate(['/setup']);
        }
      },
      error: () => {}
    });
    this.subscriptions.push(setupSub);

    // Vérifier si l'utilisateur est déjà authentifié et rediriger si nécessaire
    const authSub = this.store.select(selectIsAuthenticated)
      .pipe(
        take(1),
        filter(isAuth => isAuth)
      )
      .subscribe(() => {
        this.router.navigate(['/app-home']);
      });

    this.subscriptions.push(authSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onSubmit(): void {
    this.errorMessage = null;

    if (this.loginForm.valid) {
      const {username, password} = this.loginForm.value;

      // Dispatch de l'action login
      this.store.dispatch(login({email: username, password}));

      // Observer les erreurs
      const errorSub = this.store.select(selectAuthError)
        .pipe(
          filter(error => error !== null),
          take(1)
        )
        .subscribe(() => {
          this.errorMessage = "Nom d'utilisateur ou mot de passe incorrect.";
        });

      this.subscriptions.push(errorSub);

      // Observer le succès
      const authSub = this.store.select(selectIsAuthenticated)
        .pipe(
          filter(isAuth => isAuth),
          take(1)
        )
        .subscribe(() => {
          this.router.navigate(['/app-home']);
        });

      this.subscriptions.push(authSub);
    }
  }
}
