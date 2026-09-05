import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserDialogComponent } from '../../../app/features/admin/users/user-dialog/user-dialog.component';
import { ModalController } from '@ionic/angular/standalone';
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
  });

  it('should prefill form when data is provided', () => {
    component.data = mockUser;
    component.ngOnInit();

    expect(component.userForm.get('username')?.value).toBe('jdoe');
    expect(component.userForm.get('nom')?.value).toBe('Doe');
    expect(component.userForm.get('prenom')?.value).toBe('John');
    expect(component.userForm.get('email')?.value).toBe('john.doe@openbar.local');
    expect(component.userForm.get('roles')?.value).toEqual(['SERVEUR']);
  });

  it('toggleRole() adds or removes roles from form value', () => {
    component.data = null;
    component.ngOnInit();

    component.toggleRole('ADMIN');
    expect(component.isRoleSelected('ADMIN')).toBeTrue();

    component.toggleRole('ADMIN');
    expect(component.isRoleSelected('ADMIN')).toBeFalse();
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
      roles: ['BARMAN']
    }));
  });

  it('onCancel() calls modalCtrl.dismiss with null', () => {
    component.onCancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null);
  });
});
