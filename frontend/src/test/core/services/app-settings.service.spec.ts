import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppSettingsService } from '../../../app/core/services/app-settings.service';
import { AppSettings } from '../../../app/core/models/app-settings.model';
import { environment } from '../../../environments/environment';

describe('AppSettingsService', () => {
  let service: AppSettingsService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/settings`;

  const mockSettings: AppSettings = {
    id: 1,
    primaryColor: '#6c7fe8',
    primaryColorStrong: '#5a68d6',
    logoUrl: null,
    establishmentName: 'OpenBar',
    defaultTheme: 'DARK',
    updatedAt: '2026-07-09T00:00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [AppSettingsService],
    });
    service = TestBed.inject(AppSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--primary-strong');
    document.documentElement.style.removeProperty('--ion-color-primary-rgb');
  });

  afterEach(() => httpMock.verify());

  it('getSettings() appelle GET /api/settings', () => {
    service.getSettings().subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockSettings);
  });

  it('getSettings() retourne les réglages et applique les tokens couleur sur :root', () => {
    service.getSettings().subscribe(result => {
      expect(result).toEqual(mockSettings);
    });
    const req = httpMock.expectOne(baseUrl);
    req.flush(mockSettings);

    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#6c7fe8');
    expect(document.documentElement.style.getPropertyValue('--primary-strong')).toBe('#5a68d6');
  });

  it('applyTokens() calcule --ion-color-primary-rgb depuis primaryColor pour rester cohérent avec les effets Ionic', () => {
    service.applyTokens({ primaryColor: '#ff0000', primaryColorStrong: '#cc0000' });
    expect(document.documentElement.style.getPropertyValue('--ion-color-primary-rgb')).toBe('255, 0, 0');
  });

  it('applyTokens() retombe sur le RGB par défaut si primaryColor n\'est pas un hex valide', () => {
    service.applyTokens({ primaryColor: 'pas-un-hex', primaryColorStrong: '#cc0000' });
    expect(document.documentElement.style.getPropertyValue('--ion-color-primary-rgb')).toBe('108, 127, 232');
  });

  it('updateSettings() appelle PUT /api/settings avec le payload', () => {
    const payload = {
      primaryColor: '#ff0000',
      primaryColorStrong: '#cc0000',
      logoUrl: null,
      establishmentName: 'Le Bar Test',
      defaultTheme: 'DARK' as const,
    };
    service.updateSettings(payload).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...mockSettings, ...payload });
  });

  it('updateSettings() propage une erreur 403 si non-admin', () => {
    let errorReceived = false;
    service.updateSettings({
      primaryColor: '#6c7fe8', primaryColorStrong: '#5a68d6', logoUrl: null,
      establishmentName: 'OpenBar', defaultTheme: 'DARK',
    }).subscribe({
      error: () => { errorReceived = true; },
    });
    const req = httpMock.expectOne(baseUrl);
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    expect(errorReceived).toBe(true);
  });
});
