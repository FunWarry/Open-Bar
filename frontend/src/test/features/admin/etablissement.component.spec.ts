import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { EtablissementComponent, siretLuhnValidator } from '../../../app/features/admin/etablissement/etablissement.component';
import { EtablissementService } from '../../../app/core/services/etablissement.service';
import { EstablishmentConfig } from '../../../app/core/models/establishment-config.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { FormControl } from '@angular/forms';

describe('EtablissementComponent', () => {
  let component: EtablissementComponent;
  let fixture: ComponentFixture<EtablissementComponent>;
  let etablissementServiceSpy: jasmine.SpyObj<EtablissementService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const mockConfig: EstablishmentConfig = {
    id: 1,
    legalName: 'OpenBar SARL',
    legalForm: 'SARL',
    siret: '73282932000074',
    rcsCity: 'Paris',
    rcsNumber: 'B 123',
    tvaNumber: 'FR12732829320',
    codeApe: '5630Z',
    capitalSocial: 10000,
    address: '12 Rue du Bar',
    phone: '+33123456789',
    email: 'contact@openbar.local',
    paymentTerms: 'Paiement immédiat',
    discountPolicy: 'Aucun',
    latePaymentRate: 0.12,
  };

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    etablissementServiceSpy = jasmine.createSpyObj('EtablissementService', ['getConfig', 'updateConfig', 'getTimeZones']);
    etablissementServiceSpy.getConfig.and.returnValue(of(mockConfig));
    etablissementServiceSpy.updateConfig.and.returnValue(of(mockConfig));
    etablissementServiceSpy.getTimeZones.and.returnValue(of(['SYSTEM', 'Europe/Paris']));


    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [EtablissementComponent, IonicModule.forRoot(), getTranslocoTestingModule()],
      providers: [
        { provide: EtablissementService, useValue: etablissementServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EtablissementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant et charger la configuration', () => {
    expect(component).toBeTruthy();
    expect(etablissementServiceSpy.getConfig).toHaveBeenCalled();
    expect(component.configForm.get('legalName')?.value).toBe('OpenBar SARL');
  });

  it('siretLuhnValidator devrait valider un SIRET correct et rejeter un SIRET erroné', () => {
    const validControl = new FormControl('73282932000074');
    expect(siretLuhnValidator(validControl)).toBeNull();

    const invalidControl = new FormControl('12345678900000');
    expect(siretLuhnValidator(invalidControl)).toEqual({ siretLuhnFailed: true });

    const shortControl = new FormControl('1234');
    expect(siretLuhnValidator(shortControl)).toEqual({ invalidSiretFormat: true });
  });

  it('onSave() devrait appeler updateConfig() si le formulaire est valide', () => {
    component.configForm.patchValue({
      legalName: 'OpenBar SARL',
      siret: '73282932000074',
      tvaNumber: 'FR12732829320',
      address: '12 Rue du Bar',
    });

    component.onSave();

    expect(etablissementServiceSpy.updateConfig).toHaveBeenCalled();
  });

  it('onSave() ne devrait pas soumettre si le formulaire est invalide', () => {
    component.configForm.patchValue({
      siret: 'invalid_siret',
    });

    component.onSave();

    expect(etablissementServiceSpy.updateConfig).not.toHaveBeenCalled();
  });
});
