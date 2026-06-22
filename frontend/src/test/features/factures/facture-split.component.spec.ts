import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { FactureSplitComponent } from '../../../app/features/factures/facture-split/facture-split.component';
import { FactureService, SplitResultDTO } from '../../../app/features/factures/services/facture.service';

describe('FactureSplitComponent', () => {
  let component: FactureSplitComponent;
  let fixture: ComponentFixture<FactureSplitComponent>;
  let factureServiceSpy: jasmine.SpyObj<FactureService>;

  const mockSplitResults: SplitResultDTO[] = [
    { sousTotal: 10.5 } as SplitResultDTO,
    { sousTotal: 10.5 } as SplitResultDTO
  ];

  beforeEach(async () => {
    factureServiceSpy = jasmine.createSpyObj<FactureService>('FactureService', [
      'splitEgal'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        FactureSplitComponent,
        IonicModule.forRoot(),
        RouterTestingModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (_key: string) => '42'
              }
            }
          }
        },
        { provide: FactureService, useValue: factureServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FactureSplitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize factureId from route param', () => {
    expect(component).toBeTruthy();
    expect(component.factureId).toBe(42);
  });

  it('should initialize with default values', () => {
    expect(component.mode).toBe('egal');
    expect(component.nombreConvives).toBe(2);
    expect(component.results).toEqual([]);
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBeNull();
  });

  describe('onModeChange()', () => {
    it('should reset results and errorMessage', () => {
      component.results = mockSplitResults;
      component.errorMessage = 'Une erreur';

      component.onModeChange();

      expect(component.results).toEqual([]);
      expect(component.errorMessage).toBeNull();
    });
  });

  describe('ajusterConvives()', () => {
    it('should increase nombreConvives by delta', () => {
      component.nombreConvives = 3;
      component.ajusterConvives(1);
      expect(component.nombreConvives).toBe(4);
    });

    it('should decrease nombreConvives by delta', () => {
      component.nombreConvives = 5;
      component.ajusterConvives(-1);
      expect(component.nombreConvives).toBe(4);
    });

    it('should not go below 2', () => {
      component.nombreConvives = 2;
      component.ajusterConvives(-1);
      expect(component.nombreConvives).toBe(2);
    });

    it('should not exceed 20', () => {
      component.nombreConvives = 20;
      component.ajusterConvives(1);
      expect(component.nombreConvives).toBe(20);
    });
  });

  describe('calculerSplitEgal()', () => {
    it('should call factureService.splitEgal and populate results on success', () => {
      factureServiceSpy.splitEgal.and.returnValue(of(mockSplitResults));

      component.calculerSplitEgal();

      expect(factureServiceSpy.splitEgal).toHaveBeenCalledWith(42, component.nombreConvives);
      expect(component.results).toEqual(mockSplitResults);
      expect(component.loading).toBeFalse();
      expect(component.errorMessage).toBeNull();
    });

    it('should set loading to true during calculation then false after', () => {
      factureServiceSpy.splitEgal.and.returnValue(of(mockSplitResults));

      component.calculerSplitEgal();

      expect(component.loading).toBeFalse();
    });

    it('should set errorMessage on service error with error.message', () => {
      const errorResponse = { error: { message: 'Facture introuvable' } };
      factureServiceSpy.splitEgal.and.returnValue(throwError(() => errorResponse));

      component.calculerSplitEgal();

      expect(component.errorMessage).toBe('Facture introuvable');
      expect(component.loading).toBeFalse();
      expect(component.results).toEqual([]);
    });

    it('should use fallback message when error has no message', () => {
      factureServiceSpy.splitEgal.and.returnValue(throwError(() => ({})));

      component.calculerSplitEgal();

      expect(component.errorMessage).toBe('Erreur lors du calcul');
      expect(component.loading).toBeFalse();
    });
  });

  describe('totalSplit getter', () => {
    it('should return 0 when results is empty', () => {
      component.results = [];
      expect(component.totalSplit).toBe(0);
    });

    it('should sum all sousTotal values', () => {
      component.results = mockSplitResults;
      expect(component.totalSplit).toBe(21);
    });

    it('should compute correct sum for multiple convives', () => {
      component.results = [
        { sousTotal: 5.0 } as SplitResultDTO,
        { sousTotal: 7.5 } as SplitResultDTO,
        { sousTotal: 2.5 } as SplitResultDTO
      ];
      expect(component.totalSplit).toBe(15);
    });
  });
});
