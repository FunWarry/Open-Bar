import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IonicModule } from '@ionic/angular';

import { ModalController } from '@ionic/angular/standalone';

import { FactureDetailComponent } from '../../../app/features/factures/facture-detail/facture-detail.component';
import { FactureService } from '../../../app/features/factures/services/facture.service';
import { Facture } from '../../../app/features/factures/models/facture.model';
import { EtablissementService } from '../../../app/core/services/etablissement.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockFacture: Facture = {
  id: 1,
  tableId: 10,
  tableNumero: 3,
  numero: 'FAC-001',
  total: 25.0,
  totalTTC: 30.0,
  dateFacture: '2024-01-15T12:00:00',
  reglee: false,
  items: [
    {
      id: 1,
      factureId: 1,
      commandeItemId: 5,
      description: 'Mojito',
      quantite: 2,
      prixUnitaire: 8.5,
      total: 17.0
    }
  ],
  createdAt: '2024-01-15T12:00:00',
  updatedAt: '2024-01-15T12:00:00'
};

describe('FactureDetailComponent', () => {
  let component: FactureDetailComponent;
  let factureServiceSpy: jasmine.SpyObj<FactureService>;
  let etablissementServiceSpy: jasmine.SpyObj<EtablissementService>;

  beforeEach(async () => {
    factureServiceSpy = jasmine.createSpyObj('FactureService', ['getFactureById', 'reglerFacture']);
    factureServiceSpy.getFactureById.and.returnValue(of(mockFacture));
    factureServiceSpy.reglerFacture.and.returnValue(of({ ...mockFacture, reglee: true }));

    etablissementServiceSpy = jasmine.createSpyObj('EtablissementService', ['getConfig']);
    etablissementServiceSpy.getConfig.and.returnValue(of({
      legalName: 'OpenBar SARL', legalForm: 'SARL', siret: '12345678900010', rcsCity: 'Paris', rcsNumber: 'B 123 456 789',
      tvaNumber: 'FR12123456789', codeApe: '5630Z', capitalSocial: 10000, address: '12 Rue du Bar', phone: '+33123456789',
      email: 'contact@openbar.local', paymentTerms: 'Immediate payment', discountPolicy: 'No discount', latePaymentRate: 0.12
    }));

    await TestBed.configureTestingModule({
      imports: [
        FactureDetailComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '1' }))
          }
        },
        { provide: FactureService, useValue: factureServiceSpy },
        { provide: EtablissementService, useValue: etablissementServiceSpy },
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', ['create'])
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(FactureDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() charge la facture via getFactureById avec l\'id de la route', () => {
    expect(factureServiceSpy.getFactureById).toHaveBeenCalledWith(1);
    expect(component.facture).toEqual(mockFacture);
  });

  it('montantAffiche retourne totalTTC quand disponible', () => {
    component.facture = mockFacture;
    expect(component.montantAffiche).toBe(30.0);
  });

  it('montantAffiche retourne total quand totalTTC est absent', () => {
    component.facture = { ...mockFacture, totalTTC: undefined };
    expect(component.montantAffiche).toBe(25.0);
  });

  it('montantAffiche retourne 0 quand facture est null', () => {
    component.facture = null;
    expect(component.montantAffiche).toBe(0);
  });

  it('statutColor returns "success" for a settled invoice', () => {
    expect(component.statutColor(true)).toBe('success');
  });

  it('statutColor returns "warning" for an unsettled invoice', () => {
    expect(component.statutColor(false)).toBe('warning');
  });

  it('statutLabel returns "FACTURES.SETTLED" for a settled invoice', () => {
    expect(component.statutLabel(true)).toBe('FACTURES.SETTLED');
  });

  it('statutLabel returns "FACTURES.PENDING" for an unsettled invoice', () => {
    expect(component.statutLabel(false)).toBe('FACTURES.PENDING');
  });

  it('trackById retourne l\'id de l\'item', () => {
    const item = mockFacture.items[0];
    expect(component.trackById(0, item)).toBe(item.id);
  });

  it('telechargerPdf opens a new window with PDF URL when invoice is loaded', () => {
    component.facture = mockFacture;
    spyOn(window, 'open');
    component.telechargerPdf();
    expect(window.open).toHaveBeenCalledWith(
      jasmine.stringContaining('/factures/1/pdf'),
      '_blank'
    );
  });

  it('telechargerPdf ne fait rien quand la facture est null', () => {
    component.facture = null;
    spyOn(window, 'open');
    component.telechargerPdf();
    expect(window.open).not.toHaveBeenCalled();
  });

  it('ngOnDestroy completes the destroy$ subject', () => {
    const destroySpy = spyOn((component as any).destroy$, 'next').and.callThrough();
    const completeSpy = spyOn((component as any).destroy$, 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('handles loading error gracefully (invoice remains null)', async () => {
    factureServiceSpy.getFactureById.and.returnValue(throwError(() => new Error('404')));

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        FactureDetailComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '999' }))
          }
        },
        { provide: FactureService, useValue: factureServiceSpy },
        { provide: EtablissementService, useValue: etablissementServiceSpy },
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', ['create'])
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(FactureDetailComponent);
    const errorComponent = fixture.componentInstance;
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(errorComponent.facture).toBeNull();
  });

  it('reglerFacture() opens ReglementModalComponent and calls service on confirm', async () => {
    component.facture = mockFacture;
    const modalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onWillDismiss']);
    modalSpy.present.and.returnValue(Promise.resolve());
    modalSpy.onWillDismiss.and.returnValue(Promise.resolve({
      data: { modePaiement: 'CARTE', pourboire: 5.0, totalTotal: 35.0 }
    }));

    const modalCtrl = TestBed.inject(ModalController) as jasmine.SpyObj<ModalController>;
    modalCtrl.create.and.returnValue(Promise.resolve(modalSpy));

    await component.reglerFacture();

    expect(modalCtrl.create).toHaveBeenCalled();
    expect(modalSpy.present).toHaveBeenCalled();
    expect(factureServiceSpy.reglerFacture).toHaveBeenCalledWith(1, 'CARTE', 5.0);
  });

  it('reglerFacture() does not call service if modal is cancelled', async () => {
    component.facture = mockFacture;
    const modalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onWillDismiss']);
    modalSpy.present.and.returnValue(Promise.resolve());
    modalSpy.onWillDismiss.and.returnValue(Promise.resolve({ data: undefined }));

    const modalCtrl = TestBed.inject(ModalController) as jasmine.SpyObj<ModalController>;
    modalCtrl.create.and.returnValue(Promise.resolve(modalSpy));

    await component.reglerFacture();

    expect(modalCtrl.create).toHaveBeenCalled();
    expect(factureServiceSpy.reglerFacture).not.toHaveBeenCalled();
  });

  it('reglerFacture() does nothing when facture is null or already settled', async () => {
    component.facture = null;
    await component.reglerFacture();
    expect(factureServiceSpy.reglerFacture).not.toHaveBeenCalled();

    component.facture = { ...mockFacture, reglee: true };
    await component.reglerFacture();
    expect(factureServiceSpy.reglerFacture).not.toHaveBeenCalled();
  });

  it('reglerFacture() handles settlement error with error toast', async () => {
    component.facture = mockFacture;
    const modalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onWillDismiss']);
    modalSpy.present.and.returnValue(Promise.resolve());
    modalSpy.onWillDismiss.and.returnValue(Promise.resolve({
      data: { modePaiement: 'CARTE', pourboire: 0, totalTotal: 30.0 }
    }));

    const modalCtrl = TestBed.inject(ModalController) as jasmine.SpyObj<ModalController>;
    modalCtrl.create.and.returnValue(Promise.resolve(modalSpy));

    factureServiceSpy.reglerFacture.and.returnValue(throwError(() => new Error('Server error')));

    await component.reglerFacture();

    expect(factureServiceSpy.reglerFacture).toHaveBeenCalled();
  });
});
