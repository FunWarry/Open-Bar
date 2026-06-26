import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ToastController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';
import { errorInterceptor } from '../../../app/core/interceptors/error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let translocoSpy: jasmine.SpyObj<TranslocoService>;

  const toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present', 'dismiss']);

  beforeEach(() => {
    toastCtrlSpy = jasmine.createSpyObj<ToastController>('ToastController', [
      'create',
      'getTop',
    ]);
    translocoSpy = jasmine.createSpyObj<TranslocoService>('TranslocoService', [
      'translate',
    ]);

    // Par défaut : pas de toast existant au sommet, création renvoie un toast mock
    toastCtrlSpy.getTop.and.returnValue(Promise.resolve(undefined));
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));
    toastSpy.present.and.returnValue(Promise.resolve());

    // Par défaut : transloco renvoie la clé (pas de traduction trouvée → fallback)
    translocoSpy.translate.and.callFake((key: any) => key as any);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: TranslocoService, useValue: translocoSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // -----------------------------------------------------------------------
  // Cas passants — l'intercepteur ne bloque pas les requêtes réussies
  // -----------------------------------------------------------------------

  it('laisse passer les réponses HTTP 200 sans afficher de toast', (done) => {
    http.get('/api/test').subscribe({
      next: (res) => {
        expect(res).toEqual({ ok: true });
        expect(toastCtrlSpy.create).not.toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ ok: true });
  });

  // -----------------------------------------------------------------------
  // 401 — l'intercepteur re-throw sans toast
  // -----------------------------------------------------------------------

  it('re-throw sans toast pour une erreur 401', (done) => {
    http.get('/api/protected').subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
        expect(toastCtrlSpy.create).not.toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  // -----------------------------------------------------------------------
  // 403 — ERRORS.FORBIDDEN
  // -----------------------------------------------------------------------

  it('affiche un toast et re-throw pour une erreur 403', (done) => {
    http.get('/api/admin').subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(403);
        expect(toastCtrlSpy.create).toHaveBeenCalledOnceWith(
          jasmine.objectContaining({ color: 'danger', duration: 3500 })
        );
        done();
      },
    });

    const req = httpMock.expectOne('/api/admin');
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });

  // -----------------------------------------------------------------------
  // 404 — ERRORS.NOT_FOUND
  // -----------------------------------------------------------------------

  it('affiche un toast et re-throw pour une erreur 404', (done) => {
    http.get('/api/missing').subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(404);
        expect(toastCtrlSpy.create).toHaveBeenCalledOnceWith(
          jasmine.objectContaining({ color: 'danger' })
        );
        done();
      },
    });

    const req = httpMock.expectOne('/api/missing');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  // -----------------------------------------------------------------------
  // 500 — ERRORS.SERVER (fallback générique)
  // -----------------------------------------------------------------------

  it('affiche un toast et re-throw pour une erreur 500', (done) => {
    http.get('/api/crash').subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(500);
        expect(toastCtrlSpy.create).toHaveBeenCalledOnceWith(
          jasmine.objectContaining({ color: 'danger' })
        );
        done();
      },
    });

    const req = httpMock.expectOne('/api/crash');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  // -----------------------------------------------------------------------
  // status 0 — ERRORS.NETWORK (perte de connexion)
  // -----------------------------------------------------------------------

  it('affiche le message réseau pour une erreur status 0 (offline)', (done) => {
    http.get('/api/data').subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(0);
        expect(toastCtrlSpy.create).toHaveBeenCalledOnceWith(
          jasmine.objectContaining({ color: 'danger' })
        );
        done();
      },
    });

    const req = httpMock.expectOne('/api/data');
    req.flush(null, { status: 0, statusText: 'Unknown Error' });
  });

  // -----------------------------------------------------------------------
  // Toast existant — dismiss() est appelé avant la création d'un nouveau
  // -----------------------------------------------------------------------

  it('dismiss le toast existant avant d\'en créer un nouveau', (done) => {
    const existingToast = jasmine.createSpyObj('HTMLIonToastElement', ['dismiss']);
    existingToast.dismiss.and.returnValue(Promise.resolve(true));
    toastCtrlSpy.getTop.and.returnValue(Promise.resolve(existingToast));

    http.get('/api/resource').subscribe({
      error: () => {
        expect(existingToast.dismiss).toHaveBeenCalled();
        expect(toastCtrlSpy.create).toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne('/api/resource');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  // -----------------------------------------------------------------------
  // Transloco — utilise la traduction quand elle diffère de la clé
  // -----------------------------------------------------------------------

  it('utilise la traduction Transloco si elle diffère de la clé', (done) => {
    translocoSpy.translate.and.callFake((key: any) =>
      key === 'ERRORS.NOT_FOUND' ? 'Ressource non trouvée' : key
    );

    http.get('/api/item').subscribe({
      error: () => {
        expect(toastCtrlSpy.create).toHaveBeenCalledOnceWith(
          jasmine.objectContaining({ message: 'Ressource non trouvée' })
        );
        done();
      },
    });

    const req = httpMock.expectOne('/api/item');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  // -----------------------------------------------------------------------
  // Fallback message — utilise FALLBACK_MESSAGES quand Transloco renvoie la clé
  // -----------------------------------------------------------------------

  it('utilise le message de fallback quand Transloco renvoie la clé telle quelle', (done) => {
    // translate() retourne la clé → on attend le fallback hardcodé
    translocoSpy.translate.and.callFake((key: any) => key as any);

    http.get('/api/forbidden').subscribe({
      error: () => {
        expect(toastCtrlSpy.create).toHaveBeenCalledOnceWith(
          jasmine.objectContaining({ message: 'Accès interdit.' })
        );
        done();
      },
    });

    const req = httpMock.expectOne('/api/forbidden');
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });
});
