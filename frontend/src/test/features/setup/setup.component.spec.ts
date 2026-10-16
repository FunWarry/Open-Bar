import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, ModalController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { SetupComponent } from '../../../app/features/setup/setup.component';
import { SetupService } from '../../../app/core/services/setup.service';
import { LegalComponent } from '../../../app/features/legal/legal.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('SetupComponent', () => {
  let component: SetupComponent;
  let fixture: ComponentFixture<SetupComponent>;
  let setupServiceSpy: jasmine.SpyObj<SetupService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;
  let modalSpy: jasmine.SpyObj<HTMLIonModalElement>;

  beforeEach(async () => {
    setupServiceSpy = jasmine.createSpyObj('SetupService', ['getStatus', 'createAdmin']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj<HTMLIonToastElement>('HTMLIonToastElement', ['present']);
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    modalSpy = jasmine.createSpyObj<HTMLIonModalElement>('HTMLIonModalElement', ['present']);
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['create']);

    toastControllerSpy.create.and.returnValue(Promise.resolve(toastSpy));
    modalControllerSpy.create.and.returnValue(Promise.resolve(modalSpy));
    setupServiceSpy.getStatus.and.returnValue(of({ initialized: false, userCount: 0 }));

    await TestBed.configureTestingModule({
      imports: [SetupComponent, ReactiveFormsModule, getTranslocoTestingModule()],
      providers: [
        { provide: SetupService, useValue: setupServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: ModalController, useValue: modalControllerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('redirects to /auth/login during ngOnInit if setup is already initialized', () => {
    setupServiceSpy.getStatus.and.returnValue(of({ initialized: true, userCount: 1 }));
    component.ngOnInit();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('form is invalid by default (empty required fields)', () => {
    expect(component.setupForm.valid).toBeFalse();
  });

  it('form remains invalid if acceptTerms is false', () => {
    component.setupForm.setValue({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      confirmPassword: 'password123',
      acceptTerms: false
    });
    expect(component.setupForm.valid).toBeFalse();
    expect(component.setupForm.get('acceptTerms')?.hasError('required')).toBeTrue();
  });

  it('validates the form when required fields are valid and terms are accepted', () => {
    component.setupForm.setValue({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      confirmPassword: 'password123',
      acceptTerms: true
    });
    expect(component.setupForm.valid).toBeTrue();
  });

  it('invalid if passwords do not match', () => {
    component.setupForm.setValue({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      confirmPassword: 'differentPassword',
      acceptTerms: true
    });
    expect(component.setupForm.hasError('passwordMismatch')).toBeTrue();
  });

  it('marks form as touched and does not call service when submitting invalid form', () => {
    component.setupForm.reset();
    component.onSubmit();
    expect(setupServiceSpy.createAdmin).not.toHaveBeenCalled();
    expect(component.setupForm.touched).toBeTrue();
  });

  it('submits data via SetupService and redirects to /auth/login on success', async () => {
    setupServiceSpy.createAdmin.and.returnValue(of({
      id: 1,
      username: 'admin',
      email: 'admin@test.com',
      roles: ['ADMIN']
    }));

    component.setupForm.setValue({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      confirmPassword: 'password123',
      acceptTerms: true
    });

    component.onSubmit();

    expect(setupServiceSpy.createAdmin).toHaveBeenCalledWith({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      initialCocktailIds: []
    });

    await fixture.whenStable();
    expect(toastControllerSpy.create).toHaveBeenCalled();
    expect(toastSpy.present).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('displays an error message if createAdmin fails during submitSetup', () => {
    setupServiceSpy.createAdmin.and.returnValue(throwError(() => ({
      error: { message: 'Username already taken' }
    })));

    component.setupForm.setValue({
      username: 'admin',
      email: 'admin@test.com',
      nom: 'Admin',
      prenom: 'Initial',
      password: 'password123',
      confirmPassword: 'password123',
      acceptTerms: true
    });

    component.onSubmit();

    expect(component.errorMessage).toBe('Username already taken');
    expect(component.loading).toBeFalse();
  });

  it('opens legal modal when openLegalModal is called', async () => {
    const dummyEvent = new MouseEvent('click');
    spyOn(dummyEvent, 'preventDefault');
    spyOn(dummyEvent, 'stopPropagation');

    await component.openLegalModal(dummyEvent, 'license');

    expect(dummyEvent.preventDefault).toHaveBeenCalled();
    expect(dummyEvent.stopPropagation).toHaveBeenCalled();
    expect(modalControllerSpy.create).toHaveBeenCalledWith({
      component: LegalComponent,
      componentProps: {
        initialTab: 'license',
        isModal: true
      }
    });
    expect(modalSpy.present).toHaveBeenCalled();
  });

  it('opens legal modal with default terms tab when tab is omitted', async () => {
    const dummyEvent = new MouseEvent('click');
    spyOn(dummyEvent, 'preventDefault');
    spyOn(dummyEvent, 'stopPropagation');

    await component.openLegalModal(dummyEvent);

    expect(modalControllerSpy.create).toHaveBeenCalledWith({
      component: LegalComponent,
      componentProps: {
        initialTab: 'terms',
        isModal: true
      }
    });
    expect(modalSpy.present).toHaveBeenCalled();
  });
});
