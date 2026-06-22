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
  const authApiUrl = `${environment.apiUrl}/api/auth/refresh`;

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

  // ─── Ajout du header Authorization ───────────────────────────────────────────

  it('ajoute Authorization header quand un token est present dans le store', () => {
    setup('jwt-token-123');

    httpClient.get(apiUrl).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token-123');
    req.flush([]);
  });

  it('ne pas ajouter Authorization header quand aucun token dans le store', () => {
    setup(null);

    httpClient.get(apiUrl).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  // ─── Pas d'interférence sur les routes auth ──────────────────────────────────

  it('laisse passer les erreurs 401 sur les routes /api/auth/ sans tenter un refresh', () => {
    setup('some-token', null);

    let errorCaught: HttpErrorResponse | undefined;
    httpClient.post(`${environment.apiUrl}/api/auth/login`, {}).subscribe({
      error: (err: HttpErrorResponse) => { errorCaught = err; }
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(errorCaught).toBeDefined();
    expect(errorCaught!.status).toBe(401);
    // Aucune requête de refresh ne doit avoir été émise
    httpMock.expectNone(authApiUrl);
  });

  // ─── Refresh token : flux nominal ────────────────────────────────────────────

  it('rafraichit le token et rejoue la requete originale en cas de 401 avec refreshToken disponible', () => {
    setup('expired-token', 'valid-refresh-token');

    let responseData: unknown;
    httpClient.get(apiUrl).subscribe(data => { responseData = data; });

    // 1) Requête originale — répond 401
    const originalReq = httpMock.expectOne(apiUrl);
    expect(originalReq.request.headers.get('Authorization')).toBe('Bearer expired-token');
    originalReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // 2) Requête de refresh
    const refreshReq = httpMock.expectOne(authApiUrl);
    expect(refreshReq.request.method).toBe('POST');
    expect(refreshReq.request.body).toEqual({ refreshToken: 'valid-refresh-token' });
    refreshReq.flush({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });

    // 3) Requête originale rejouée avec le nouveau token
    const replayedReq = httpMock.expectOne(apiUrl);
    expect(replayedReq.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    replayedReq.flush([{ id: 1 }]);

    expect(authService.storeTokens).toHaveBeenCalledWith('new-access-token', 'new-refresh-token');
    expect(responseData).toEqual([{ id: 1 }]);
  });

  // ─── Refresh token : pas de refresh token stocké → logout ───────────────────

  it('dispatche logout et propage une erreur quand aucun refreshToken nest disponible en cas de 401', () => {
    setup('expired-token', null);
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

  // ─── Refresh token : échec du refresh → logout ───────────────────────────────

  it('dispatche logout et propage une erreur quand le endpoint de refresh repond 401', () => {
    setup('expired-token', 'bad-refresh-token');
    spyOn(store, 'dispatch');

    let errorCaught: HttpErrorResponse | undefined;
    httpClient.get(apiUrl).subscribe({
      error: (err: HttpErrorResponse) => { errorCaught = err; }
    });

    // 1) Requête originale → 401
    const originalReq = httpMock.expectOne(apiUrl);
    originalReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // 2) Refresh échoue
    const refreshReq = httpMock.expectOne(authApiUrl);
    refreshReq.flush('Invalid refresh token', { status: 401, statusText: 'Unauthorized' });

    expect(store.dispatch).toHaveBeenCalledWith(logout());
    expect(errorCaught).toBeDefined();
    expect(errorCaught!.status).toBe(401);
  });

  // ─── Erreurs non-401 propagées sans refresh ───────────────────────────────────

  it('propage les erreurs non-401 sans tenter de refresh', () => {
    setup('valid-token', 'some-refresh-token');

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

  // ─── Requête réussie passée telle quelle ─────────────────────────────────────

  it('laisse passer une reponse 200 sans modification', () => {
    setup('valid-token');

    let responseData: unknown;
    httpClient.get(apiUrl).subscribe(data => { responseData = data; });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nom: 'Mojito' }]);

    expect(responseData).toEqual([{ id: 1, nom: 'Mojito' }]);
  });
});
