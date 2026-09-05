import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../../../app/core/services/auth.service';
import { AuthResponse } from '../../../app/core/models/auth-response.model';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/auth`;

  const mockAuthResponse: AuthResponse = {
    id: 1,
    email: 'test@bar.com',
    username: 'testuser',
    roles: ['SERVEUR'],
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  // --- login() ---

  it('login() calls POST /api/auth/login avec les credentials', () => {
    service.login('testuser', 'password123').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'testuser', password: 'password123' });
    req.flush(mockAuthResponse);
  });

  it('login() stores token and user data in localStorage on success', () => {
    service.login('testuser', 'password123').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/login`);
    req.flush(mockAuthResponse);

    expect(localStorage.getItem('auth_token')).toBe('mock-access-token');
    expect(localStorage.getItem('refresh_token')).toBe('mock-refresh-token');
    const storedUser = JSON.parse(localStorage.getItem('auth_user')!);
    expect(storedUser.username).toBe('testuser');
    expect(storedUser.roles).toEqual(['SERVEUR']);
  });

  it('login() returns error if an operation is already in progress', () => {
    // Trigger initial login (en cours)
    service.login('testuser', 'password123').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/login`); // premier appel en attente

    // Second attempt pendant que le premier est en cours
    let errorMessage: string | undefined;
    service.login('testuser', 'password123').subscribe({
      error: (err: Error) => (errorMessage = err.message)
    });

    expect(errorMessage).toBe('An operation is already in progress');
    // Flush first pour que afterEach verify() ne se plaigne pas
    req.flush(mockAuthResponse);
  });

  it('login() resets inProgress to false on HTTP error', () => {
    let errorCaught = false;
    service.login('testuser', 'wrong').subscribe({
      error: () => (errorCaught = true)
    });

    const req = httpMock.expectOne(`${baseUrl}/login`);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorCaught).toBeTrue();
    // After error, inProgress must be false — a new call must succeed
    service.login('testuser', 'password123').subscribe();
    const req2 = httpMock.expectOne(`${baseUrl}/login`);
    req2.flush(mockAuthResponse);
  });

  // --- logout() ---

  it('logout() removes auth keys from localStorage', fakeAsync(() => {
    localStorage.setItem('auth_token', 'some-token');
    localStorage.setItem('refresh_token', 'some-refresh');
    localStorage.setItem('auth_user', JSON.stringify({ username: 'testuser' }));
    sessionStorage.setItem('store_hydrated', 'true');

    service.logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect(sessionStorage.getItem('store_hydrated')).toBeNull();

    tick(1000); // resolve internal setTimeout
  }));

  it('logout() does nothing if inProgress is already true', fakeAsync(() => {
    localStorage.setItem('auth_token', 'token');
    // Simuler inProgress via un login en cours
    service.login('user', 'pass').subscribe();
    const pendingReq = httpMock.expectOne(`${baseUrl}/login`); // garder en attente

    // Token must remain (logout ignored)
    service.logout();
    expect(localStorage.getItem('auth_token')).toBe('token');

    // Clean up — flush login using retrieved request
    pendingReq.flush(mockAuthResponse);
    tick(1000);
  }));

  // --- getToken() ---

  it('getToken() returns token stored in localStorage', () => {
    localStorage.setItem('auth_token', 'my-token');
    expect(service.getToken()).toBe('my-token');
  });

  it('getToken() returns null if no token present', () => {
    expect(service.getToken()).toBeNull();
  });

  // --- getRefreshToken() ---

  it('getRefreshToken() retourne le refresh token du localStorage', () => {
    localStorage.setItem('refresh_token', 'my-refresh');
    expect(service.getRefreshToken()).toBe('my-refresh');
  });

  it('getRefreshToken() returns null if no refresh token present', () => {
    expect(service.getRefreshToken()).toBeNull();
  });

  // --- storeTokens() ---

  it('storeTokens() sauvegarde accessToken et refreshToken dans localStorage', () => {
    service.storeTokens('new-access', 'new-refresh');
    expect(localStorage.getItem('auth_token')).toBe('new-access');
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
  });

  // --- getStoredUser() ---

  it('getStoredUser() returns parsed user object from localStorage', () => {
    const user = { id: 1, username: 'testuser', roles: ['BARMAN'] };
    localStorage.setItem('auth_user', JSON.stringify(user));
    const result = service.getStoredUser();
    expect(result).toEqual(user);
  });

  it('getStoredUser() returns null if no user stored', () => {
    expect(service.getStoredUser()).toBeNull();
  });

  // --- saveUserData (via login) ---

  it('login() stores token without refreshToken if absent from response', () => {
    const responseWithoutRefresh: AuthResponse = { ...mockAuthResponse, refreshToken: '' };
    service.login('testuser', 'password123').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/login`);
    req.flush(responseWithoutRefresh);

    expect(localStorage.getItem('auth_token')).toBe('mock-access-token');
    // empty refreshToken: setItem is not called for refresh_token
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('login() returns complete AuthResponse to caller', () => {
    let result: AuthResponse | undefined;
    service.login('testuser', 'password123').subscribe(r => (result = r));
    const req = httpMock.expectOne(`${baseUrl}/login`);
    req.flush(mockAuthResponse);
    expect(result).toEqual(mockAuthResponse);
  });
});
