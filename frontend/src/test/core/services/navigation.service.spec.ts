import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MemoizedSelector } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { NavigationService } from '../../../app/core/services/navigation.service';
import { selectIsAdmin, selectIsAuthenticated } from '../../../app/core/store/auth.selectors';

describe('NavigationService', () => {
  let service: NavigationService;
  let store: MockStore;
  let routerSpy: jasmine.SpyObj<Router>;
  let mockSelectIsAuthenticated: MemoizedSelector<object, boolean>;
  let mockSelectIsAdmin: MemoizedSelector<object, boolean>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        NavigationService,
        provideMockStore(),
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(NavigationService);
    store = TestBed.inject(MockStore);

    mockSelectIsAuthenticated = store.overrideSelector(selectIsAuthenticated, false);
    mockSelectIsAdmin = store.overrideSelector(selectIsAdmin, false);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  // --- navigateToHome ---

  it('navigateToHome_userAuthenticated_navigatesToAppHome', () => {
    mockSelectIsAuthenticated.setResult(true);
    mockSelectIsAdmin.setResult(false);
    store.refreshState();

    service.navigateToHome();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app-home']);
  });

  it('navigateToHome_userNotAuthenticated_navigatesToLogin', () => {
    mockSelectIsAuthenticated.setResult(false);
    store.refreshState();

    service.navigateToHome();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  // --- navigateToLogin ---

  it('navigateToLogin_always_navigatesToAuthLogin', () => {
    service.navigateToLogin();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  // --- navigateToRegister ---

  it('navigateToRegister_always_navigatesToAuthRegister', () => {
    service.navigateToRegister();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/register']);
  });

  // --- navigateToAdmin ---

  it('navigateToAdmin_userIsAdmin_navigatesToAdmin', () => {
    mockSelectIsAdmin.setResult(true);
    store.refreshState();

    service.navigateToAdmin();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('navigateToAdmin_userIsNotAdmin_navigatesToAppHome', () => {
    mockSelectIsAdmin.setResult(false);
    store.refreshState();

    service.navigateToAdmin();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app-home']);
  });

  // --- navigateToUserProfile ---

  it('navigateToUserProfile_userAuthenticated_navigatesToProfile', () => {
    mockSelectIsAuthenticated.setResult(true);
    store.refreshState();

    service.navigateToUserProfile();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('navigateToUserProfile_userNotAuthenticated_navigatesToLogin', () => {
    mockSelectIsAuthenticated.setResult(false);
    store.refreshState();

    service.navigateToUserProfile();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
