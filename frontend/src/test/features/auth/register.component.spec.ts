import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { RegisterComponent } from '../../../app/features/auth/register/register.component';
import * as AuthActions from '../../../app/core/store/auth.actions';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonNote,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { NgFor, NgIf } from '@angular/common';

import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let storeSpy: jasmine.SpyObj<Store>;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['dispatch']);

    await TestBed.configureTestingModule({
      imports: [
        RegisterComponent,
        ReactiveFormsModule,
        getTranslocoTestingModule(),
        NgIf,
        NgFor,
        IonCard,
        IonCardHeader,
        IonCardTitle,
        IonCardContent,
        IonItem,
        IonLabel,
        IonInput,
        IonButton,
        IonNote,
        IonSelect,
        IonSelectOption
      ],
      providers: [
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize registerForm with empty fields and all validators', () => {
    const form = component.registerForm;
    expect(form).toBeDefined();
    expect(form.get('nom')?.value).toBe('');
    expect(form.get('prenom')?.value).toBe('');
    expect(form.get('email')?.value).toBe('');
    expect(form.get('username')?.value).toBe('');
    expect(form.get('password')?.value).toBe('');
    expect(form.get('role')?.value).toBe('');
    expect(form.valid).toBeFalse();
  });

  it('should expose the four roles', () => {
    expect(component.roles).toEqual(['ADMIN', 'MANAGER', 'SERVEUR', 'BARMAN']);
  });

  it('should mark form invalid when required fields are empty', () => {
    component.registerForm.setValue({
      nom: '',
      prenom: '',
      email: '',
      username: '',
      password: '',
      role: ''
    });
    expect(component.registerForm.valid).toBeFalse();
  });

  it('should mark email field invalid for a bad email value', () => {
    component.registerForm.patchValue({ email: 'not-an-email' });
    expect(component.registerForm.get('email')?.valid).toBeFalse();
  });

  it('should mark password invalid when shorter than 6 characters', () => {
    component.registerForm.patchValue({ password: '123' });
    expect(component.registerForm.get('password')?.valid).toBeFalse();
  });

  it('should mark form valid when all fields are correctly filled', () => {
    component.registerForm.setValue({
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean.dupont@bar.fr',
      username: 'jdupont',
      password: 'secret123',
      role: 'SERVEUR'
    });
    expect(component.registerForm.valid).toBeTrue();
  });

  it('onSubmit() dispatches register action when form is valid', () => {
    const userData = {
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean.dupont@bar.fr',
      username: 'jdupont',
      password: 'secret123',
      role: 'SERVEUR'
    };
    component.registerForm.setValue(userData);
    component.onSubmit();
    expect(storeSpy.dispatch).toHaveBeenCalledOnceWith(
      AuthActions.register({ userData })
    );
  });

  it('onSubmit() does NOT dispatch when form is invalid', () => {
    component.registerForm.setValue({
      nom: '',
      prenom: '',
      email: 'bad',
      username: '',
      password: '',
      role: ''
    });
    component.onSubmit();
    expect(storeSpy.dispatch).not.toHaveBeenCalled();
  });
});
