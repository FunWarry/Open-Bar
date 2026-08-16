import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EtablissementService } from '../../../app/core/services/etablissement.service';
import { EstablishmentConfig } from '../../../app/core/models/establishment-config.model';
import { environment } from '../../../environments/environment';

describe('EtablissementService', () => {
  let service: EtablissementService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/admin/establishment`;

  const mockConfig: EstablishmentConfig = {
    id: 1,
    legalName: 'OpenBar SARL',
    legalForm: 'SARL',
    siret: '73282932000074',
    rcsCity: 'Paris',
    rcsNumber: 'B 123 456',
    tvaNumber: 'FR12732829320',
    codeApe: '5630Z',
    capitalSocial: 10000,
    address: '123 Rue de la Soif, 75001 Paris',
    phone: '0102030405',
    email: 'contact@openbar.fr',
    paymentTerms: 'Comptant',
    discountPolicy: 'Aucune',
    latePaymentRate: 3.5,
    timeZone: 'Europe/Paris',
    ticketFormat: '80mm',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EtablissementService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(EtablissementService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get legal establishment configuration', () => {
    service.getConfig().subscribe((config) => {
      expect(config).toEqual(mockConfig);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockConfig);
  });

  it('should update legal establishment configuration', () => {
    service.updateConfig(mockConfig).subscribe((config) => {
      expect(config).toEqual(mockConfig);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockConfig);
    req.flush(mockConfig);
  });

  it('should get available time zones', () => {
    const timezones = ['Europe/Paris', 'UTC', 'America/New_York'];
    service.getTimeZones().subscribe((res) => {
      expect(res).toEqual(timezones);
    });

    const req = httpMock.expectOne(`${apiUrl}/timezones`);
    expect(req.request.method).toBe('GET');
    req.flush(timezones);
  });
});
