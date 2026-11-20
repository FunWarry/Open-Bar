import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { WhiteLabelBrandingService } from '../../../app/core/services/white-label-branding.service';
import { CloudRelayService } from '../../../app/core/services/cloud-relay.service';
import { ThemeService } from '../../../app/core/services/theme.service';
import { PublicBranding } from '../../../app/core/models/cloud-relay.model';

describe('WhiteLabelBrandingService', () => {
  let service: WhiteLabelBrandingService;
  let cloudRelaySpy: jasmine.SpyObj<CloudRelayService>;
  let themeSpy: jasmine.SpyObj<ThemeService>;

  const mockBranding: PublicBranding = {
    establishmentName: 'Le Shaker Paris',
    venueSlug: 'le-shaker-paris',
    customDomain: 'commande.leshaker.fr',
    primaryColor: '#ff5500',
    primaryColorStrong: '#cc4400',
    logoUrl: 'https://cdn.example.com/logo.png',
    bannerImageUrl: 'https://cdn.example.com/banner.jpg',
    defaultTheme: 'DARK',
    cloudRelayEnabled: true,
    tunnelConnected: true,
    clientsEnabled: true,
    staffEnabled: true,
    effectivePublicUrl: 'https://commande.leshaker.fr',
    localFallbackUrl: 'https://openbar.local',
    wifiEnabled: true,
    wifiSsid: 'LeShaker-Guest',
  };

  beforeEach(() => {
    cloudRelaySpy = jasmine.createSpyObj('CloudRelayService', ['getPublicBranding']);
    themeSpy = jasmine.createSpyObj('ThemeService', ['setCustomColors'], {
      currentCustomColors: {
        primary: '#6C7FE8',
        bgDark: '#0F0F1A',
        surfaceDark: '#1A1A2E',
        bgLight: '#F8FAFC',
        surfaceLight: '#FFFFFF',
        roleAdmin: '#9B8AF2',
        roleManager: '#F0A33B',
        roleServeur: '#34C77B',
        roleBarman: '#4FC3F7',
      }
    });

    TestBed.configureTestingModule({
      providers: [
        WhiteLabelBrandingService,
        { provide: CloudRelayService, useValue: cloudRelaySpy },
        { provide: ThemeService, useValue: themeSpy }
      ]
    });

    service = TestBed.inject(WhiteLabelBrandingService);
  });

  it('should load public branding and apply theme CSS variables and title', () => {
    cloudRelaySpy.getPublicBranding.and.returnValue(of(mockBranding));

    service.loadBranding().subscribe(res => {
      expect(res).toEqual(mockBranding);
    });

    expect(service.establishmentName()).toBe('Le Shaker Paris');
    expect(service.logoUrl()).toBe('https://cdn.example.com/logo.png');
    expect(service.bannerImageUrl()).toBe('https://cdn.example.com/banner.jpg');
    expect(service.effectivePublicUrl()).toBe('https://commande.leshaker.fr');
    expect(service.wifiSsid()).toBe('LeShaker-Guest');
    expect(service.tunnelConnected()).toBeTrue();
    expect(themeSpy.setCustomColors).toHaveBeenCalled();
  });

  it('should handle branding fetch errors gracefully without throwing', () => {
    cloudRelaySpy.getPublicBranding.and.returnValue(throwError(() => new Error('Offline')));

    service.loadBranding().subscribe(res => {
      expect(res).toBeNull();
    });

    expect(service.establishmentName()).toBe('OpenBar');
  });
});
