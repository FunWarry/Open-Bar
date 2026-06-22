import {TestBed} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Observable, of, throwError} from 'rxjs';
import {Action} from '@ngrx/store';
import {AuthEffects} from '../../../app/core/store/auth.effects';
import * as AuthActions from '../../../app/core/store/auth.actions';
import {AuthService} from '../../../app/core/services/auth.service';
import {NavigationService} from '../../../app/core/services/navigation.service';
import {AuthResponse} from '../../../app/core/models/auth-response.model';

describe('AuthEffects', () => {
  let effects: AuthEffects;
  let actions$: Observable<Action>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let navigationServiceSpy: jasmine.SpyObj<NavigationService>;

  const mockAuthResponse: AuthResponse = {
    id: 1,
    email: 'test@bar.com',
    username: 'testuser',
    roles: ['SERVEUR'],
    enabled: true,
    token: 'jwt-token-abc',
    refreshToken: 'refresh-token-xyz',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z'
  };

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'logout']);
    navigationServiceSpy = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigateToLogin']);

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        {provide: AuthService, useValue: authServiceSpy},
        {provide: NavigationService, useValue: navigationServiceSpy}
      ]
    });

    effects = TestBed.inject(AuthEffects);
  });

  // ─── login$ ───────────────────────────────────────────────────────────────

  describe('login$', () => {
    it('login_success_dispatches_loginSuccess', (done) => {
      authServiceSpy.login.and.returnValue(of(mockAuthResponse));
      actions$ = of(AuthActions.login({email: 'test@bar.com', password: 'secret'}));

      effects.login$.subscribe(action => {
        expect(action.type).toBe(AuthActions.loginSuccess.type);
        const success = action as ReturnType<typeof AuthActions.loginSuccess>;
        expect(success.token).toBe('jwt-token-abc');
        expect(success.user.email).toBe('test@bar.com');
        expect(success.user.username).toBe('testuser');
        expect(success.user.roles).toEqual(['SERVEUR']);
        done();
      });
    });

    it('login_success_maps_dates_to_Date_objects', (done) => {
      authServiceSpy.login.and.returnValue(of(mockAuthResponse));
      actions$ = of(AuthActions.login({email: 'test@bar.com', password: 'secret'}));

      effects.login$.subscribe(action => {
        const success = action as ReturnType<typeof AuthActions.loginSuccess>;
        expect(success.user.createdAt).toBeInstanceOf(Date);
        expect(success.user.updatedAt).toBeInstanceOf(Date);
        done();
      });
    });

    it('login_failure_dispatches_loginFailure', (done) => {
      const error = new Error('Identifiants invalides');
      authServiceSpy.login.and.returnValue(throwError(() => error));
      actions$ = of(AuthActions.login({email: 'wrong@bar.com', password: 'bad'}));

      effects.login$.subscribe(action => {
        expect(action.type).toBe(AuthActions.loginFailure.type);
        const failure = action as ReturnType<typeof AuthActions.loginFailure>;
        expect(failure.error).toBe('Identifiants invalides');
        done();
      });
    });

    it('login_failure_network_error_dispatches_loginFailure', (done) => {
      const networkError = new Error('Network Error');
      authServiceSpy.login.and.returnValue(throwError(() => networkError));
      actions$ = of(AuthActions.login({email: 'test@bar.com', password: 'pass'}));

      effects.login$.subscribe(action => {
        expect(action.type).toBe(AuthActions.loginFailure.type);
        const failure = action as ReturnType<typeof AuthActions.loginFailure>;
        expect(failure.error).toBe('Network Error');
        done();
      });
    });

    it('login_calls_authService_with_provided_credentials', (done) => {
      authServiceSpy.login.and.returnValue(of(mockAuthResponse));
      actions$ = of(AuthActions.login({email: 'barman@bar.com', password: 'mypass'}));

      effects.login$.subscribe(() => {
        expect(authServiceSpy.login).toHaveBeenCalledOnceWith('barman@bar.com', 'mypass');
        done();
      });
    });

    it('login_success_maps_all_user_fields_from_response', (done) => {
      const adminResponse: AuthResponse = {
        ...mockAuthResponse,
        id: 42,
        roles: ['ADMIN'],
        enabled: false
      };
      authServiceSpy.login.and.returnValue(of(adminResponse));
      actions$ = of(AuthActions.login({email: 'admin@bar.com', password: 'admin'}));

      effects.login$.subscribe(action => {
        const success = action as ReturnType<typeof AuthActions.loginSuccess>;
        expect(success.user.id).toBe(42);
        expect(success.user.roles).toEqual(['ADMIN']);
        expect(success.user.enabled).toBeFalse();
        done();
      });
    });
  });

  // ─── logout$ ──────────────────────────────────────────────────────────────

  describe('logout$', () => {
    it('logout_dispatches_logoutSuccess', (done) => {
      actions$ = of(AuthActions.logout());

      effects.logout$.subscribe(action => {
        expect(action.type).toBe(AuthActions.logoutSuccess.type);
        done();
      });
    });

    it('logout_calls_authService_logout', (done) => {
      actions$ = of(AuthActions.logout());

      effects.logout$.subscribe(() => {
        expect(authServiceSpy.logout).toHaveBeenCalledOnce();
        done();
      });
    });

    it('logout_schedules_navigateToLogin_via_setTimeout', (done) => {
      jasmine.clock().install();
      actions$ = of(AuthActions.logout());

      effects.logout$.subscribe(() => {
        expect(navigationServiceSpy.navigateToLogin).not.toHaveBeenCalled();

        jasmine.clock().tick(300);
        expect(navigationServiceSpy.navigateToLogin).toHaveBeenCalledOnce();

        jasmine.clock().uninstall();
        done();
      });
    });

    it('logout_does_not_navigate_before_300ms', (done) => {
      jasmine.clock().install();
      actions$ = of(AuthActions.logout());

      effects.logout$.subscribe(() => {
        jasmine.clock().tick(299);
        expect(navigationServiceSpy.navigateToLogin).not.toHaveBeenCalled();

        jasmine.clock().uninstall();
        done();
      });
    });
  });
});
