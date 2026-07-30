import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserListComponent } from '../../../app/features/admin/users/user-list/user-list.component';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { User } from '../../../app/core/models/user.model';
import { UserService } from '../../../app/core/services/user.service';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: { present: jasmine.Spy };

  const mockUsers: User[] = [
    { id: 1, username: 'alice', email: 'alice@bar.fr', roles: ['ADMIN'], enabled: true, createdAt: '2026-07-30T10:00:00Z', updatedAt: '2026-07-30T10:00:00Z' },
    { id: 2, username: 'bob', email: 'bob@bar.fr', roles: ['SERVEUR'], enabled: true, createdAt: '2026-07-30T10:00:00Z', updatedAt: '2026-07-30T10:00:00Z' }
  ];

  beforeEach(() => {
    userServiceSpy = jasmine.createSpyObj('UserService', ['getUsers', 'createUser', 'updateUser', 'deleteUser']);
    userServiceSpy.getUsers.and.returnValue(of(mockUsers));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    toastSpy = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy as any));

    TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [
        { provide: UserService, useValue: userServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() charge les utilisateurs depuis UserService', () => {
    expect(userServiceSpy.getUsers).toHaveBeenCalled();
    expect(component.users).toEqual(mockUsers);
    expect(component.loading).toBeFalse();
  });

  it('loadUsers() affiche un toast d\'erreur si la requête échoue', () => {
    userServiceSpy.getUsers.and.returnValue(throwError(() => new Error('Server error')));

    component.loadUsers();

    expect(component.loading).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  });

  it('trackById() retourne user.id si présent', () => {
    const user = { id: 42, username: 'test' } as User;
    expect(component.trackById(0, user)).toBe(42);
  });

  it('trackById() retourne index si user.id est absent', () => {
    const user = { username: 'no-id' } as User;
    expect(component.trackById(3, user)).toBe(3);
  });

  it('getRoleColor() retourne "tertiary" pour ADMIN et "primary" pour les autres', () => {
    expect(component.getRoleColor('ADMIN')).toBe('tertiary');
    expect(component.getRoleColor('SERVEUR')).toBe('primary');
  });

  it('openCreateDialog() crée un utilisateur lors de la validation du modal', fakeAsync(() => {
    const newUser = { username: 'charlie', email: 'charlie@bar.fr', roles: ['BARMAN'] };
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: newUser }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));
    userServiceSpy.createUser.and.returnValue(of({ ...newUser, id: 3 } as User));

    component.openCreateDialog();
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(userServiceSpy.createUser).toHaveBeenCalledWith(newUser as any);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('openEditDialog() modifie l\'utilisateur lors de la validation du modal', fakeAsync(() => {
    const updatedUser = { username: 'alice_updated', email: 'alice@bar.fr', roles: ['ADMIN'] };
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: updatedUser }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));
    userServiceSpy.updateUser.and.returnValue(of({ ...updatedUser, id: 1 } as User));

    component.openEditDialog(mockUsers[0]);
    tick();

    expect(userServiceSpy.updateUser).toHaveBeenCalledWith(1, updatedUser as any);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('openDeleteDialog() supprime l\'utilisateur lors de la confirmation', fakeAsync(() => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: true }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));
    userServiceSpy.deleteUser.and.returnValue(of(undefined));

    component.openDeleteDialog(mockUsers[1]);
    tick();

    expect(userServiceSpy.deleteUser).toHaveBeenCalledWith(2);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));
});
