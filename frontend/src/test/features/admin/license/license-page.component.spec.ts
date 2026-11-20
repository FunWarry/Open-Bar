import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ModalController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { LicensePageComponent } from '../../../../app/features/admin/license/license-page.component';
import { LicenseService } from '../../../../app/core/services/license.service';
import { FeatureFlagService } from '../../../../app/core/services/feature-flag.service';
import { selectCurrentUser } from '../../../../app/core/store/auth.selectors';
import { LicenseStatusInfo, LicenseSyncResult } from '../../../../app/core/models/license.model';
import {
  ESTABLISHMENT_PRESETS,
  EstablishmentModule,
} from '../../../../app/core/models/establishment-module.model';
import { User } from '../../../../app/core/models/user.model';

describe('LicensePageComponent', () => {
  let component: LicensePageComponent;
  let fixture: ComponentFixture<LicensePageComponent>;
  let licenseServiceSpy: jasmine.SpyObj<LicenseService>;
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
});
