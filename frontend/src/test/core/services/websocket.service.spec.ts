import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Subject, BehaviorSubject, take } from 'rxjs';

import { WebSocketService, RX_STOMP } from '../../../app/core/services/websocket.service';
import { AuthService } from '../../../app/core/services/auth.service';
import { selectIsAuthenticated } from '../../../app/core/store/auth.selectors';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let store: MockStore;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRxStomp: any;
  let connectionStateSubject: BehaviorSubject<RxStompState>;

  beforeEach(() => {
    connectionStateSubject = new BehaviorSubject<RxStompState>(RxStompState.CLOSED);

    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', ['getToken']);

    mockRxStomp = jasmine.createSpyObj(
      'RxStomp',
      ['configure', 'activate', 'deactivate', 'watch'],
      { connectionState$: connectionStateSubject.asObservable() }
    );
    mockRxStomp.active = false;

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: RX_STOMP, useValue: mockRxStomp },
        provideMockStore({
          selectors: [
            { selector: selectIsAuthenticated, value: true },
          ],
        }),
      ],
    });

    store = TestBed.inject(MockStore);
    service = TestBed.inject(WebSocketService);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  // ─── connect() ──────────────────────────────────────────────────────────────

  it('connect() configure et active rxStomp quand non actif', () => {
    (mockRxStomp as any).active = false;
    mockRxStomp.configure.calls.reset();
    mockRxStomp.activate.calls.reset();

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

  it('connect() does nothing if rxStomp is already active', () => {
    (mockRxStomp as any).active = true;
    mockRxStomp.configure.calls.reset();
    mockRxStomp.activate.calls.reset();

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
    mockRxStomp.deactivate.calls.reset();
    service.disconnect();
    expect(mockRxStomp.deactivate).toHaveBeenCalledTimes(1);
  });

  // ─── watch() ────────────────────────────────────────────────────────────────

  it('watch() delegates to rxStomp.watch() with provided destination', () => {
    const subject = new Subject<any>();
    mockRxStomp.watch.and.returnValue(subject.asObservable() as any);

    const result = service.watch('/topic/commandes');

    expect(mockRxStomp.watch).toHaveBeenCalledOnceWith('/topic/commandes');
    expect(result).toBeDefined();
  });

  it('watch() returns messages emitted by STOMP broker', (done) => {
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

  it('connected$ emits true when STOMP state is OPEN', (done) => {
    // connected$ is derived from connectionState$ — make sure the mock uses it
    (mockRxStomp as any).connectionState$ = connectionStateSubject.asObservable();

    service.connected$.subscribe(val => {
      if (val === true) {
        expect(val).toBeTrue();
        done();
      }
    });

    connectionStateSubject.next(RxStompState.OPEN);
  });

  it('connected$ emits false when STOMP state is not OPEN', (done) => {
    (mockRxStomp as any).connectionState$ = connectionStateSubject.asObservable();

    service.connected$.pipe(take(1)).subscribe(val => {
      expect(val).toBeFalse();
      done();
    });
  });

  // ─── Auto connect / disconnect according to auth state ───────────────────

  it('connects automatically when isAuthenticated becomes true and rxStomp is inactive', () => {
    (mockRxStomp as any).active = false;

    // Force false -> true transition to trigger subscription (distinctUntilChanged)
    store.overrideSelector(selectIsAuthenticated, false);
    store.refreshState();

    mockRxStomp.configure.calls.reset();
    mockRxStomp.activate.calls.reset();

    store.overrideSelector(selectIsAuthenticated, true);
    store.refreshState();

    expect(mockRxStomp.configure).toHaveBeenCalled();
    expect(mockRxStomp.activate).toHaveBeenCalled();
  });

  it('does not connect if rxStomp is already active when isAuthenticated is true', () => {
    (mockRxStomp as any).active = true;
    mockRxStomp.configure.calls.reset();
    mockRxStomp.activate.calls.reset();

    store.overrideSelector(selectIsAuthenticated, true);
    store.refreshState();

    expect(mockRxStomp.configure).not.toHaveBeenCalled();
    expect(mockRxStomp.activate).not.toHaveBeenCalled();
  });

  it('disconnects automatically when isAuthenticated becomes false and rxStomp is active', () => {
    (mockRxStomp as any).active = true;
    mockRxStomp.deactivate.calls.reset();

    store.overrideSelector(selectIsAuthenticated, false);
    store.refreshState();

    expect(mockRxStomp.deactivate).toHaveBeenCalled();
  });

  it('does not disconnect if rxStomp is inactive when isAuthenticated becomes false', () => {
    (mockRxStomp as any).active = false;
    mockRxStomp.deactivate.calls.reset();

    store.overrideSelector(selectIsAuthenticated, false);
    store.refreshState();

    expect(mockRxStomp.deactivate).not.toHaveBeenCalled();
  });
});
