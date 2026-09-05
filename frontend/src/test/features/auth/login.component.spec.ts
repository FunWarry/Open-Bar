import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { of, BehaviorSubject } from 'rxjs';
import { LoginComponent } from '../../../app/features/auth/login/login.component';
import { login } from '../../../app/core/store/auth.actions';
import { selectAuthError, selectIsAuthenticated, selectCurrentUser } from '../../../app/core/store/auth.selectors';
import { SetupService } from '../../../app/core/services/setup.service';
import { OnboardingService } from '../../../app/core/services/onboarding.service';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { addIcons } from 'ionicons';
import { lockClosed, mailOutline } from 'ionicons/icons';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let mockStore: jasmine.SpyObj<Store>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockSetupService: jasmine.SpyObj<SetupService>;
  let mockOnboardingService: jasmine.SpyObj<OnboardingService>;

  let isAuthenticatedSubject: BehaviorSubject<boolean>;
  let authErrorSubject: BehaviorSubject<string | null>;

  beforeEach(async () => {
    addIcons({ lockClosed, mailOutline });
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    authErrorSubject = new BehaviorSubject<string | null>(null);

    mockStore = jasmine.createSpyObj('Store', ['dispatch', 'select']);
    mockStore.select.and.callFake((selector: unknown) => {
      if (selector === selectAuthError) return authErrorSubject.asObservable();
      if (selector === selectCurrentUser) return of({ id: 1, roles: ['ROLE_ADMIN'] } as any);
      return isAuthenticatedSubject.asObservable();
    });

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockSetupService = jasmine.createSpyObj('SetupService', ['getStatus']);
    mockSetupService.getStatus.and.returnValue(of({ initialized: true, userCount: 1 }));

    mockOnboardingService = jasmine.createSpyObj('OnboardingService', ['isCompleted', 'resetOnboarding']);
    mockOnboardingService.isCompleted.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        ReactiveFormsModule,
        HttpClientTestingModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: Store, useValue: mockStore },
        { provide: Router, useValue: mockRouter },
        { provide: SetupService, useValue: mockSetupService },
        { provide: OnboardingService, useValue: mockOnboardingService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (component) {
      component.ngOnDestroy();
    }
  });

  // ─── Creation ────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Formulaire ──────────────────────────────────────────────────────────────

  it('loginForm est invalide when fields are empty', () => {
    expect(component.loginForm.valid).toBeFalse();
  });

  it('loginForm is valid when username and password are provided', () => {
    component.loginForm.setValue({ username: 'admin', password: 'secret' });
    expect(component.loginForm.valid).toBeTrue();
  });

  it('errorMessage is null at initialization', () => {
    expect(component.errorMessage).toBeNull();
  });

  it('ngOnInit redirects to /app-home if user is already authenticated', fakeAsync(() => {
    isAuthenticatedSubject.next(true);
    component.ngOnInit();
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/app-home']);
  }));

  it('ngOnInit redirects to /setup if application is not yet initialized', fakeAsync(() => {
    mockSetupService.getStatus.and.returnValue(of({ initialized: false, userCount: 0 }));
    component.ngOnInit();
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/setup']);
  }));

  it('ngOnInit does not redirect if user is not authenticated and app is initialized', fakeAsync(() => {
    mockSetupService.getStatus.and.returnValue(of({ initialized: true, userCount: 1 }));
    isAuthenticatedSubject.next(false);
    component.ngOnInit();
    tick();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  // ─── onSubmit : formulaire invalide ──────────────────────────────────────────

  it('onSubmit ne dispatche pas l\'action si le formulaire est invalide', () => {
    component.loginForm.setValue({ username: '', password: '' });
    component.onSubmit();
    expect(mockStore.dispatch).not.toHaveBeenCalled();
  });

  // ─── onSubmit : formulaire valide ────────────────────────────────────────────

  it('onSubmit dispatche l\'action login avec les credentials saisis', () => {
    component.loginForm.setValue({ username: 'barman', password: 'pass123' });
    component.onSubmit();
    expect(mockStore.dispatch).toHaveBeenCalledWith(
      login({ email: 'barman', password: 'pass123' })
    );
  });

  it('onSubmit resets errorMessage to null before dispatch', () => {
    component.errorMessage = 'Previous error';
    component.loginForm.setValue({ username: 'barman', password: 'pass123' });
    component.onSubmit();
    expect(component.errorMessage).toBeNull();
  });

  // ─── Cas d'erreur : store retourne une erreur d'auth ─────────────────────────

  it('onSubmit affiche un message d\'erreur quand le store remonte une erreur', fakeAsync(() => {
    // Simuler un retour d'erreur depuis le store pour selectAuthError
    mockStore.select.and.callFake((selector: unknown) => {
      if (selector === selectAuthError) return of('Unauthorized');
      return of(false);
    });

    component.loginForm.setValue({ username: 'wrong', password: 'wrong' });
    component.onSubmit();
    tick();

    expect(component.errorMessage).toBe("Nom d'utilisateur ou mot de passe incorrect.");
  }));

  // ─── Auth success: redirection after login ──────────────────────────────────

  it('onSubmit redirects to /app-home when authentication succeeds', fakeAsync(() => {
    mockStore.select.and.callFake((selector: unknown) => {
      if (selector === selectAuthError) return of(null);
      if (selector === selectCurrentUser) return of({ id: 1, roles: ['ROLE_ADMIN'] } as any);
      return of(true);
    });

    component.loginForm.setValue({ username: 'admin', password: 'secret' });
    component.onSubmit();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/app-home']);
  }));

  it('onSubmit redirects to /onboarding when user onboarding is not completed', fakeAsync(() => {
    mockStore.select.and.callFake((selector: unknown) => {
      if (selector === selectAuthError) return of(null);
      if (selector === selectCurrentUser) return of({ id: 2, roles: ['ROLE_SERVEUR'] } as any);
      return of(true);
    });
    mockOnboardingService.isCompleted.and.returnValue(false);

    component.loginForm.setValue({ username: 'serveur', password: 'secret' });
    component.onSubmit();
    tick();

    expect(mockOnboardingService.isCompleted).toHaveBeenCalledWith('2');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/onboarding']);
  }));

  it('navigateAfterLogin handles user without id falling back to first role or CLIENT', fakeAsync(() => {
    mockStore.select.and.callFake((selector: unknown) => {
      if (selector === selectAuthError) return of(null);
      if (selector === selectCurrentUser) return of({ roles: ['BARMAN'] } as any);
      return of(true);
    });
    mockOnboardingService.isCompleted.and.returnValue(false);

    component.loginForm.setValue({ username: 'barman', password: 'secret' });
    component.onSubmit();
    tick();

    expect(mockOnboardingService.isCompleted).toHaveBeenCalledWith('BARMAN');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/onboarding']);
  }));

  // ─── ngOnDestroy ─────────────────────────────────────────────────────────────

  it('ngOnDestroy unsubs all subscriptions without error', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
