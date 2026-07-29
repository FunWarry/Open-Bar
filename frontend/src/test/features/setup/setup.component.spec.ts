import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { SetupComponent } from '../../../app/features/setup/setup.component';
import { SetupService } from '../../../app/core/services/setup.service';

import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('SetupComponent', () => {
  let component: SetupComponent;
  let fixture: ComponentFixture<SetupComponent>;
  let setupServiceSpy: jasmine.SpyObj<SetupService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: any;

  beforeEach(async () => {
    setupServiceSpy = jasmine.createSpyObj('SetupService', ['getStatus', 'createAdmin']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);

    toastControllerSpy.create.and.returnValue(Promise.resolve(toastSpy));
    setupServiceSpy.getStatus.and.returnValue(of({ initialized: false, userCount: 0 }));

    await TestBed.configureTestingModule({
      imports: [SetupComponent, ReactiveFormsModule, getTranslocoTestingModule()],
      providers: [
        { provide: SetupService, useValue: setupServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastControllerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('formulaire invalide par défaut (champs requis vides)', () => {
    expect(component.setupForm.valid).toBeFalse();
  });

  it('valide le formulaire si les champs requis sont corrects', () => {
    component.setupForm.setValue({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      confirmPassword: 'password123'
    });
    expect(component.setupForm.valid).toBeTrue();
  });

  it('invalide si les mots de passe ne correspondent pas', () => {
    component.setupForm.setValue({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      confirmPassword: 'differentPassword'
    });
    expect(component.setupForm.hasError('passwordMismatch')).toBeTrue();
  });

  it('soumet les données via SetupService et redirige vers /auth/login en cas de succès', async () => {
    setupServiceSpy.createAdmin.and.returnValue(of({ id: 1, username: 'admin', email: 'admin@test.com', roles: ['ADMIN'] }));

    component.setupForm.setValue({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      confirmPassword: 'password123'
    });

    component.onSubmit();

    expect(setupServiceSpy.createAdmin).toHaveBeenCalledWith({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123'
    });

    await fixture.whenStable();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('affiche un message d\'erreur si createAdmin échoue', () => {
    setupServiceSpy.createAdmin.and.returnValue(throwError(() => ({ error: { message: 'Nom d\'utilisateur déjà pris' } })));

    component.setupForm.setValue({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      confirmPassword: 'password123'
    });

    component.onSubmit();

    expect(component.errorMessage).toBe('Nom d\'utilisateur déjà pris');
  });
});
