import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ModalController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { LicensePageComponent } from '../../../../app/features/admin/license/license-page.component';
import { LicenseService } from '../../../../app/core/services/license.service';
import { MonetizationService } from '../../../../app/core/services/monetization.service';
import { FeatureFlagService } from '../../../../app/core/services/feature-flag.service';
import { selectCurrentUser } from '../../../../app/core/store/auth.selectors';
import { LicenseStatusInfo, LicenseSyncResult } from '../../../../app/core/models/license.model';
import { MonetizationDashboard } from '../../../../app/core/models/monetization.model';
import {
  ESTABLISHMENT_PRESETS,
  EstablishmentModule,
} from '../../../../app/core/models/establishment-module.model';
import { User } from '../../../../app/core/models/user.model';

describe('LicensePageComponent', () => {
  let component: LicensePageComponent;
  let fixture: ComponentFixture<LicensePageComponent>;
  let licenseServiceSpy: jasmine.SpyObj<LicenseService>;
  let monetizationServiceSpy: jasmine.SpyObj<MonetizationService>;
  let featureFlagSpy: jasmine.SpyObj<FeatureFlagService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let store: MockStore;

  const validLicense: LicenseStatusInfo = {
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
    lastSyncAt: '2026-11-20T10:00:00Z',
    lastSyncStatus: 'SUCCESS',
    lastSyncError: null,
    activationMode: 'OFFLINE',
    activatedBy: 'admin',
    publicKeyFingerprint: 'AA:BB:CC:DD',
    maskedToken: 'eyJhbGciOi...xyz',
  };

  beforeEach(async () => {
    licenseServiceSpy = jasmine.createSpyObj<LicenseService>('LicenseService', [
      'getFullStatus',
      'activateOfflineLicense',
      'syncOnline',
      'deactivateLicense',
    ]);
    licenseServiceSpy.getFullStatus.and.returnValue(of(validLicense));

    monetizationServiceSpy = jasmine.createSpyObj<MonetizationService>('MonetizationService', [
      'getDashboard',
      'verifyIntegrity',
      'exportMonthlyProof',
      'syncOnline',
    ]);
    const mockMonDashboard: MonetizationDashboard = {
      billingPeriod: '2026-11',
      venueEstablishmentId: '73282932000074',
      rates: {
        activeTier: 'CONCERT_IP_OFFLINE',
        option1RateBps: 120,
        option1FixedCents: 10,
        option3RateBps: 45,
        option3FixedCents: 5,
        tpeHardwareMode: 'CONCERT_IP',
        stripeTerminalModuleEnabled: true,
        stripeConnectAccountConfigured: false,
      },
      summary: {
        activeTier: 'CONCERT_IP_OFFLINE',
        billingPeriod: '2026-11',
        invoiceStatus: 'NONE',
        remoteInvoiceId: null,
        pendingAmount: 0,
        graceEndsAt: null,
        graceHoursRemaining: 0,
        enforceGraceLock: false,
        tpeCardLocked: false,
        shouldShowBanner: false,
      },
      option1Volume: 80.5,
      option1Count: 2,
      option1Commission: 1.17,
      option3Volume: 64.0,
      option3Count: 1,
      option3Commission: 0.34,
      totalCommissionDue: 1.17,
      lastSyncAt: null,
      lastSyncStatus: 'NONE',
      lastSyncError: null,
      lastExportedAt: null,
      integrity: {
        valid: true,
        totalEntries: 3,
        verifiedEntries: 3,
        tipHash: 'abcdef1234567890abcdef1234567890',
        brokenSequenceNumber: null,
        message: 'Verified 3 entries',
      },
      entries: [],
      billingHistory: [],
    };
    monetizationServiceSpy.getDashboard.and.returnValue(of(mockMonDashboard));

    featureFlagSpy = jasmine.createSpyObj<FeatureFlagService>('FeatureFlagService', ['loadModules']);
    featureFlagSpy.loadModules.and.returnValue(of(ESTABLISHMENT_PRESETS.BAR));

    toastCtrlSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrlSpy.create.and.resolveTo({ present: jasmine.createSpy('present').and.resolveTo() } as never);

    modalCtrlSpy = jasmine.createSpyObj<ModalController>('ModalController', ['create']);
    modalCtrlSpy.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.resolveTo({ data: { confirmed: true } }),
    } as never);

    await TestBed.configureTestingModule({
      imports: [
        LicensePageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              LICENSE: {
                TITLE: 'License',
                ERRORS: {
                  INVALID_JWT_FORMAT: 'Invalid JWT format',
                  ACTIVATION_FAILED: 'Activation failed',
                },
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        provideRouter([]),
        provideMockStore({
          initialState: {
            auth: {
              user: null,
              token: null,
              isAuthenticated: false,
              error: null,
            },
          },
          selectors: [
            {
              selector: selectCurrentUser,
              value: {
                id: 1,
                username: 'admin',
                email: 'admin@openbar.fr',
                roles: ['ADMIN'],
                enabled: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
              } satisfies User,
            },
          ],
        }),
        { provide: LicenseService, useValue: licenseServiceSpy },
        { provide: MonetizationService, useValue: monetizationServiceSpy },
        { provide: FeatureFlagService, useValue: featureFlagSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(LicensePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load and display license diagnostics and module entitlements', () => {
    expect(licenseServiceSpy.getFullStatus).toHaveBeenCalled();
    expect(component.license()?.plan).toBe('PRO');
    expect(component.isModuleIncluded(EstablishmentModule.FLOOR_PLAN)).toBeTrue();
    expect(component.isModuleIncluded(EstablishmentModule.CUISINE_KDS)).toBeFalse();
  });

  it('should reject malformed non-JWT strings before calling backend', () => {
    component.offlineTokenInput = 'not-a-jwt';
    component.activateOffline();

    expect(component.activationError()).toBe('Invalid JWT format');
    expect(licenseServiceSpy.activateOfflineLicense).not.toHaveBeenCalled();
  });

  it('should activate valid offline JWT token and refresh modules', () => {
    licenseServiceSpy.activateOfflineLicense.and.returnValue(of(validLicense));
    component.offlineTokenInput = 'header.payload.signature';

    component.activateOffline();

    expect(licenseServiceSpy.activateOfflineLicense).toHaveBeenCalledWith('header.payload.signature');
    expect(component.offlineTokenInput).toBe('');
    expect(featureFlagSpy.loadModules).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should surface backend signature error on invalid offline token', () => {
    licenseServiceSpy.activateOfflineLicense.and.returnValue(
      throwError(() => ({ error: { message: 'Invalid license signature' } }))
    );
    component.offlineTokenInput = 'header.payload.bad';

    component.activateOffline();

    expect(component.activationError()).toBe('Invalid license signature');
  });

  it('should trigger online sync and display diagnostic feedback', () => {
    const syncRes: LicenseSyncResult = {
      synced: false,
      reachable: false,
      syncStatus: 'OFFLINE',
      message: 'Offline mode active',
      license: { ...validLicense, lastSyncStatus: 'OFFLINE' },
    };
    licenseServiceSpy.syncOnline.and.returnValue(of(syncRes));

    component.syncOnline();

    expect(licenseServiceSpy.syncOnline).toHaveBeenCalled();
    expect(component.syncFeedback()).toBe('Offline mode active');
  });

  it('should confirm and deactivate license when admin confirms modal', async () => {
    licenseServiceSpy.deactivateLicense.and.returnValue(
      of({ ...validLicense, status: 'UNLICENSED', orderCreationAllowed: false, maskedToken: null })
    );

    await component.confirmDeactivate();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(licenseServiceSpy.deactivateLicense).toHaveBeenCalled();
    expect(component.license()?.orderCreationAllowed).toBeFalse();
  });

  it('should show read-only notice for non-ADMIN manager users', () => {
    store.overrideSelector(selectCurrentUser, {
      id: 2,
      username: 'manager',
      email: 'manager@openbar.fr',
      roles: ['MANAGER'],
      enabled: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    store.refreshState();
    fixture.detectChanges();

    expect(component.isAdmin()).toBeFalse();
    const notice = fixture.nativeElement.querySelector('[data-testid="license-readonly-notice"]');
    expect(notice).toBeTruthy();
  });

  it('should handle file selection, clipboard copy, status badges, and error branches', async () => {
    const file = new File(['  header.payload.fromfile  '], 'license.jwt', { type: 'text/plain' });
    const mockInput = { files: [file], value: 'fake' } as unknown as HTMLInputElement;
    await component.onFileSelected({ target: mockInput } as unknown as Event);
    expect(component.offlineTokenInput).toBe('header.payload.fromfile');
    expect(mockInput.value).toBe('');

    // Trigger empty file picker branch
    await component.onFileSelected({ target: { files: [] } } as unknown as Event);

    // Status computations for GRACE_PERIOD, COMMUNITY, EXPIRED
    component.license.set({ ...validLicense, status: 'GRACE_PERIOD', graceHoursRemaining: 16 });
    expect(component.validityStatValue()).toBe('16h');
    expect(component.statusBadgeColor()).toBe('warning');
    expect(component.statusColor()).toBe('warning');

    component.license.set({ ...validLicense, status: 'COMMUNITY', allModulesLicensed: true });
    expect(component.validityStatValue()).toBe('∞');
    expect(component.isModuleIncluded(EstablishmentModule.CUISINE_KDS)).toBeTrue();

    component.license.set({ ...validLicense, status: 'EXPIRED', orderCreationAllowed: false });
    expect(component.validityStatValue()).toBe('0');
    expect(component.statusBadgeColor()).toBe('danger');
    expect(component.getStatusLabelKey(null)).toBe('LICENSE.STATUS.UNKNOWN');

    // Clipboard copy
    const writeTextSpy = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    await component.copyVenueId();
    expect(writeTextSpy).toHaveBeenCalledWith('73282932000074');

    // Error branches on load / sync / deactivate
    licenseServiceSpy.getFullStatus.and.returnValue(throwError(() => new Error('Network')));
    component.loadLicenseStatus();
    expect(component.isLoading()).toBeFalse();

    licenseServiceSpy.syncOnline.and.returnValue(throwError(() => new Error('Sync err')));
    component.syncOnline();
    expect(component.isSyncing()).toBeFalse();

    licenseServiceSpy.deactivateLicense.and.returnValue(throwError(() => new Error('Deactivate err')));
    await component.confirmDeactivate();
    expect(component.isDeactivating()).toBeFalse();
  });

  it('should verify SHA-256 ledger integrity, export monthly proof, and sync online commissions', async () => {
    monetizationServiceSpy.verifyIntegrity.and.returnValue(
      of({
        valid: true,
        totalEntries: 3,
        verifiedEntries: 3,
        tipHash: '1234567890abcdef1234567890abcdef',
        brokenSequenceNumber: null,
        message: 'Verified',
      })
    );
    component.verifyLedgerIntegrity();
    expect(monetizationServiceSpy.verifyIntegrity).toHaveBeenCalled();
    expect(component.verificationResult()?.valid).toBeTrue();

    monetizationServiceSpy.exportMonthlyProof.and.returnValue(
      of({
        billingPeriod: '2026-11',
        establishmentId: '73282932000074',
        generatedAt: '2026-11-20T15:00:00Z',
        option1Volume: 80.5,
        option1Count: 2,
        option1Commission: 1.17,
        option3Volume: 64.0,
        option3Count: 1,
        option3Commission: 0.34,
        totalCommissionDue: 1.17,
        startLedgerHash: '0'.repeat(64),
        endLedgerHash: 'a'.repeat(64),
        ledgerChainValid: true,
        zReports: [],
        canonicalPayloadDigest: 'b'.repeat(64),
        hmacSignature: 'c'.repeat(64),
        compactProofToken: 'compact-token-123',
      })
    );
    component.downloadMonthlyProof();
    expect(monetizationServiceSpy.exportMonthlyProof).toHaveBeenCalled();
    expect(component.lastExportedProof()?.compactProofToken).toBe('compact-token-123');

    const writeTextSpy = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    await component.copyProofToken();
    expect(writeTextSpy).toHaveBeenCalledWith('compact-token-123');

    monetizationServiceSpy.syncOnline.and.returnValue(
      of({
        synced: true,
        onlineReachable: true,
        syncStatus: 'SUCCESS',
        syncedEntriesCount: 2,
        message: 'Synced with Stripe Billing',
        summary: {
          activeTier: 'CONCERT_IP_OFFLINE',
          billingPeriod: '2026-11',
          invoiceStatus: 'PENDING',
          remoteInvoiceId: 'in_1',
          pendingAmount: 1.17,
          graceEndsAt: null,
          graceHoursRemaining: 0,
          enforceGraceLock: false,
          tpeCardLocked: false,
          shouldShowBanner: true,
        },
      })
    );
    component.syncCommissionOnline();
    expect(monetizationServiceSpy.syncOnline).toHaveBeenCalled();
    expect(component.commissionSyncFeedback()).toBe('Synced with Stripe Billing');
    expect(component.formatTierRate(120, 10)).toBe('1.20% + 0.10€');
    expect(component.shortenHash('short')).toBe('short');
    expect(component.shortenHash('abcdef1234567890abcdef1234567890')).toContain('…');

    component.onPeriodChange('2026-10');
    expect(component.selectedPeriod).toBe('2026-10');
    expect(monetizationServiceSpy.getDashboard).toHaveBeenCalledWith('2026-10');

    monetizationServiceSpy.verifyIntegrity.and.returnValue(throwError(() => new Error('Verify err')));
    component.verifyLedgerIntegrity();
    expect(component.isVerifyingLedger()).toBeFalse();

    monetizationServiceSpy.exportMonthlyProof.and.returnValue(throwError(() => new Error('Export err')));
    component.downloadMonthlyProof();
    expect(component.isExportingProof()).toBeFalse();

    monetizationServiceSpy.syncOnline.and.returnValue(throwError(() => new Error('Sync err')));
    component.syncCommissionOnline();
    expect(component.isSyncingCommissions()).toBeFalse();
  });
});
