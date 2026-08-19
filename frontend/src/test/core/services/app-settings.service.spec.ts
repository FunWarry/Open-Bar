import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppSettingsService } from '../../../app/core/services/app-settings.service';
import { AppSettings, AppSettingsUpdateRequest } from '../../../app/core/models/app-settings.model';
import { environment } from '../../../environments/environment';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { of } from 'rxjs';

describe('AppSettingsService', () => {
  let service: AppSettingsService;
  let httpMock: HttpTestingController;
  let wsMock: jasmine.SpyObj<WebSocketService>;
  const baseUrl = `${environment.apiUrl}/settings`;

  const mockSettings: AppSettings = {
    id: 1,
    primaryColor: '#6c7fe8',
    primaryColorStrong: '#5a68d6',
    logoUrl: null,
    establishmentName: 'OpenBar',
    defaultTheme: 'DARK',
    tempsAlerteWarningMinutes: 3,
    tempsAlerteCommandeMinutes: 5,
    tempsAlerteCritiqueCommandeMinutes: 10,
    updatedAt: '2026-07-09T00:00:00',
  };

  beforeEach(() => {
    wsMock = jasmine.createSpyObj('WebSocketService', ['watch', 'connect', 'isConnected']);
    wsMock.watch.and.returnValue(of());

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [
        AppSettingsService,
        { provide: WebSocketService, useValue: wsMock }
      ],
    });
    service = TestBed.inject(AppSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--primary-strong');
    document.documentElement.style.removeProperty('--ion-color-primary-rgb');
  });

  afterEach(() => httpMock.verify());

  it('should call GET /api/settings and update settings$ stream', () => {
    let emitted: any = null;
    service.settings$.subscribe(val => (emitted = val));

    service.getSettings().subscribe(result => {
      expect(result).toEqual(mockSettings);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockSettings);

    expect(emitted).toEqual(mockSettings);
    expect(service.currentSettings).toEqual(mockSettings);
  });

  it('getSettings() returns settings and applies color tokens on :root', () => {
    service.getSettings().subscribe(result => {
      expect(result).toEqual(mockSettings);
    });
    const req = httpMock.expectOne(baseUrl);
    req.flush(mockSettings);

    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#6c7fe8');
    expect(document.documentElement.style.getPropertyValue('--primary-strong')).toBe('#5a68d6');
  });

  it('applyTokens() calculates --ion-color-primary-rgb from primaryColor for Ionic effects consistency', () => {
    service.applyTokens({ primaryColor: '#ff0000', primaryColorStrong: '#cc0000' });
    expect(document.documentElement.style.getPropertyValue('--ion-color-primary-rgb')).toBe('255, 0, 0');
  });

  it('applyTokens() falls back to default RGB if primaryColor is invalid hex', () => {
    service.applyTokens({ primaryColor: 'pas-un-hex', primaryColorStrong: '#cc0000' });
    expect(document.documentElement.style.getPropertyValue('--ion-color-primary-rgb')).toBe('108, 127, 232');
  });

  it('updateSettings() calls PUT /api/settings with payload including alert thresholds', () => {
    const payload: AppSettingsUpdateRequest = {
      primaryColor: '#ff0000',
      primaryColorStrong: '#cc0000',
      logoUrl: null,
      establishmentName: 'Le Bar Test',
      defaultTheme: 'DARK',
      tempsAlerteWarningMinutes: 2,
      tempsAlerteCommandeMinutes: 4,
      tempsAlerteCritiqueCommandeMinutes: 8,
    };
    service.updateSettings(payload).subscribe(res => {
      expect(res.tempsAlerteWarningMinutes).toBe(2);
      expect(res.tempsAlerteCommandeMinutes).toBe(4);
      expect(res.tempsAlerteCritiqueCommandeMinutes).toBe(8);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...mockSettings, ...payload });

    expect(service.currentSettings?.tempsAlerteWarningMinutes).toBe(2);
  });

  it('updateSettings() propagates error when unauthorized', () => {
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
