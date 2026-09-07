import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { MemoizedSelector } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { authInterceptor } from '../../../app/core/interceptors/auth.interceptor';
import { AuthService } from '../../../app/core/services/auth.service';
import { selectAuthToken } from '../../../app/core/store/auth.selectors';
import { logout } from '../../../app/core/store/auth.actions';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let store: MockStore;
  let authService: jasmine.SpyObj<AuthService>;
  let mockSelectAuthToken: MemoizedSelector<object, string | null>;

  const apiUrl = `${environment.apiUrl}/commandes`;
  const authApiUrl = `${environment.apiUrl}/auth/refresh`;

  function setup(token: string | null = null, refreshToken: string | null = null) {
    authService = jasmine.createSpyObj('AuthService', [
      'getRefreshToken',
      'storeTokens'
    ]);
    authService.getRefreshToken.and.returnValue(refreshToken);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideMockStore({ initialState: { auth: { token, user: null, error: null } } }),
        { provide: AuthService, useValue: authService }
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
    // No refresh request should have been emitted
    httpMock.expectNone(authApiUrl);
  });

  // ─── Refresh token: nominal flow ────────────────────────────────────────────

  it('refreshes token and replays original request on 401 when refresh token is available', () => {
    const expiredToken = 'mock-expired-token';
    const validRefreshToken = 'mock-valid-refresh-token';
    const newAccessToken = 'mock-new-access-token';
    const newRefreshToken = 'mock-new-refresh-token';

    setup(expiredToken, validRefreshToken);

    let responseData: unknown;
    httpClient.get(apiUrl).subscribe(data => { responseData = data; });

    // 1) Original request — responds 401
    const originalReq = httpMock.expectOne(apiUrl);
    expect(originalReq.request.headers.get('Authorization')).toBe(`Bearer ${expiredToken}`);
    originalReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // 2) Refresh request
    const refreshReq = httpMock.expectOne(authApiUrl);
    expect(refreshReq.request.method).toBe('POST');
    expect(refreshReq.request.body).toEqual({ refreshToken: validRefreshToken });
    refreshReq.flush({ accessToken: newAccessToken, refreshToken: newRefreshToken });

    // 3) Original request replayed with new token
    const replayedReq = httpMock.expectOne(apiUrl);
    expect(replayedReq.request.headers.get('Authorization')).toBe(`Bearer ${newAccessToken}`);
    replayedReq.flush([{ id: 1 }]);

    expect(authService.storeTokens).toHaveBeenCalledWith(newAccessToken, newRefreshToken);
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
    expect(errorCaught).toBeDefined();
    expect(errorCaught!.message).toBe('No refresh token available');
    httpMock.expectNone(authApiUrl);
  });

  // ─── Refresh token: refresh failure -> logout ───────────────────────────────

  it('dispatches logout and propagates error when refresh endpoint responds 401', () => {
    setup('mock-expired-token', 'mock-bad-refresh-token');
    spyOn(store, 'dispatch');

    let errorCaught: HttpErrorResponse | undefined;
    httpClient.get(apiUrl).subscribe({
      error: (err: HttpErrorResponse) => { errorCaught = err; }
    });

    // 1) Original request -> 401
    const originalReq = httpMock.expectOne(apiUrl);
    originalReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // 2) Refresh fails
    const refreshReq = httpMock.expectOne(authApiUrl);
    refreshReq.flush('Invalid refresh token', { status: 401, statusText: 'Unauthorized' });

    expect(store.dispatch).toHaveBeenCalledWith(logout());
    expect(errorCaught).toBeDefined();
    expect(errorCaught!.status).toBe(401);
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

