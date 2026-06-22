import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IonicModule } from '@ionic/angular';

import { FactureDetailComponent } from '../../../app/features/factures/facture-detail/facture-detail.component';
import { FactureService } from '../../../app/features/factures/services/facture.service';
import { Facture } from '../../../app/features/factures/models/facture.model';

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

  beforeEach(async () => {
    factureServiceSpy = jasmine.createSpyObj('FactureService', ['getFactureById']);
    factureServiceSpy.getFactureById.and.returnValue(of(mockFacture));

    await TestBed.configureTestingModule({
      imports: [
        FactureDetailComponent,
        IonicModule.forRoot(),
        RouterTestingModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '1' }))
          }
        },
        { provide: FactureService, useValue: factureServiceSpy }
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

  it('statutColor retourne "success" pour une facture réglée', () => {
    expect(component.statutColor(true)).toBe('success');
  });

  it('statutColor retourne "warning" pour une facture non réglée', () => {
    expect(component.statutColor(false)).toBe('warning');
  });

  it('statutLabel retourne "RÉGLÉE" pour une facture réglée', () => {
    expect(component.statutLabel(true)).toBe('RÉGLÉE');
  });

  it('statutLabel retourne "EN ATTENTE" pour une facture non réglée', () => {
    expect(component.statutLabel(false)).toBe('EN ATTENTE');
  });

  it('trackById retourne l\'id de l\'item', () => {
    const item = mockFacture.items[0];
    expect(component.trackById(0, item)).toBe(item.id);
  });

  it('telechargerPdf ouvre une nouvelle fenêtre avec l\'URL PDF quand la facture est chargée', () => {
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

  it('ngOnDestroy complète le subject destroy$', () => {
    const destroySpy = spyOn((component as any).destroy$, 'next').and.callThrough();
    const completeSpy = spyOn((component as any).destroy$, 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('gère une erreur de chargement sans planter (facture reste null)', async () => {
    factureServiceSpy.getFactureById.and.returnValue(throwError(() => new Error('404')));

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        FactureDetailComponent,
        IonicModule.forRoot(),
        RouterTestingModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '999' }))
          }
        },
        { provide: FactureService, useValue: factureServiceSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(FactureDetailComponent);
    const errorComponent = fixture.componentInstance;
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(errorComponent.facture).toBeNull();
  });
});
