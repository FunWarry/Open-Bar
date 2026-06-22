import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Subject, BehaviorSubject } from 'rxjs';

import { WebSocketService } from '../../../app/core/services/websocket.service';
import { AuthService } from '../../../app/core/services/auth.service';
import { selectIsAuthenticated } from '../../../app/core/store/auth.selectors';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let store: MockStore;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRxStomp: jasmine.SpyObj<RxStomp>;
  let connectionStateSubject: BehaviorSubject<RxStompState>;
  let isAuthSubject: BehaviorSubject<boolean>;

  beforeEach(() => {
    connectionStateSubject = new BehaviorSubject<RxStompState>(RxStompState.CLOSED);
    isAuthSubject = new BehaviorSubject<boolean>(true);

    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', ['getToken']);

    mockRxStomp = jasmine.createSpyObj<RxStomp>(
      'RxStomp',
      ['configure', 'activate', 'deactivate', 'watch'],
      {
        connectionState$: connectionStateSubject.asObservable(),
        active: false,
      }
    );

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: AuthService, useValue: mockAuthService },
        provideMockStore({
          selectors: [
            { selector: selectIsAuthenticated, value: true },
          ],
        }),
      ],
    });

    // Override the RxStomp instance created inside the service constructor
    store = TestBed.inject(MockStore);
    service = TestBed.inject(WebSocketService);

    // Replace the private rxStomp instance with the spy
    (service as any).rxStomp = mockRxStomp;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  // ─── connect() ──────────────────────────────────────────────────────────────

  it('connect() configure et active rxStomp quand non actif', () => {
    (mockRxStomp as any).active = false;

    service.connect();

    expect(mockRxStomp.configure).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      })
    );
    expect(mockRxStomp.activate).toHaveBeenCalledTimes(1);
  });

  it('connect() ne fait rien si rxStomp est déjà actif', () => {
    (mockRxStomp as any).active = true;

    service.connect();

    expect(mockRxStomp.configure).not.toHaveBeenCalled();
    expect(mockRxStomp.activate).not.toHaveBeenCalled();
  });

  it('connect() inclut le token JWT dans les connectHeaders via beforeConnect', () => {
    (mockRxStomp as any).active = false;
    mockAuthService.getToken.and.returnValue('my-jwt-token');

    // Capture the config passed to configure()
    let capturedConfig: any;
    mockRxStomp.configure.and.callFake((cfg: any) => {
      capturedConfig = cfg;
    });

    // Simulate stompClient being present for beforeConnect
    (mockRxStomp as any).stompClient = { connectHeaders: {} };

    service.connect();

    expect(capturedConfig).toBeDefined();
    // Invoke the beforeConnect callback manually to verify header injection
    capturedConfig.beforeConnect();
    expect((mockRxStomp as any).stompClient.connectHeaders).toEqual({
      Authorization: 'Bearer my-jwt-token',
    });
  });

  it('connect() met connectHeaders vide quand aucun token disponible', () => {
    (mockRxStomp as any).active = false;
    mockAuthService.getToken.and.returnValue(null);

    let capturedConfig: any;
    mockRxStomp.configure.and.callFake((cfg: any) => {
      capturedConfig = cfg;
    });

    (mockRxStomp as any).stompClient = { connectHeaders: { Authorization: 'old' } };

    service.connect();
    capturedConfig.beforeConnect();

    expect((mockRxStomp as any).stompClient.connectHeaders).toEqual({});
  });

  // ─── disconnect() ───────────────────────────────────────────────────────────

  it('disconnect() appelle rxStomp.deactivate()', () => {
    service.disconnect();

    expect(mockRxStomp.deactivate).toHaveBeenCalledTimes(1);
  });

  // ─── watch() ────────────────────────────────────────────────────────────────

  it('watch() délègue à rxStomp.watch() avec la destination fournie', () => {
    const subject = new Subject<any>();
    mockRxStomp.watch.and.returnValue(subject.asObservable() as any);

    const result = service.watch('/topic/commandes');

    expect(mockRxStomp.watch).toHaveBeenCalledOnceWith('/topic/commandes');
    expect(result).toBeDefined();
  });

  it('watch() retourne les messages émis par le STOMP broker', (done) => {
    const subject = new Subject<any>();
    mockRxStomp.watch.and.returnValue(subject.asObservable() as any);

    const fakeMessage = { body: '{"id":1}' };

    service.watch('/topic/tables').subscribe(msg => {
      expect(msg).toEqual(fakeMessage as any);
      done();
    });

    subject.next(fakeMessage);
  });

  // ─── connected$ ─────────────────────────────────────────────────────────────

  it('connected$ émet true quand l\'état STOMP est OPEN', (done) => {
    connectionStateSubject.next(RxStompState.OPEN);

    // Re-get the getter after swapping rxStomp
    // connected$ is derived from connectionState$ — we need to provide it on the spy
    (mockRxStomp as any).connectionState$ = connectionStateSubject.asObservable();

    service.connected$.subscribe(val => {
      expect(val).toBeTrue();
      done();
    });

    // connectionState$ drives the getter; emit OPEN after subscription
    connectionStateSubject.next(RxStompState.OPEN);
  });

  it('connected$ émet false quand l\'état STOMP n\'est pas OPEN', (done) => {
    (mockRxStomp as any).connectionState$ = connectionStateSubject.asObservable();

    service.connected$.subscribe(val => {
      expect(val).toBeFalse();
      done();
    });

    connectionStateSubject.next(RxStompState.CLOSED);
  });

  // ─── déconnexion automatique au logout ──────────────────────────────────────

  it('se déconnecte automatiquement quand isAuthenticated passe à false et que rxStomp est actif', () => {
    // At this point rxStomp was already replaced by the spy.
    // We need to re-run the store subscription logic with our spy in place.
    // Simulate active connection then logout.
    (mockRxStomp as any).active = true;

    store.overrideSelector(selectIsAuthenticated, false);
    store.refreshState();

    // The constructor subscription fired once with value=true (initial).
    // After refreshState it fires with false + active=true → deactivate expected.
    expect(mockRxStomp.deactivate).toHaveBeenCalled();
  });

  it('ne déconnecte pas si rxStomp est inactif quand isAuthenticated passe à false', () => {
    (mockRxStomp as any).active = false;
    mockRxStomp.deactivate.calls.reset();

    store.overrideSelector(selectIsAuthenticated, false);
    store.refreshState();

    expect(mockRxStomp.deactivate).not.toHaveBeenCalled();
  });
});
