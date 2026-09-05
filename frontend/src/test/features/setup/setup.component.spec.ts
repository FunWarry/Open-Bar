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

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('form is invalid by default (empty required fields)', () => {
    expect(component.setupForm.valid).toBeFalse();
  });

  it('validates the form when required fields are valid', () => {
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

  it('invalid if les mots de passe ne correspondent pas', () => {
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

  it('submits data via SetupService and redirects to /auth/login on success', async () => {
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

  it('displays an error message if createAdmin fails', () => {
    setupServiceSpy.createAdmin.and.returnValue(throwError(() => ({ error: { message: 'Username already taken' } })));

    component.setupForm.setValue({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      confirmPassword: 'password123'
    });

    component.onSubmit();

    expect(component.errorMessage).toBe('Username already taken');
  });
});
