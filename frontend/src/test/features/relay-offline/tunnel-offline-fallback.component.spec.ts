import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { TunnelOfflineFallbackComponent } from '../../../app/features/relay-offline/tunnel-offline-fallback.component';
import { WhiteLabelBrandingService } from '../../../app/core/services/white-label-branding.service';
import { CloudRelayService } from '../../../app/core/services/cloud-relay.service';
import { PublicBranding } from '../../../app/core/models/cloud-relay.model';

describe('TunnelOfflineFallbackComponent', () => {
  let component: TunnelOfflineFallbackComponent;
  let fixture: ComponentFixture<TunnelOfflineFallbackComponent>;
  let brandingSpy: jasmine.SpyObj<WhiteLabelBrandingService>;
  let cloudRelaySpy: jasmine.SpyObj<CloudRelayService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const healthyBranding: PublicBranding = {
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
    wifiSsid: 'LeShaker-WiFi'
  };

  beforeEach(async () => {
    brandingSpy = jasmine.createSpyObj('WhiteLabelBrandingService', ['loadBranding'], {
      establishmentName: signal('Le Shaker Paris'),
      logoUrl: signal(null),
      wifiEnabled: signal(true),
      wifiSsid: signal('LeShaker-WiFi'),
      localFallbackUrl: signal('https://openbar.local'),
    });
    brandingSpy.loadBranding.and.returnValue(of(healthyBranding));

    cloudRelaySpy = jasmine.createSpyObj('CloudRelayService', ['checkRelayHealth', 'clearTunnelOffline']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [
        TunnelOfflineFallbackComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} }, translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' } })
      ],
      providers: [
        { provide: WhiteLabelBrandingService, useValue: brandingSpy },
        { provide: CloudRelayService, useValue: cloudRelaySpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TunnelOfflineFallbackComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should display venue name and Wi-Fi SSID on fallback screen', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="fallback-venue-name"]')?.textContent).toContain('Le Shaker Paris');
    expect(el.querySelector('[data-testid="fallback-wifi-ssid"]')?.textContent).toContain('LeShaker-WiFi');
  });

  it('should clear offline state and navigate to /client/commande when tunnel reconnects', fakeAsync(() => {
    cloudRelaySpy.checkRelayHealth.and.returnValue(of(healthyBranding));
    fixture.detectChanges();

    component.retryConnection();
    tick();

    expect(cloudRelaySpy.clearTunnelOffline).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/client/commande']);
  }));

  it('should reset countdown cleanly when health probe fails', fakeAsync(() => {
    cloudRelaySpy.checkRelayHealth.and.returnValue(throwError(() => new Error('Still offline')));
    fixture.detectChanges();

    component.retryConnection();
    tick();

    expect(component.isChecking()).toBeFalse();
    expect(component.countdown()).toBe(15);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  }));

  it('should copy Wi-Fi SSID to clipboard and trigger countdown retry at zero', fakeAsync(() => {
    const writeTextSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true
    });
    cloudRelaySpy.checkRelayHealth.and.returnValue(of({ ...healthyBranding, tunnelConnected: false }));

    fixture.detectChanges();
    component.copyWifiSsid();
    tick(2100);
    expect(writeTextSpy).toHaveBeenCalledWith('LeShaker-WiFi');
    expect(component.copiedWifi()).toBeFalse();

    component.countdown.set(1);
    tick(1000);
    expect(cloudRelaySpy.checkRelayHealth).toHaveBeenCalled();
  }));
});
