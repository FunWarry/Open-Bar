import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {provideMockStore, MockStore} from '@ngrx/store/testing';
import {ActivatedRouteSnapshot} from '@angular/router';
import {RoleGuard} from './role.guard';
import {selectCurrentUser} from '../store/auth.selectors';

function makeRoute(roles?: string[]): ActivatedRouteSnapshot {
  return {data: roles ? {roles} : {}, url: []} as unknown as ActivatedRouteSnapshot;
}

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        RoleGuard,
        provideMockStore(),
        {provide: Router, useValue: router},
      ]
    });
    guard = TestBed.inject(RoleGuard);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => store.resetSelectors());

  it('redirects and returns false when data.roles is absent', (done) => {
    store.overrideSelector(selectCurrentUser, {id: 1, email: '', username: '', roles: ['MANAGER'], enabled: true, createdAt: '', updatedAt: ''});
    guard.canActivate(makeRoute()).subscribe(result => {
      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      done();
    });
  });

  it('returns true when user has a matching role', (done) => {
    store.overrideSelector(selectCurrentUser, {id: 1, email: '', username: '', roles: ['MANAGER'], enabled: true, createdAt: '', updatedAt: ''});
    guard.canActivate(makeRoute(['MANAGER', 'ADMIN'])).subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('redirects when user does not have the required role', (done) => {
    store.overrideSelector(selectCurrentUser, {id: 1, email: '', username: '', roles: ['SERVEUR'], enabled: true, createdAt: '', updatedAt: ''});
    guard.canActivate(makeRoute(['ADMIN'])).subscribe(result => {
      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      done();
    });
  });

  it('redirects when user is null', (done) => {
    store.overrideSelector(selectCurrentUser, null);
    guard.canActivate(makeRoute(['MANAGER'])).subscribe(result => {
      expect(result).toBeFalse();
      done();
    });
  });

  it('returns true for ADMIN on admin-only route', (done) => {
    store.overrideSelector(selectCurrentUser, {id: 1, email: '', username: '', roles: ['ADMIN'], enabled: true, createdAt: '', updatedAt: ''});
    guard.canActivate(makeRoute(['ADMIN'])).subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });
});
