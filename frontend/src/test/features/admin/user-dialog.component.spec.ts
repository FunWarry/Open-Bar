import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { UserDialogComponent } from '../../../app/features/admin/users/user-dialog/user-dialog.component';
import { ModalController } from '@ionic/angular/standalone';

describe('UserDialogComponent', () => {
  let component: UserDialogComponent;
  let fixture: ComponentFixture<UserDialogComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    await TestBed.configureTestingModule({
      imports: [UserDialogComponent, ReactiveFormsModule],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty fields', () => {
    expect(component.userForm).toBeDefined();
    expect(component.userForm.get('username')?.value).toBe('');
    expect(component.userForm.get('email')?.value).toBe('');
    expect(component.userForm.get('password')?.value).toBe('');
    expect(component.userForm.get('confirmPassword')?.value).toBe('');
    expect(component.userForm.get('roles')?.value).toEqual([]);
  });

  it('should mark form invalid when required fields are empty', () => {
    expect(component.userForm.invalid).toBeTrue();
  });

  it('ngOnInit() patches form values when data is provided', () => {
    component.data = {
      id: 1,
      username: 'johndoe',
      email: 'john@example.com',
      roles: ['BARMAN']
    } as any;
    component.ngOnInit();

    expect(component.userForm.get('username')?.value).toBe('johndoe');
    expect(component.userForm.get('email')?.value).toBe('john@example.com');
    expect(component.userForm.get('roles')?.value).toEqual(['BARMAN']);
  });

  it('ngOnInit() clears password validators when editing existing user', () => {
    component.data = {
      id: 1,
      username: 'johndoe',
      email: 'john@example.com',
      roles: ['SERVEUR']
    } as any;
    component.ngOnInit();

    const passwordCtrl = component.userForm.get('password');
    const confirmCtrl = component.userForm.get('confirmPassword');
    expect(passwordCtrl?.validator).toBeNull();
    expect(confirmCtrl?.validator).toBeNull();
  });

  it('passwordMatchValidator() returns null when passwords match', () => {
    component.userForm.patchValue({ password: 'secret1', confirmPassword: 'secret1' });
    const result = component.passwordMatchValidator(component.userForm);
    expect(result).toBeNull();
  });

  it('passwordMatchValidator() returns error when passwords differ', () => {
    component.userForm.patchValue({ password: 'secret1', confirmPassword: 'different' });
    const result = component.passwordMatchValidator(component.userForm);
    expect(result).toEqual({ passwordMismatch: true });
  });

  it('passwordMatchValidator() returns null when password is empty', () => {
    component.userForm.patchValue({ password: '', confirmPassword: '' });
    const result = component.passwordMatchValidator(component.userForm);
    expect(result).toBeNull();
  });

  it('onSubmit() calls modalCtrl.dismiss with form value when form is valid', () => {
    component.userForm.patchValue({
      username: 'alice',
      email: 'alice@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      roles: ['MANAGER']
    });

    component.onSubmit();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      username: 'alice',
      email: 'alice@example.com',
      password: 'password123',
      roles: ['MANAGER']
    }));
  });

  it('onSubmit() does not call dismiss when form is invalid', () => {
    component.userForm.patchValue({ username: '', email: '', roles: [] });
    component.onSubmit();
    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
  });

  it('onSubmit() strips password fields from payload when password is empty', () => {
    component.data = {
      id: 2,
      username: 'bob',
      email: 'bob@example.com',
      roles: ['SERVEUR']
    } as any;
    component.ngOnInit();

    component.userForm.patchValue({
      username: 'bob',
      email: 'bob@example.com',
      password: '',
      confirmPassword: '',
      roles: ['SERVEUR']
    });

    component.onSubmit();

    const dismissArg = modalCtrlSpy.dismiss.calls.mostRecent()?.args[0];
    expect(dismissArg).not.toBeUndefined();
    expect(dismissArg.password).toBeUndefined();
    expect(dismissArg.confirmPassword).toBeUndefined();
  });

  it('onCancel() calls modalCtrl.dismiss with null', () => {
    component.onCancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledOnceWith(null);
  });
});
