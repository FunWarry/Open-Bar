import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IonicModule } from '@ionic/angular';

import { TicketReceiptComponent } from '../../../app/features/factures/ticket-receipt/ticket-receipt.component';
import { EtablissementService } from '../../../app/core/services/etablissement.service';
import { Facture } from '../../../app/features/factures/models/facture.model';
import { EstablishmentConfig } from '../../../app/core/models/establishment-config.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockFacture: Facture = {
  id: 1,
  tableId: 2,
  tableNumero: 5,
  numero: 'FAC-2026-001',
  total: 20.0,
  totalHT: 16.67,
  totalVAT: 3.33,
  totalTTC: 20.0,
  dateFacture: '2026-06-15T20:00:00',
  reglee: true,
  modePaiement: 'CARTE',
  items: [
    {
      id: 10,
      factureId: 1,
      commandeItemId: 100,
      description: 'Cosmopolitan',
      quantite: 2,
      prixUnitaire: 10.0,
      total: 20.0,
      vatRate: '20%'
    }
  ],
  createdAt: '2026-06-15T20:00:00',
  updatedAt: '2026-06-15T20:00:00'
};

const mockConfig: EstablishmentConfig = {
  id: 1,
  legalName: 'OpenBar SARL',
  legalForm: 'SARL',
  siret: '12345678900010',
  rcsCity: 'Paris',
  rcsNumber: 'B 123 456 789',
  tvaNumber: 'FR12123456789',
  codeApe: '5630Z',
  capitalSocial: 10000,
  address: '12 Rue du Bar, 75001 Paris',
  phone: '+33123456789',
  email: 'contact@openbar.local',
  paymentTerms: 'Immediate payment',
  discountPolicy: 'No discount',
  latePaymentRate: 0.12,
  ticketFormat: '58mm'
};

describe('TicketReceiptComponent', () => {
  let component: TicketReceiptComponent;
  let etablissementServiceSpy: jasmine.SpyObj<EtablissementService>;

  beforeEach(async () => {
    etablissementServiceSpy = jasmine.createSpyObj('EtablissementService', ['getConfig']);
    etablissementServiceSpy.getConfig.and.returnValue(of(mockConfig));

    await TestBed.configureTestingModule({
      imports: [
        TicketReceiptComponent,
        IonicModule.forRoot(),
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: EtablissementService, useValue: etablissementServiceSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(TicketReceiptComponent);
    component = fixture.componentInstance;
    component.facture = mockFacture;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() fetches establishment config if not provided as input and applies ticketFormat', () => {
    expect(etablissementServiceSpy.getConfig).toHaveBeenCalled();
    expect(component.establishmentConfig).toEqual(mockConfig);
    expect(component.selectedFormat).toBe('58mm');
  });

  it('uses ticketFormat Input directly if specified', () => {
    component.ticketFormat = '58mm';
    component.ngOnInit();
    expect(component.selectedFormat).toBe('58mm');
  });

  it('setFormat() switches between 80mm and 58mm formats', () => {
    component.setFormat('80mm');
    expect(component.selectedFormat).toBe('80mm');
    expect(component.dividerString).toBe('--------------------------------');

    component.setFormat('58mm');
    expect(component.selectedFormat).toBe('58mm');
    expect(component.dividerString).toBe('-----------------------');
  });

  it('totalTTC returns totalTTC from facture', () => {
    expect(component.totalTTC).toBe(20.0);
  });

  it('totalHT returns totalHT if present or fallback', () => {
    expect(component.totalHT).toBe(16.67);
  });

  it('totalVAT returns totalVAT if present or fallback', () => {
    expect(component.totalVAT).toBe(3.33);
  });

  it('imprimerTicket triggers window.print()', () => {
    spyOn(window, 'print');
    component.imprimerTicket();
    expect(window.print).toHaveBeenCalled();
  });

  it('supports individual equal split share receipt', () => {
    component.reglement = {
      factureId: 1,
      nomConvive: 'Convive 1',
      partIndex: 1,
      totalParts: 2,
      montant: 10.0,
      pourboire: 1.0,
      totalRegle: 11.0,
      modePaiement: 'CARTE',
      typeSplit: 'EGAL',
    };

    expect(component.isSplitPartReceipt).toBeTrue();
    expect(component.totalTTC).toBe(11.0);
    expect(component.splitPartItems).toHaveSize(1);
    expect(component.splitPartItems[0].description).toContain('Part de l\'addition (1/2)');
  });

  it('supports individual itemized split share receipt', () => {
    component.reglement = {
      factureId: 1,
      nomConvive: 'Alice',
      partIndex: 1,
      montant: 15.0,
      pourboire: 0,
      totalRegle: 15.0,
      modePaiement: 'ESPECES',
      typeSplit: 'SELECTION',
      items: [
        { itemId: 10, description: 'Mojito', quantite: 1, prixUnitaire: 15.0, total: 15.0 }
      ],
    };

    expect(component.isSplitPartReceipt).toBeTrue();
    expect(component.totalTTC).toBe(15.0);
    expect(component.splitPartItems).toHaveSize(1);
    expect(component.splitPartItems[0].description).toBe('Mojito');
  });

  it('trackById returns item id', () => {
    expect(component.trackById(0, mockFacture.items[0])).toBe(10);
  });

  it('falls back to default establishmentConfig on service error', () => {
    etablissementServiceSpy.getConfig.and.returnValue(throwError(() => new Error('Config load failed')));

    component.establishmentConfig = undefined;
    component.ngOnInit();

    expect(component.establishmentConfig).toBeDefined();
    expect((component.establishmentConfig as any)?.legalName).toBe('OpenBar SARL');
  });

  it('computes fallbacks for totalHT and totalVAT when not set explicitly', () => {
    component.reglement = undefined;
    component.facture = {
      ...mockFacture,
      totalHT: undefined,
      totalVAT: undefined,
      totalTTC: 30.0,
      total: 30.0
    };

    expect(component.splitPartItems).toEqual([]);
    expect(component.totalHT).toBeCloseTo(25.0, 1);
    expect(component.totalVAT).toBeCloseTo(5.0, 1);
  });
});
