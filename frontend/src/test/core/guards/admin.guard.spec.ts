import {TestBed} from '@angular/core/testing';
import {Router, UrlTree} from '@angular/router';
import {provideMockStore, MockStore} from '@ngrx/store/testing';
import {AdminGuard} from '../../../app/core/guards/admin.guard';
import {selectCurrentUser} from '../../../app/core/store/auth.selectors';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree']);
    router.createUrlTree.and.callFake((commands: unknown[]) => ({commands} as unknown as UrlTree));
    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        provideMockStore(),
        {provide: Router, useValue: router},
      ]
    });
    guard = TestBed.inject(AdminGuard);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => store.resetSelectors());

  it('returns true when user has ADMIN role', (done) => {
    store.overrideSelector(selectCurrentUser, {id: 1, email: '', username: '', roles: ['ADMIN'], enabled: true, createdAt: '', updatedAt: ''});
    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('returns UrlTree to / when user has no ADMIN role', (done) => {
    store.overrideSelector(selectCurrentUser, {id: 1, email: '', username: '', roles: ['MANAGER'], enabled: true, createdAt: '', updatedAt: ''});
    guard.canActivate().subscribe(result => {
      expect(result).not.toBeTrue();
      expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
      done();
    });
  });

  it('returns UrlTree to / when user is null', (done) => {
    store.overrideSelector(selectCurrentUser, null);
    guard.canActivate().subscribe(result => {
      expect(result).not.toBeTrue();
      expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
      done();
    });
  });

  it('returns UrlTree to / when user has only SERVEUR role', (done) => {
    store.overrideSelector(selectCurrentUser, {id: 2, email: '', username: '', roles: ['SERVEUR'], enabled: true, createdAt: '', updatedAt: ''});
    guard.canActivate().subscribe(result => {
      expect(result).not.toBeTrue();
      expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
      done();
    });
  });

  it('returns UrlTree to / when user has only BARMAN role', (done) => {
    store.overrideSelector(selectCurrentUser, {id: 3, email: '', username: '', roles: ['BARMAN'], enabled: true, createdAt: '', updatedAt: ''});
    guard.canActivate().subscribe(result => {
      expect(result).not.toBeTrue();
      expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
      done();
    });
  });

  it('returns true when user has ADMIN among multiple roles', (done) => {
    store.overrideSelector(selectCurrentUser, {id: 4, email: '', username: '', roles: ['MANAGER', 'ADMIN'], enabled: true, createdAt: '', updatedAt: ''});
    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });
});
