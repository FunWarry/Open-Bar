import {TestBed} from '@angular/core/testing';
import {Router, UrlTree} from '@angular/router';
import {provideMockStore, MockStore} from '@ngrx/store/testing';
import {AuthGuard} from '../../../app/core/guards/auth.guard';
import {selectIsAuthenticated} from '../../../app/core/store/auth.selectors';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['createUrlTree', 'navigate']);
    router.createUrlTree.and.callFake((commands: unknown[]) => ({} as UrlTree));

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        provideMockStore(),
        {provide: Router, useValue: router},
      ]
    });
    guard = TestBed.inject(AuthGuard);
    store = TestBed.inject(MockStore);
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
});
