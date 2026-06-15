import {Component, OnInit, OnDestroy} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatError} from '@angular/material/form-field';
import {NgIf} from '@angular/common';
import {Store} from '@ngrx/store';
import {login} from "../../../core/store/auth.actions";
import {selectAuthError, selectIsAuthenticated} from '../../../core/store/auth.selectors';
import {filter, take, Subscription} from 'rxjs';

// login.component.ts - Version simplifiée
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatFormFieldModule, MatInputModule, MatButtonModule, MatError, NgIf, ReactiveFormsModule]
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private store: Store
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
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
