import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserListComponent } from '../../../app/features/admin/users/user-list/user-list.component';
import { Store } from '@ngrx/store';
import { ModalController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { User } from '../../../app/core/models/user.model';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let storeSpy: jasmine.SpyObj<Store>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockUsers: User[] = [
    { id: 1, username: 'alice', email: 'alice@bar.fr', roles: ['ADMIN'] } as User,
    { id: 2, username: 'bob', email: 'bob@bar.fr', roles: ['SERVEUR'] } as User
  ];

  beforeEach(() => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(mockUsers));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);

    TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() peuple users depuis le store', () => {
    expect(component.users).toEqual(mockUsers);
  });

  it('trackById() retourne user.id si présent', () => {
    const user = { id: 42, username: 'test' } as User;
    expect(component.trackById(0, user)).toBe(42);
  });

  it('trackById() retourne index si user.id est absent', () => {
    const user = { username: 'no-id' } as User;
    expect(component.trackById(3, user)).toBe(3);
  });

  it('getRoleColor() retourne "tertiary" pour ADMIN', () => {
    expect(component.getRoleColor('ADMIN')).toBe('tertiary');
  });

  it('getRoleColor() retourne "primary" pour tout autre rôle', () => {
    expect(component.getRoleColor('SERVEUR')).toBe('primary');
    expect(component.getRoleColor('BARMAN')).toBe('primary');
    expect(component.getRoleColor('MANAGER')).toBe('primary');
  });

  it('openCreateDialog() crée et présente un modal', fakeAsync(() => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: null }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    component.openCreateDialog();
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(modalMock.present).toHaveBeenCalled();
  }));

  it('openEditDialog() crée un modal avec les données de l\'utilisateur', fakeAsync(() => {
    const user = mockUsers[0];
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: null }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    component.openEditDialog(user);
    tick();

    const callArgs = modalCtrlSpy.create.calls.mostRecent().args[0];
    expect(callArgs.componentProps).toEqual({ data: user });
    expect(modalMock.present).toHaveBeenCalled();
  }));

  it('openDeleteDialog() crée un modal de suppression avec cssClass delete-modal', fakeAsync(() => {
    const user = mockUsers[1];
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: null }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    component.openDeleteDialog(user);
    tick();

    const callArgs = modalCtrlSpy.create.calls.mostRecent().args[0];
    expect(callArgs.cssClass).toBe('delete-modal');
    expect(callArgs.componentProps).toEqual({ data: user });
    expect(modalMock.present).toHaveBeenCalled();
  }));

  it('openCreateDialog() ne dispatch pas si modal est dismissed sans data', fakeAsync(() => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: null }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    component.openCreateDialog();
    tick();

    expect(storeSpy.dispatch).not.toHaveBeenCalled();
  }));
});
