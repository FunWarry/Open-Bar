import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { MonetizationService } from '../../../app/core/services/monetization.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { selectIsAuthenticated } from '../../../app/core/store/auth.selectors';
import { environment } from '../../../environments/environment';
import {
  CommissionSyncResult,
  LedgerVerificationResult,
  MonetizationDashboard,
  MonetizationSummary,
  MonthlyCommissionProof,
} from '../../../app/core/models/monetization.model';

describe('MonetizationService', () => {
  let service: MonetizationService;
  let httpMock: HttpTestingController;
  let wsSubject: Subject<{ body: string }>;
  let store: MockStore;
  const apiUrl = `${environment.apiUrl}/admin/monetization`;

  const mockSummary: MonetizationSummary = {
    activeTier: 'CONCERT_IP_OFFLINE',
    billingPeriod: '2026-11',
    invoiceStatus: 'GRACE_PERIOD',
    remoteInvoiceId: 'in_demo_1',
    pendingAmount: 14.2,
    graceEndsAt: '2026-11-25T00:00:00Z',
    graceHoursRemaining: 48,
    enforceGraceLock: false,
    tpeCardLocked: false,
    shouldShowBanner: true,
  };

  beforeEach(() => {
    wsSubject = new Subject<{ body: string }>();
    const wsMock = jasmine.createSpyObj<WebSocketService>('WebSocketService', ['watch']);
    wsMock.watch.and.returnValue(wsSubject.asObservable() as never);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({
          selectors: [{ selector: selectIsAuthenticated, value: false }],
        }),
        { provide: WebSocketService, useValue: wsMock },
        MonetizationService,
      ],
    });

    store = TestBed.inject(MockStore);
    service = TestBed.inject(MonetizationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loadSummary() fetches GET /api/admin/monetization/status and updates banner signals', () => {
    service.loadSummary().subscribe(res => {
      expect(res).toEqual(mockSummary);
    });

    const req = httpMock.expectOne(`${apiUrl}/status`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSummary);

    expect(service.shouldShowBanner()).toBeTrue();
    expect(service.isTpeCardLocked()).toBeFalse();
  });

  it('getDashboard() fetches GET /api/admin/monetization/dashboard with period param', () => {
    const dashboard: Partial<MonetizationDashboard> = {
      billingPeriod: '2026-11',
      summary: { ...mockSummary, tpeCardLocked: true },
    };

    service.getDashboard('2026-11').subscribe(res => {
      expect(res.billingPeriod).toBe('2026-11');
    });

    const req = httpMock.expectOne(`${apiUrl}/dashboard?period=2026-11`);
    expect(req.request.method).toBe('GET');
    req.flush(dashboard);

    expect(service.isTpeCardLocked()).toBeTrue();
  });

  it('verifyIntegrity(), exportMonthlyProof(), and syncOnline() call their respective endpoints', () => {
    const verifyRes: LedgerVerificationResult = {
      valid: true,
      totalEntries: 3,
      verifiedEntries: 3,
      tipHash: 'abc',
      brokenSequenceNumber: null,
      message: 'OK',
    };
    service.verifyIntegrity().subscribe(res => expect(res.valid).toBeTrue());
    httpMock.expectOne(`${apiUrl}/verify`).flush(verifyRes);

    const proofRes = { billingPeriod: '2026-11', compactProofToken: 'tok123' } as MonthlyCommissionProof;
    service.exportMonthlyProof('2026-11').subscribe(res => expect(res.compactProofToken).toBe('tok123'));
    httpMock.expectOne(`${apiUrl}/export-proof?period=2026-11`).flush(proofRes);

    const syncRes: CommissionSyncResult = {
      synced: true,
      onlineReachable: true,
      syncStatus: 'SUCCESS',
      syncedEntriesCount: 2,
      message: 'Synced',
      summary: { ...mockSummary, shouldShowBanner: false, invoiceStatus: 'SETTLED' },
    };
    service.syncOnline('2026-11').subscribe(res => expect(res.synced).toBeTrue());
    httpMock.expectOne(`${apiUrl}/sync?period=2026-11`).flush(syncRes);
    expect(service.shouldShowBanner()).toBeFalse();
  });

  it('updates summary reactively on WebSocket /topic/monetization events and auth logout', () => {
    wsSubject.next({ body: JSON.stringify(mockSummary) });
    expect(service.shouldShowBanner()).toBeTrue();

    store.overrideSelector(selectIsAuthenticated, true);
    store.refreshState();
    const req = httpMock.expectOne(`${apiUrl}/status`);
    req.flush(mockSummary);

    store.overrideSelector(selectIsAuthenticated, false);
    store.refreshState();
    expect(service.summary()).toBeNull();
  });
});
