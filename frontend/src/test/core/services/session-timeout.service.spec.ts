import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ModalController, ToastController } from '@ionic/angular';
import { of } from 'rxjs';
import { SessionTimeoutService } from '../../../app/core/services/session-timeout.service';
import { AuthService } from '../../../app/core/services/auth.service';
import { selectIsAuthenticated } from '../../../app/core/store/auth.selectors';
import { logout } from '../../../app/core/store/auth.actions';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('SessionTimeoutService', () => {
  let service: SessionTimeoutService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let store: MockStore;
  let mockToast: { present: jasmine.Spy };
  let mockModal: { present: jasmine.Spy; dismiss: jasmine.Spy; onWillDismiss: jasmine.Spy };

  beforeEach(() => {
    localStorage.clear();

    mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    mockModal = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve(true)),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: { action: 'extend' } })),
    };
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout', 'getRefreshToken', 'refreshToken']);
    authServiceSpy.getRefreshToken.and.returnValue('valid-refresh');
    authServiceSpy.refreshToken.and.returnValue(of({ accessToken: 'new-token', refreshToken: 'new-refresh' }));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        SessionTimeoutService,
        provideMockStore({
          selectors: [
            { selector: selectIsAuthenticated, value: true },
          ],
        }),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    });

    service = TestBed.inject(SessionTimeoutService);
    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('startSession stores start and expiry timestamps and starts monitoring', () => {
    const before = Date.now();
    service.startSession(4 * 3600 * 1000);
    const after = Date.now();

    const start = Number(localStorage.getItem(service.SESSION_START_KEY));
    const expiry = Number(localStorage.getItem(service.SESSION_EXPIRY_KEY));

    expect(start).toBeGreaterThanOrEqual(before);
    expect(start).toBeLessThanOrEqual(after);
    expect(expiry).toBeGreaterThanOrEqual(start + 4 * 3600 * 1000);
  });

  it('getRemainingTimeMs returns accurate remaining milliseconds', () => {
    const now = Date.now();
    localStorage.setItem(service.SESSION_EXPIRY_KEY, String(now + 100000));
    const remaining = service.getRemainingTimeMs();
    expect(remaining).toBeGreaterThan(95000);
    expect(remaining).toBeLessThanOrEqual(100000);

    localStorage.removeItem(service.SESSION_EXPIRY_KEY);
    expect(service.getRemainingTimeMs()).toBe(0);
  });

  it('extendSession updates expiration timestamp, calls refreshToken and shows toast', fakeAsync(() => {
    service.startSession(1000);
    const initialExpiry = Number(localStorage.getItem(service.SESSION_EXPIRY_KEY));

    tick(100);
    service.extendSession(4 * 3600 * 1000);
    const newExpiry = Number(localStorage.getItem(service.SESSION_EXPIRY_KEY));

    expect(newExpiry).toBeGreaterThan(initialExpiry);
    expect(authServiceSpy.refreshToken).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('expireSession clears storage, logs out, dispatches action and navigates to login', fakeAsync(() => {
    service.startSession();
    service.expireSession();
    tick();

    expect(localStorage.getItem(service.SESSION_START_KEY)).toBeNull();
    expect(localStorage.getItem(service.SESSION_EXPIRY_KEY)).toBeNull();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalledWith(logout());
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('checkSessionStatus presents warning modal when remaining time <= 5 minutes', fakeAsync(() => {
    const now = Date.now();
    // 4 minutes remaining (240s <= 300s warning threshold)
    localStorage.setItem(service.SESSION_EXPIRY_KEY, String(now + 240 * 1000));

    service.init();
    tick(1000);

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(mockModal.present).toHaveBeenCalled();
  }));

  it('checkSessionStatus automatically expires session when time reaches 0', fakeAsync(() => {
    const now = Date.now();
    localStorage.setItem(service.SESSION_EXPIRY_KEY, String(now - 1000)); // Already expired

    service.init();
    tick(1000);

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalledWith(logout());
  }));
});
