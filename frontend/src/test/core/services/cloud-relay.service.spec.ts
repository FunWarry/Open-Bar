import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { CloudRelayService } from '../../../app/core/services/cloud-relay.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { CloudRelayDiagnostic, CloudRelayStatus, PublicBranding } from '../../../app/core/models/cloud-relay.model';
import { environment } from '../../../environments/environment';

describe('CloudRelayService', () => {
  let service: CloudRelayService;
  let httpMock: HttpTestingController;
  let wsSubject: Subject<{ body: unknown }>;
  let wsSpy: jasmine.SpyObj<WebSocketService>;

  const mockStatus: CloudRelayStatus = {
    moduleEnabled: true,
    relayEnabled: true,
    connectionState: 'SIMULATED',
    venueSlug: 'le-shaker-paris',
    customDomain: 'commande.leshaker.fr',
    baseDomain: 'open-bar.eu',
    publicUrl: 'https://commande.leshaker.fr',
    tunnelEndpoint: 'wss://relay.open-bar.eu/ws/tunnel',
    pairingTokenConfigured: true,
    connectedSince: '2026-11-20T20:00:00Z',
    lastHeartbeatAt: '2026-11-20T20:01:00Z',
    lastError: null,
    reconnectAttempt: 0,
    nextRetryInSeconds: 0,
    activeStreams: 2,
    totalProxiedRequests: 42,
    totalProxiedWsFrames: 120,
    averageLatencyMs: 18,
    simulatorMode: true,
    clientsEnabled: true,
    staffEnabled: true,
    adminEnabled: true,
    remoteTpeEnabled: true,
    remotePrintingEnabled: true,
    allowedRoles: ['SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN'],
  };

  beforeEach(() => {
    wsSubject = new Subject<{ body: unknown }>();
    wsSpy = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsSpy.watch.and.returnValue(wsSubject.asObservable() as never);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CloudRelayService,
        { provide: WebSocketService, useValue: wsSpy }
      ]
    });

    service = TestBed.inject(CloudRelayService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should subscribe to /topic/cloud-relay and update status signal on STOMP messages', () => {
    expect(wsSpy.watch).toHaveBeenCalledWith('/topic/cloud-relay');

    wsSubject.next({ body: JSON.stringify(mockStatus) });
    expect(service.status()).toEqual(mockStatus);

    wsSubject.next({ body: { ...mockStatus, connectionState: 'RECONNECTING' } });
    expect(service.status()?.connectionState).toBe('RECONNECTING');
  });

  it('should fetch status, connect, disconnect, and run diagnostics via REST', () => {
    service.getStatus().subscribe(res => expect(res).toEqual(mockStatus));
    httpMock.expectOne(`${environment.apiUrl}/admin/cloud-relay/status`).flush(mockStatus);

    service.connect().subscribe(res => expect(res?.connectionState).toBe('CONNECTED'));
    const connectReq = httpMock.expectOne(`${environment.apiUrl}/admin/cloud-relay/connect`);
    expect(connectReq.request.method).toBe('POST');
    connectReq.flush({ ...mockStatus, connectionState: 'CONNECTED' });

    service.disconnect().subscribe(res => expect(res?.connectionState).toBe('DISCONNECTED'));
    const disconnectReq = httpMock.expectOne(`${environment.apiUrl}/admin/cloud-relay/disconnect`);
    expect(disconnectReq.request.method).toBe('POST');
    disconnectReq.flush({ ...mockStatus, connectionState: 'DISCONNECTED' });

    const diag: CloudRelayDiagnostic = {
      success: true,
      latencyMs: 21,
      status: 'SIMULATED_OK',
      message: 'Verified',
      resolvedPublicUrl: 'https://commande.leshaker.fr',
      dnsVerified: true,
      tlsReady: true
    };
    service.runDiagnostics().subscribe(res => expect(res).toEqual(diag));
    httpMock.expectOne(`${environment.apiUrl}/admin/cloud-relay/test`).flush(diag);
  });

  it('should trigger simulator disconnect/reconnect and probe public branding health', () => {
    service.markTunnelOffline();
    expect(service.tunnelOfflineDetected()).toBeTrue();

    service.simulateDisconnect().subscribe();
    httpMock.expectOne(`${environment.apiUrl}/admin/cloud-relay/simulator/disconnect`).flush({
      ...mockStatus,
      connectionState: 'RECONNECTING'
    });

    service.simulateReconnect().subscribe();
    httpMock.expectOne(`${environment.apiUrl}/admin/cloud-relay/simulator/reconnect`).flush(mockStatus);

    const branding: PublicBranding = {
      establishmentName: 'Le Shaker Paris',
      venueSlug: 'le-shaker-paris',
      customDomain: null,
      primaryColor: '#6c7fe8',
      primaryColorStrong: '#5a68d6',
      logoUrl: null,
      bannerImageUrl: null,
      defaultTheme: 'DARK',
      cloudRelayEnabled: true,
      tunnelConnected: true,
      clientsEnabled: true,
      staffEnabled: true,
      effectivePublicUrl: 'https://le-shaker-paris.open-bar.eu',
      localFallbackUrl: 'https://openbar.local',
      wifiEnabled: true,
      wifiSsid: 'LeShaker-Guest'
    };

    service.checkRelayHealth().subscribe(res => expect(res).toEqual(branding));
    const probeReq = httpMock.expectOne(`${environment.apiUrl}/public/cloud-relay/health`);
    expect(probeReq.request.headers.get('X-Silent-Probe')).toBe('true');
    probeReq.flush(branding);
    expect(service.tunnelOfflineDetected()).toBeFalse();
  });
});
