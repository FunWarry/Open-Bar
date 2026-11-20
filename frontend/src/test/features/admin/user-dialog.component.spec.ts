import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { UserDialogComponent } from '../../../app/features/admin/users/user-dialog/user-dialog.component';
import { ModalController } from '@ionic/angular';
import { User } from '../../../app/core/models/user.model';

describe('UserDialogComponent', () => {
  let component: UserDialogComponent;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockUser: User = {
    id: 1,
    username: 'jdoe',
    nom: 'Doe',
    prenom: 'John',
    email: 'john.doe@openbar.local',
    roles: ['SERVEUR'],
    enabled: true,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  };

  beforeEach(() => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    TestBed.configureTestingModule({
      imports: [UserDialogComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(UserDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create and initialize empty form when data is null', () => {
    component.data = null;
    component.ngOnInit();

    expect(component).toBeTruthy();
    expect(component.userForm.get('username')?.value).toBe('');
    expect(component.userForm.get('roles')?.value).toEqual([]);
    expect(component.userForm.get('password')?.validator).toBeTruthy();
  });

  it('should prefill form when data is provided and not require password', () => {
    component.data = mockUser;
    component.ngOnInit();

    expect(component.userForm.get('username')?.value).toBe('jdoe');
    expect(component.userForm.get('nom')?.value).toBe('Doe');
    expect(component.userForm.get('prenom')?.value).toBe('John');
    expect(component.userForm.get('email')?.value).toBe('john.doe@openbar.local');
    expect(component.userForm.get('roles')?.value).toEqual(['SERVEUR']);
    expect(component.userForm.get('password')?.validator).toBeNull();
  });

  it('toggleRole() adds or removes roles from form value', () => {
    component.data = null;
    component.ngOnInit();

    component.toggleRole('ADMIN');
    expect(component.isRoleSelected('ADMIN')).toBeTrue();

    component.toggleRole('ADMIN');
    expect(component.isRoleSelected('ADMIN')).toBeFalse();
  });

  it('calculates password strength score, labels, and classes correctly', () => {
    component.data = null;
    component.ngOnInit();

    // Empty
    expect(component.passwordStrengthScore).toBe(0);
    expect(component.passwordStrengthClass).toBe('very-weak');
    expect(component.passwordStrengthLabelKey).toBe('USERS.PASSWORD_STRENGTH.VERY_WEAK');

    // Weak
    component.userForm.patchValue({ password: 'abc' });
    expect(component.passwordStrengthScore).toBe(0);

    // Medium
    component.userForm.patchValue({ password: 'Password1' });
    expect(component.passwordStrengthScore).toBeGreaterThanOrEqual(2);

    // Strong
    component.userForm.patchValue({ password: 'SuperSecretPassword2026!' });
    expect(component.passwordStrengthScore).toBe(4);
    expect(component.passwordStrengthClass).toBe('strong');
    expect(component.passwordStrengthLabelKey).toBe('USERS.PASSWORD_STRENGTH.STRONG');
  });

  it('passwordMatchValidator checks password mismatch', () => {
    component.data = null;
    component.ngOnInit();

    component.userForm.patchValue({
      password: 'password123',
      confirmPassword: 'differentPassword'
    });
    expect(component.userForm.hasError('passwordMismatch')).toBeTrue();

    component.userForm.patchValue({
      confirmPassword: 'password123'
    });
    expect(component.userForm.hasError('passwordMismatch')).toBeFalse();
  });

  it('onSubmit() calls modalCtrl.dismiss with form value if valid', () => {
    component.data = null;
    component.ngOnInit();

    component.userForm.patchValue({
      username: 'newuser',
      nom: 'New',
      prenom: 'User',
      email: 'new@bar.com',
      password: 'password123',
      confirmPassword: 'password123',
      roles: ['BARMAN']
    });

    component.onSubmit();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({
      username: 'newuser',
      nom: 'New',
      prenom: 'User',
      email: 'new@bar.com',
      roles: ['BARMAN'],
      remoteAccessEnabled: true
    }));
  });

  it('populates and toggles remoteAccessEnabled when editing an existing user', () => {
    component.data = {
      id: 10,
      username: 'bartender',
      email: 'bar@openbar.local',
      roles: ['BARMAN'],
      remoteAccessEnabled: false,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    component.ngOnInit();

    expect(component.userForm.get('remoteAccessEnabled')?.value).toBeFalse();

    component.userForm.patchValue({ remoteAccessEnabled: true });
    component.onSubmit();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({
      remoteAccessEnabled: true
    }));
  });

  it('onCancel() calls modalCtrl.dismiss with null', () => {
    component.onCancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null);
  });
});
