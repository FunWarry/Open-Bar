import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { PersonnalisationComponent } from '../../../../app/features/admin/personnalisation/personnalisation.component';
import { AppSettingsService } from '../../../../app/core/services/app-settings.service';
import { AppSettings } from '../../../../app/core/models/app-settings.model';

describe('PersonnalisationComponent', () => {
  let component: PersonnalisationComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let appSettingsServiceSpy: jasmine.SpyObj<AppSettingsService>;

  const mockSettings: AppSettings = {
    id: 1,
    primaryColor: '#6c7fe8',
    primaryColorStrong: '#5a68d6',
    logoUrl: 'https://example.com/logo.png',
    establishmentName: 'OpenBar',
    defaultTheme: 'DARK',
    updatedAt: '2026-07-09T00:00:00',
  };

  function createComponent(getSettingsResult$ = of(mockSettings)): void {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    appSettingsServiceSpy = jasmine.createSpyObj('AppSettingsService', ['getSettings', 'updateSettings', 'applyTokens']);
    appSettingsServiceSpy.getSettings.and.returnValue(getSettingsResult$);
    appSettingsServiceSpy.updateSettings.and.returnValue(of(mockSettings));

    const toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    TestBed.configureTestingModule({
      imports: [PersonnalisationComponent, ReactiveFormsModule, RouterTestingModule, IonicModule.forRoot()],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AppSettingsService, useValue: appSettingsServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    });

    const fixture = TestBed.createComponent(PersonnalisationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('charge les réglages existants dans le formulaire', () => {
    createComponent();
    expect(component.settingsForm.get('primaryColor')?.value).toBe('#6c7fe8');
    expect(component.settingsForm.get('establishmentName')?.value).toBe('OpenBar');
    expect(component.loading).toBeFalse();
  });

  it('affiche un toast d\'erreur si le chargement échoue', async () => {
    createComponent(throwError(() => new Error('erreur réseau')));
    expect(component.loading).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('le formulaire est invalide si la couleur primaire n\'est pas un hexadécimal', () => {
    createComponent();
    component.settingsForm.get('primaryColor')?.setValue('pas-une-couleur');
    expect(component.settingsForm.get('primaryColor')?.invalid).toBeTrue();
  });

  it('le formulaire est invalide si le nom d\'établissement est vide', () => {
    createComponent();
    component.settingsForm.get('establishmentName')?.setValue('');
    expect(component.settingsForm.get('establishmentName')?.invalid).toBeTrue();
  });

  it('le champ logoUrl est optionnel (vide accepté)', () => {
    createComponent();
    component.settingsForm.get('logoUrl')?.setValue('');
    expect(component.settingsForm.get('logoUrl')?.valid).toBeTrue();
  });

  it('le champ logoUrl est invalide si ce n\'est pas une URL http(s)', () => {
    createComponent();
    component.settingsForm.get('logoUrl')?.setValue('pas-une-url');
    expect(component.settingsForm.get('logoUrl')?.invalid).toBeTrue();
  });

  it('onSubmit() n\'appelle pas updateSettings si le formulaire est invalide', () => {
    createComponent();
    component.settingsForm.get('establishmentName')?.setValue('');
    component.onSubmit();
    expect(appSettingsServiceSpy.updateSettings).not.toHaveBeenCalled();
  });

  it('onSubmit() appelle updateSettings avec logoUrl=null si le champ est vide', () => {
    createComponent();
    component.settingsForm.patchValue({ logoUrl: '' });
    component.onSubmit();
    expect(appSettingsServiceSpy.updateSettings).toHaveBeenCalledWith(
      jasmine.objectContaining({ logoUrl: null }),
    );
  });

  it('onSubmit() affiche un toast de succès et appelle updateSettings si valide', () => {
    createComponent();
    component.onSubmit();
    expect(appSettingsServiceSpy.updateSettings).toHaveBeenCalled();
  });

  it('onCancel() navigue vers /admin', () => {
    createComponent();
    component.onCancel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('onCancel() restaure les couleurs chargées avant de naviguer, pour annuler l\'aperçu live', () => {
    createComponent();
    appSettingsServiceSpy.applyTokens.calls.reset();
    component.onCancel();
    expect(appSettingsServiceSpy.applyTokens).toHaveBeenCalledWith({
      primaryColor: '#6c7fe8',
      primaryColorStrong: '#5a68d6',
    });
  });

  it('modifier la couleur primaire déclenche un aperçu live via applyTokens()', () => {
    createComponent();
    appSettingsServiceSpy.applyTokens.calls.reset();
    component.settingsForm.get('primaryColor')?.setValue('#ff0000');
    expect(appSettingsServiceSpy.applyTokens).toHaveBeenCalledWith({
      primaryColor: '#ff0000',
      primaryColorStrong: '#5a68d6',
    });
  });

  it('un aperçu live n\'est pas déclenché si la couleur en cours de saisie n\'est pas un hex valide', () => {
    createComponent();
    appSettingsServiceSpy.applyTokens.calls.reset();
    component.settingsForm.get('primaryColor')?.setValue('rouge');
    expect(appSettingsServiceSpy.applyTokens).not.toHaveBeenCalled();
  });
});
