import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { LicenseBannerComponent } from '../../../app/core/components/license-banner/license-banner.component';
import { LicenseService } from '../../../app/core/services/license.service';
import { MonetizationService } from '../../../app/core/services/monetization.service';
import { LicenseSummaryInfo } from '../../../app/core/models/license.model';
import { MonetizationSummary } from '../../../app/core/models/monetization.model';
import { selectCurrentUser } from '../../../app/core/store/auth.selectors';

describe('LicenseBannerComponent', () => {
  let component: LicenseBannerComponent;
  let fixture: ComponentFixture<LicenseBannerComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let summarySig: ReturnType<typeof signal<LicenseSummaryInfo | null>>;
  let graceSig: ReturnType<typeof signal<boolean>>;
  let showBannerSig: ReturnType<typeof signal<boolean>>;
  let monSummarySig: ReturnType<typeof signal<MonetizationSummary | null>>;
  let monShowBannerSig: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    summarySig = signal<LicenseSummaryInfo | null>(null);
    graceSig = signal<boolean>(false);
    showBannerSig = signal<boolean>(false);
    monSummarySig = signal<MonetizationSummary | null>(null);
    monShowBannerSig = signal<boolean>(false);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    const licenseServiceStub = {
      summary: summarySig,
      isInGracePeriod: graceSig,
      shouldShowStaffBanner: showBannerSig,
    };

    const monetizationServiceStub = {
      summary: monSummarySig,
      shouldShowBanner: monShowBannerSig,
    };

    await TestBed.configureTestingModule({
      imports: [
        LicenseBannerComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: { LICENSE: { BANNER: { GRACE_TITLE: 'Grace {{ hours }}h', EXPIRED_TITLE: 'Expired' } } } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: LicenseService, useValue: licenseServiceStub },
        { provide: MonetizationService, useValue: monetizationServiceStub },
        { provide: Router, useValue: routerSpy },
        provideMockStore({
          selectors: [{ selector: selectCurrentUser, value: { id: 1, username: 'admin', roles: ['ADMIN'] } }],
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LicenseBannerComponent);
    component = fixture.componentInstance;
  });

  it('should stay hidden when license is valid or community', () => {
    showBannerSig.set(false);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('[data-testid="license-global-banner"]');
    expect(banner).toBeNull();
  });

  it('should render warning banner during 2-day grace period and navigate to /admin/license', () => {
    summarySig.set({
      status: 'GRACE_PERIOD',
      plan: 'PRO',
      expiresAt: '2026-11-19T00:00:00Z',
      graceEndsAt: '2026-11-21T00:00:00Z',
      graceHoursRemaining: 32,
      orderCreationAllowed: true,
      enforced: true,
    });
    graceSig.set(true);
    showBannerSig.set(true);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('[data-testid="license-global-banner"]');
    expect(banner).toBeTruthy();
    expect(banner.classList).toContain('tone-grace');

    component.goToLicenseSettings();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/license']);
  });

  it('should render danger lock banner when expired and allow navigating to /factures', () => {
    summarySig.set({
      status: 'EXPIRED',
      plan: 'PRO',
      expiresAt: '2026-11-10T00:00:00Z',
      graceEndsAt: '2026-11-12T00:00:00Z',
      graceHoursRemaining: 0,
      orderCreationAllowed: false,
      enforced: true,
    });
    graceSig.set(false);
    showBannerSig.set(true);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('[data-testid="license-global-banner"]');
    expect(banner).toBeTruthy();
    expect(banner.classList).toContain('tone-expired');

    component.goToInvoices();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/factures']);
  });

  it('should render monetization commission grace banner when pending commission invoice is active', () => {
    monSummarySig.set({
      activeTier: 'CONCERT_IP_OFFLINE',
      billingPeriod: '2026-11',
      invoiceStatus: 'GRACE_PERIOD',
      remoteInvoiceId: 'in_comm_1',
      pendingAmount: 19.5,
      graceEndsAt: '2026-11-26T00:00:00Z',
      graceHoursRemaining: 36,
      enforceGraceLock: false,
      tpeCardLocked: false,
      shouldShowBanner: true,
    });
    monShowBannerSig.set(true);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('[data-testid="monetization-global-banner"]');
    expect(banner).toBeTruthy();
    expect(banner.classList).toContain('tone-grace');
  });
});
