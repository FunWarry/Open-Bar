import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
  withXhr
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { MemoizedSelector } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { authInterceptor } from '../../../app/core/interceptors/auth.interceptor';
import { AuthService } from '../../../app/core/services/auth.service';
import { NavigationService } from '../../../app/core/services/navigation.service';
import { selectAuthToken } from '../../../app/core/store/auth.selectors';
import { logout } from '../../../app/core/store/auth.actions';
import { environment } from '../../../environments/environment';
import { of, throwError, Subject } from 'rxjs';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let store: MockStore;
  let authService: jasmine.SpyObj<AuthService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let mockSelectAuthToken: MemoizedSelector<object, string | null>;

  const apiUrl = `${environment.apiUrl}/commandes`;
  const authApiUrl = `${environment.apiUrl}/auth/refresh`;

  function setup(token: string | null = null, refreshToken: string | null = null) {
    authService = jasmine.createSpyObj('AuthService', [
      'getToken',
      'getRefreshToken',
      'storeTokens',
      'logout',
      'refreshToken',
      'getStoredUser'
    ]);
    authService.getToken.and.returnValue(token);
    authService.getStoredUser.and.returnValue(null);
    authService.getRefreshToken.and.returnValue(refreshToken);
    authService.refreshToken.and.returnValue(of({ accessToken: 'mock-new-access-token', refreshToken: 'mock-new-refresh-token' }));

    navigationService = jasmine.createSpyObj('NavigationService', ['navigateToLogin']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideMockStore({ initialState: { auth: { token, user: null, error: null } } }),
        { provide: AuthService, useValue: authService },
        { provide: NavigationService, useValue: navigationService }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(MockStore);

    mockSelectAuthToken = store.overrideSelector(selectAuthToken, token);
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  // ─── Authorization Header Injection ───────────────────────────────────────────

  it('adds Authorization header when an access token is present in the store', () => {
    const mockAccessToken = 'mock-access-token';
    setup(mockAccessToken);

    httpClient.get(apiUrl).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockAccessToken}`);
    req.flush([]);
  });

  it('does not add Authorization header when no token is present in the store', () => {
    setup(null);

    httpClient.get(apiUrl).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  // ─── No interference on auth routes ──────────────────────────────────

  it('passes through 401 errors on auth routes without attempting token refresh', () => {
    setup('mock-token', null);

    let errorCaught: HttpErrorResponse | undefined;
    httpClient.post(`${environment.apiUrl}/api/auth/login`, {}).subscribe({
      error: (err: HttpErrorResponse) => { errorCaught = err; }
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(errorCaught).toBeDefined();
    expect(errorCaught!.status).toBe(401);
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  it('passes through 401 errors for anonymous requests without token without attempting refresh or logout', () => {
    setup(null, null);
    spyOn(store, 'dispatch');

    let errorCaught: HttpErrorResponse | undefined;
    httpClient.get(apiUrl).subscribe({
      error: (err: HttpErrorResponse) => { errorCaught = err; }
    });

    const req = httpMock.expectOne(apiUrl);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(errorCaught).toBeDefined();
    expect(errorCaught!.status).toBe(401);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  // ─── Refresh token: nominal flow ────────────────────────────────────────────

  it('refreshes token and replays original request on 401 when refresh token is available', () => {
    const expiredToken = 'mock-expired-token';
    const validRefreshToken = 'mock-valid-refresh-token';
    const newAccessToken = 'mock-new-access-token';
    const newRefreshToken = 'mock-new-refresh-token';

    setup(expiredToken, validRefreshToken);
    authService.refreshToken.and.returnValue(of({ accessToken: newAccessToken, refreshToken: newRefreshToken }));

    let responseData: unknown;
    httpClient.get(apiUrl).subscribe(data => { responseData = data; });

    // 1) Original request — responds 401
    const originalReq = httpMock.expectOne(apiUrl);
    expect(originalReq.request.headers.get('Authorization')).toBe(`Bearer ${expiredToken}`);
    originalReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // 2) Original request replayed with new token
    const replayedReq = httpMock.expectOne(apiUrl);
    expect(replayedReq.request.headers.get('Authorization')).toBe(`Bearer ${newAccessToken}`);
    replayedReq.flush([{ id: 1 }]);

    expect(authService.refreshToken).toHaveBeenCalled();
    expect(responseData).toEqual([{ id: 1 }]);
  });

  // ─── Refresh token: no refresh token stored -> logout ───────────────────

  it('dispatches logout and propagates error when no refresh token is available on 401', () => {
    setup('mock-expired-token', null);
    spyOn(store, 'dispatch');

    let errorCaught: Error | undefined;
    httpClient.get(apiUrl).subscribe({
      error: (err: Error) => { errorCaught = err; }
    });

    const req = httpMock.expectOne(apiUrl);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(store.dispatch).toHaveBeenCalledWith(logout());
    expect(authService.logout).toHaveBeenCalled();
    expect(navigationService.navigateToLogin).toHaveBeenCalled();
    expect(errorCaught).toBeDefined();
    expect(errorCaught!.message).toBe('No refresh token available');
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  // ─── Refresh token: refresh failure -> logout ───────────────────────────────

  it('dispatches logout, clears storage, navigates to login, and propagates error when refresh endpoint responds 401', () => {
    setup('mock-expired-token', 'mock-bad-refresh-token');
    authService.refreshToken.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })));
    spyOn(store, 'dispatch');

    let errorCaught: HttpErrorResponse | undefined;
    httpClient.get(apiUrl).subscribe({
      error: (err: HttpErrorResponse) => { errorCaught = err; }
    });

    // 1) Original request -> 401
    const originalReq = httpMock.expectOne(apiUrl);
    originalReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(store.dispatch).toHaveBeenCalledWith(logout());
    expect(authService.logout).toHaveBeenCalled();
    expect(navigationService.navigateToLogin).toHaveBeenCalled();
    expect(errorCaught).toBeDefined();
    expect(errorCaught!.status).toBe(401);
  });

  // ─── Refresh token: concurrent requests ─────────────────────────────────────

  it('replays concurrent requests with new token when refresh succeeds', () => {
    const expiredToken = 'mock-expired-token';
    const validRefreshToken = 'mock-valid-refresh-token';
    const newAccessToken = 'mock-new-access-token';
    const newRefreshToken = 'mock-new-refresh-token';
    const secondApiUrl = `${environment.apiUrl}/users`;

    setup(expiredToken, validRefreshToken);
    const refreshSubject = new Subject<{ accessToken: string; refreshToken: string }>();
    authService.refreshToken.and.returnValue(refreshSubject);

    let res1: unknown;
    let res2: unknown;
    httpClient.get(apiUrl).subscribe(d => { res1 = d; });
    httpClient.get(secondApiUrl).subscribe(d => { res2 = d; });

    // 1) First request fails with 401, triggering in-flight refresh flow
    const req1 = httpMock.expectOne(apiUrl);
    req1.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // 2) Second request fails with 401, queuing behind in-flight refresh
    const req2 = httpMock.expectOne(secondApiUrl);
    req2.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // 3) Complete refresh operation with new tokens
    refreshSubject.next({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    refreshSubject.complete();

    // 4) Both original requests are replayed with the new token
    const replayedReq1 = httpMock.expectOne(apiUrl);
    expect(replayedReq1.request.headers.get('Authorization')).toBe(`Bearer ${newAccessToken}`);
    replayedReq1.flush([{ id: 1 }]);

    const replayedReq2 = httpMock.expectOne(secondApiUrl);
    expect(replayedReq2.request.headers.get('Authorization')).toBe(`Bearer ${newAccessToken}`);
    replayedReq2.flush([{ id: 2 }]);

    expect(authService.refreshToken).toHaveBeenCalledTimes(1);
    expect(res1).toEqual([{ id: 1 }]);
    expect(res2).toEqual([{ id: 2 }]);
  });

  it('propagates error to all concurrent requests and dispatches logout without hanging when refresh fails', () => {
    const expiredToken = 'mock-expired-token';
    const badRefreshToken = 'mock-bad-refresh-token';
    const secondApiUrl = `${environment.apiUrl}/users`;

    setup(expiredToken, badRefreshToken);
    authService.refreshToken.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })));
    spyOn(store, 'dispatch');

    let err1: HttpErrorResponse | undefined;
    let err2: HttpErrorResponse | undefined;
    httpClient.get(apiUrl).subscribe({
      error: (err: HttpErrorResponse) => { err1 = err; }
    });
    httpClient.get(secondApiUrl).subscribe({
      error: (err: HttpErrorResponse) => { err2 = err; }
    });

    // 1) First request fails with 401 -> triggers refresh
    const req1 = httpMock.expectOne(apiUrl);
    req1.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // 2) Second request fails with 401 -> queues behind in-flight refresh
    const req2 = httpMock.expectOne(secondApiUrl);
    req2.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // 3) Both requests MUST receive an error without hanging
    expect(err1).toBeDefined();
    expect(err1!.status).toBe(401);
    expect(err2).toBeDefined();
    expect(err2!.status).toBe(401);
    expect(store.dispatch).toHaveBeenCalledWith(logout());
    expect(authService.logout).toHaveBeenCalled();
    expect(navigationService.navigateToLogin).toHaveBeenCalled();
  });

  // ─── Non-401 errors propagated without refresh ───────────────────────────────────

  it('propagates non-401 errors without attempting token refresh', () => {
    setup('mock-valid-token', 'mock-some-refresh-token');

    let errorCaught: HttpErrorResponse | undefined;
    httpClient.get(apiUrl).subscribe({
      error: (err: HttpErrorResponse) => { errorCaught = err; }
    });

    const req = httpMock.expectOne(apiUrl);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(errorCaught).toBeDefined();
    expect(errorCaught!.status).toBe(500);
    httpMock.expectNone(authApiUrl);
  });

  // ─── Successful request passed through ─────────────────────────────────────

  it('passes through 200 response without modification', () => {
    setup('mock-valid-token');

    let responseData: unknown;
    httpClient.get(apiUrl).subscribe(data => { responseData = data; });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nom: 'Mojito' }]);

    expect(responseData).toEqual([{ id: 1, nom: 'Mojito' }]);
  });
});

