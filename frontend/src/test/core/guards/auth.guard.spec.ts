import {TestBed} from '@angular/core/testing';
import {Router, UrlTree} from '@angular/router';
import {provideMockStore, MockStore} from '@ngrx/store/testing';
import {of, throwError} from 'rxjs';
import {AuthGuard} from '../../../app/core/guards/auth.guard';
import {selectIsAuthenticated} from '../../../app/core/store/auth.selectors';
import {SetupService, SetupStatus} from '../../../app/core/services/setup.service';
import {AuthService} from '../../../app/core/services/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;
  let setupServiceSpy: jasmine.SpyObj<SetupService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  function createValidJwt(): string {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'test', exp: futureExp }));
    return `${header}.${payload}.signature`;
  }

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['createUrlTree', 'navigate']);
    router.createUrlTree.and.callFake((commands: unknown[]) => ({} as UrlTree));

    setupServiceSpy = jasmine.createSpyObj('SetupService', ['getStatus']);
    setupServiceSpy.getStatus.and.returnValue(of({ initialized: true, userCount: 1 }));

    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout', 'getToken', 'getRefreshToken', 'refreshToken', 'getStoredUser']);
    authServiceSpy.getToken.and.returnValue(createValidJwt());
    authServiceSpy.getRefreshToken.and.returnValue(null);
    authServiceSpy.refreshToken.and.returnValue(of({ accessToken: createValidJwt(), refreshToken: 'fresh-refresh' }));
    authServiceSpy.getStoredUser.and.returnValue({ id: 1, username: 'test', roles: ['ADMIN'] } as any);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        provideMockStore(),
        {provide: Router, useValue: router},
        {provide: SetupService, useValue: setupServiceSpy},
        {provide: AuthService, useValue: authServiceSpy},
      ]
    });
    guard = TestBed.inject(AuthGuard);
    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
  });

  afterEach(() => store.resetSelectors());

  it('returns true when user is authenticated', (done) => {
    store.overrideSelector(selectIsAuthenticated, true);
    store.refreshState();

    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      expect(router.createUrlTree).not.toHaveBeenCalled();
      done();
    });
  });

  it('returns a UrlTree redirecting to /auth/login when user is not authenticated', (done) => {
    authServiceSpy.getToken.and.returnValue(null);
    store.overrideSelector(selectIsAuthenticated, false);
    store.refreshState();

    guard.canActivate().subscribe(result => {
      expect(result).not.toBeTrue();
      expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
      done();
    });
  });

  it('emits only one value and completes (take(1) behaviour)', (done) => {
    store.overrideSelector(selectIsAuthenticated, true);
    store.refreshState();

    let emitCount = 0;
    guard.canActivate().subscribe({
      next: () => emitCount++,
      complete: () => {
        expect(emitCount).toBe(1);
        done();
      }
    });
  });

  it('returns UrlTree (not boolean false) when unauthenticated', (done) => {
    authServiceSpy.getToken.and.returnValue(null);
    const fakeUrlTree = {toString: () => '/auth/login'} as unknown as UrlTree;
    router.createUrlTree.and.returnValue(fakeUrlTree);
    store.overrideSelector(selectIsAuthenticated, false);
    store.refreshState();

    guard.canActivate().subscribe(result => {
      expect(result).toBe(fakeUrlTree);
      done();
    });
  });

  it('returns true when token changes from absent to present', (done) => {
    store.overrideSelector(selectIsAuthenticated, true);
    store.refreshState();

    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('redirects to /setup and logs out when system is not initialized', (done) => {
    setupServiceSpy.getStatus.and.returnValue(of({ initialized: false, userCount: 0 }));
    const setupUrlTree = { toString: () => '/setup' } as unknown as UrlTree;
    router.createUrlTree.and.callFake((commands: unknown[]) => {
      if (Array.isArray(commands) && commands[0] === '/setup') {
        return setupUrlTree;
      }
      return {} as UrlTree;
    });

    guard.canActivate().subscribe(result => {
      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(result).toBe(setupUrlTree);
      done();
    });
  });

  it('falls back to auth check when setup check fails with error', (done) => {
    setupServiceSpy.getStatus.and.returnValue(throwError(() => new Error('Network error')));
    store.overrideSelector(selectIsAuthenticated, true);
    store.refreshState();

    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('falls back to auth check and redirects to login when setup check fails and user is unauthenticated', (done) => {
    setupServiceSpy.getStatus.and.returnValue(throwError(() => new Error('Network error')));
    authServiceSpy.getToken.and.returnValue(null);
    store.overrideSelector(selectIsAuthenticated, false);
    store.refreshState();

    const loginUrlTree = { toString: () => '/auth/login' } as unknown as UrlTree;
    router.createUrlTree.and.callFake((commands: unknown[]) => {
      if (Array.isArray(commands) && commands[0] === '/auth/login') {
        return loginUrlTree;
      }
      return {} as UrlTree;
    });

    guard.canActivate().subscribe(result => {
      expect(result).toBe(loginUrlTree);
      done();
    });
  });

  it('redirects to /auth/login and cleans session when token is expired and no refresh token exists', (done) => {
    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'test', exp: expiredExp }));
    const expiredToken = `${header}.${payload}.mockSignature`;

    authServiceSpy.getToken.and.returnValue(expiredToken);
    authServiceSpy.getRefreshToken.and.returnValue(null);
    store.overrideSelector(selectIsAuthenticated, true);
    store.refreshState();

    const loginUrlTree = { toString: () => '/auth/login' } as unknown as UrlTree;
    router.createUrlTree.and.callFake((commands: unknown[]) => {
      if (Array.isArray(commands) && commands[0] === '/auth/login') {
        return loginUrlTree;
      }
      return {} as UrlTree;
    });

    guard.canActivate().subscribe(result => {
      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalled();
      expect(result).toBe(loginUrlTree);
      done();
    });
  });

  it('proactively refreshes token and returns true when token is expired and refresh token is valid', (done) => {
    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'test', exp: expiredExp }));
    const expiredToken = `${header}.${payload}.mockSignature`;

    authServiceSpy.getToken.and.returnValue(expiredToken);
    authServiceSpy.getRefreshToken.and.returnValue('valid-refresh-token');
    authServiceSpy.refreshToken.and.returnValue(of({ accessToken: createValidJwt(), refreshToken: 'new-refresh' }));

    guard.canActivate().subscribe(result => {
      expect(authServiceSpy.refreshToken).toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalled();
      expect(result).toBeTrue();
      done();
    });
  });

  it('redirects to login when token is expired and proactive refresh fails', (done) => {
    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'test', exp: expiredExp }));
    const expiredToken = `${header}.${payload}.mockSignature`;

    authServiceSpy.getToken.and.returnValue(expiredToken);
    authServiceSpy.getRefreshToken.and.returnValue('bad-refresh-token');
    authServiceSpy.refreshToken.and.returnValue(throwError(() => new Error('Refresh failed')));

    const loginUrlTree = { toString: () => '/auth/login' } as unknown as UrlTree;
    router.createUrlTree.and.callFake((commands: unknown[]) => {
      if (Array.isArray(commands) && commands[0] === '/auth/login') {
        return loginUrlTree;
      }
      return {} as UrlTree;
    });

    guard.canActivate().subscribe(result => {
      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalled();
      expect(result).toBe(loginUrlTree);
      done();
    });
  });

  it('redirects to login when 4-hour session has expired', (done) => {
    localStorage.setItem('auth_session_expiry', String(Date.now() - 5000)); // expired 5s ago

    const loginUrlTree = { toString: () => '/auth/login' } as unknown as UrlTree;
    router.createUrlTree.and.callFake((commands: unknown[]) => {
      if (Array.isArray(commands) && commands[0] === '/auth/login') {
        return loginUrlTree;
      }
      return {} as UrlTree;
    });

    guard.canActivate().subscribe(result => {
      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalled();
      expect(result).toBe(loginUrlTree);
      localStorage.removeItem('auth_session_expiry');
      done();
    });
  });
});
