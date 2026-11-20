import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, Subject } from 'rxjs';
import { IMessage } from '@stomp/stompjs';
import { LicenseService } from '../../../app/core/services/license.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { FeatureFlagService } from '../../../app/core/services/feature-flag.service';
import { ESTABLISHMENT_PRESETS } from '../../../app/core/models/establishment-module.model';
import { selectIsAuthenticated } from '../../../app/core/store/auth.selectors';
import { environment } from '../../../environments/environment';
import {
  LicenseStatusInfo,
  LicenseSummaryInfo,
  LicenseSyncResult,
} from '../../../app/core/models/license.model';

describe('LicenseService', () => {
  let service: LicenseService;
  let httpMock: HttpTestingController;
  let store: MockStore;
  let wsSubject: Subject<IMessage>;
  let wsSpy: jasmine.SpyObj<WebSocketService>;
  let featureFlagSpy: jasmine.SpyObj<FeatureFlagService>;

  const sampleStatus: LicenseStatusInfo = {
    status: 'VALID',
    plan: 'PRO',
    establishmentId: '73282932000074',
    venueEstablishmentId: '73282932000074',
    issuedAt: '2026-11-01T00:00:00Z',
    expiresAt: '2026-12-01T00:00:00Z',
    graceEndsAt: '2026-12-03T00:00:00Z',
    daysRemaining: 11,
    graceHoursRemaining: 0,
    licensedModules: ['FLOOR_PLAN', 'HAPPY_HOUR'],
    allModulesLicensed: false,
    orderCreationAllowed: true,
    enforced: true,
    lastSyncAt: null,
    lastSyncStatus: 'NONE',
    lastSyncError: null,
    activationMode: 'OFFLINE',
    activatedBy: 'admin',
    publicKeyFingerprint: 'AA:BB:CC:DD',
    maskedToken: 'eyJ...xyz',
  };

  beforeEach(() => {
    wsSubject = new Subject<IMessage>();
    wsSpy = jasmine.createSpyObj<WebSocketService>('WebSocketService', ['watch']);
    wsSpy.watch.and.returnValue(wsSubject.asObservable());
    featureFlagSpy = jasmine.createSpyObj<FeatureFlagService>('FeatureFlagService', ['loadModules']);
    featureFlagSpy.loadModules.and.returnValue(of(ESTABLISHMENT_PRESETS.BAR));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({
          selectors: [{ selector: selectIsAuthenticated, value: true }],
        }),
        { provide: WebSocketService, useValue: wsSpy },
        { provide: FeatureFlagService, useValue: featureFlagSpy },
        LicenseService,
      ],
    });

    service = TestBed.inject(LicenseService);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(MockStore);

    // Flush initial constructor loadSummary triggered by selectIsAuthenticated = true
    const initReq = httpMock.expectOne(`${environment.apiUrl}/admin/license/status`);
    initReq.flush({
      status: 'COMMUNITY',
      plan: 'COMMUNITY',
      expiresAt: null,
      graceEndsAt: null,
      graceHoursRemaining: 0,
      orderCreationAllowed: true,
      enforced: false,
    } satisfies LicenseSummaryInfo);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load full administrative status and sync summary signal', () => {
    let result: LicenseStatusInfo | undefined;
    service.getFullStatus().subscribe(data => (result = data));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/license`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleStatus);

    expect(result).toEqual(sampleStatus);
    expect(service.detailedStatus()).toEqual(sampleStatus);
    expect(service.summary()?.status).toBe('VALID');
    expect(service.isOrderCreationLocked()).toBeFalse();
  });

  it('should activate offline license token via POST /activate', () => {
    let result: LicenseStatusInfo | undefined;
    service.activateOfflineLicense('header.payload.signature').subscribe(res => (result = res));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/license/activate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ licenseToken: 'header.payload.signature' });
    req.flush(sampleStatus);

    expect(result?.plan).toBe('PRO');
    expect(service.isInGracePeriod()).toBeFalse();
  });

  it('should trigger online sync and update signals', () => {
    const syncPayload: LicenseSyncResult = {
      synced: true,
      reachable: true,
      syncStatus: 'SUCCESS',
      message: 'Synced',
      license: { ...sampleStatus, status: 'GRACE_PERIOD', graceHoursRemaining: 24 },
    };

    let result: LicenseSyncResult | undefined;
    service.syncOnline().subscribe(res => (result = res));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/license/sync`);
    expect(req.request.method).toBe('POST');
    req.flush(syncPayload);

    expect(result?.synced).toBeTrue();
    expect(service.isInGracePeriod()).toBeTrue();
    expect(service.shouldShowStaffBanner()).toBeTrue();
  });

  it('should deactivate license via DELETE', () => {
    const expiredStatus: LicenseStatusInfo = {
      ...sampleStatus,
      status: 'UNLICENSED',
      orderCreationAllowed: false,
      enforced: true,
    };

    service.deactivateLicense().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/license`);
    expect(req.request.method).toBe('DELETE');
    req.flush(expiredStatus);

    expect(service.isOrderCreationLocked()).toBeTrue();
    expect(service.shouldShowStaffBanner()).toBeTrue();
  });

  it('should update summary signal from WebSocket /topic/license broadcasts', () => {
    const wsPayload: LicenseSummaryInfo = {
      status: 'EXPIRED',
      plan: 'PRO',
      expiresAt: '2026-11-10T00:00:00Z',
      graceEndsAt: '2026-11-12T00:00:00Z',
      graceHoursRemaining: 0,
      orderCreationAllowed: false,
      enforced: true,
    };

    wsSubject.next({ body: JSON.stringify(wsPayload) } as IMessage);

    expect(service.summary()).toEqual(wsPayload);
    expect(service.isOrderCreationLocked()).toBeTrue();
  });

  it('should clear state when user logs out', () => {
    store.overrideSelector(selectIsAuthenticated, false);
    store.refreshState();

    expect(service.summary()).toBeNull();
    expect(service.detailedStatus()).toBeNull();
  });
});
