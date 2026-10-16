import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { UserListComponent } from '../../../app/features/admin/users/user-list/user-list.component';
import { ModalController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { User } from '../../../app/core/models/user.model';
import { UserService, PageResponse } from '../../../app/core/services/user.service';

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

  const mockPageResponse: PageResponse<User> = {
    content: mockUsers,
    pageNumber: 0,
    pageSize: 10,
    totalElements: 2,
    totalPages: 1,
    isFirst: true,
    isLast: true
  };

  beforeEach(() => {
    userServiceSpy = jasmine.createSpyObj('UserService', ['getUsersPaged', 'createUser', 'updateUser', 'deleteUser']);
    userServiceSpy.getUsersPaged.and.returnValue(of(mockPageResponse));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    toastSpy = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy as any));

    TestBed.configureTestingModule({
      imports: [UserListComponent, getTranslocoTestingModule()],
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

  it('ngOnInit() loads paginated users', () => {
    expect(userServiceSpy.getUsersPaged).toHaveBeenCalledWith(0, 10, '', 'ALL');
    expect(component.users).toEqual(mockUsers);
    expect(component.loading).toBeFalse();
  });

  it('onSearchChange() resets page and loads results', () => {
    component.searchQuery = 'alice';
    component.onSearchChange();

    expect(component.currentPage).toBe(0);
    expect(userServiceSpy.getUsersPaged).toHaveBeenCalledWith(0, 10, 'alice', 'ALL');
  });

  it('nextPage() et prevPage() naviguent entre les pages', () => {
    userServiceSpy.getUsersPaged.and.callFake((page: number) => of({
      ...mockPageResponse,
      pageNumber: page,
      isFirst: page === 0,
      isLast: page === 2,
      totalPages: 3
    }));

    component.isFirst = false;
    component.isLast = false;
    component.currentPage = 0;
    component.totalPages = 3;

    component.nextPage();
    expect(component.currentPage).toBe(1);

    component.prevPage();
    expect(component.currentPage).toBe(0);
  });

  it('loadUsers() displays error toast if request fails', () => {
    userServiceSpy.getUsersPaged.and.returnValue(throwError(() => new Error('Server error')));

    component.loadUsers();

    expect(component.loading).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  });

  it('trackById() returns user.id if present', () => {
    const user = { id: 42, username: 'test' } as User;
    expect(component.trackById(0, user)).toBe(42);
  });

  it('getRoleColor() returns correct colors per role', () => {
    expect(component.getRoleColor('ADMIN')).toBe('tertiary');
    expect(component.getRoleColor('MANAGER')).toBe('secondary');
    expect(component.getRoleColor('SERVEUR')).toBe('primary');
    expect(component.getRoleColor('BARMAN')).toBe('warning');
    expect(component.getRoleColor('UNKNOWN')).toBe('medium');
  });

  it('onRoleChange() resets page and loads results', () => {
    component.selectedRole = 'BARMAN';
    component.onRoleChange();

    expect(component.currentPage).toBe(0);
    expect(userServiceSpy.getUsersPaged).toHaveBeenCalledWith(0, 10, '', 'BARMAN');
  });

  it('changePageSize() updates size and reloads', () => {
    userServiceSpy.getUsersPaged.and.returnValue(of({
      ...mockPageResponse,
      pageSize: 20
    }));

    component.changePageSize(20);

    expect(component.pageSize).toBe(20);
    expect(component.currentPage).toBe(0);
    expect(userServiceSpy.getUsersPaged).toHaveBeenCalledWith(0, 20, '', 'ALL');
  });

  it('nextPage() does nothing if isLast = true', () => {
    component.isLast = true;
    component.currentPage = 2;
    component.nextPage();

    expect(component.currentPage).toBe(2);
  });

  it('prevPage() does nothing if isFirst = true', () => {
    component.isFirst = true;
    component.currentPage = 0;
    component.prevPage();

    expect(component.currentPage).toBe(0);
  });

  it('openCreateDialog() handles creation success and error', async () => {
    const mockModal = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: { username: 'charlie' } }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    userServiceSpy.createUser.and.returnValue(of({ id: 3, username: 'charlie' } as any));
    await component.openCreateDialog();
    expect(userServiceSpy.createUser).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));

    userServiceSpy.createUser.and.returnValue(throwError(() => ({ error: { message: 'Failed' } })));
    await component.openCreateDialog();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  });

  it('openEditDialog() handles update success and error', async () => {
    const mockModal = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: { username: 'alice_updated' } }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    userServiceSpy.updateUser.and.returnValue(of({ id: 1, username: 'alice_updated' } as any));
    await component.openEditDialog(mockUsers[0]);
    expect(userServiceSpy.updateUser).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));

    userServiceSpy.updateUser.and.returnValue(throwError(() => ({ error: { message: 'Failed' } })));
    await component.openEditDialog(mockUsers[0]);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  });

  it('openDeleteDialog() handles delete success and error', async () => {
    const mockModal = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: true }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    userServiceSpy.deleteUser.and.returnValue(of(undefined as any));
    await component.openDeleteDialog(mockUsers[0]);
    expect(userServiceSpy.deleteUser).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));

    userServiceSpy.deleteUser.and.returnValue(throwError(() => ({ error: { message: 'Failed' } })));
    await component.openDeleteDialog(mockUsers[0]);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  });

  it('getDisplayName() returns formatted full name or falls back to username', () => {
    expect(component.getDisplayName({ username: 'jdupont', prenom: 'Jean', nom: 'Dupont' } as User)).toBe('Jean Dupont');
    expect(component.getDisplayName({ username: 'jdupont' } as User)).toBe('jdupont');
  });

  it('getUserPrimaryRole() extracts correct role token', () => {
    expect(component.getUserPrimaryRole(['ADMIN'])).toBe('ADMIN');
    expect(component.getUserPrimaryRole(['MANAGER'])).toBe('MANAGER');
    expect(component.getUserPrimaryRole(['BARMAN'])).toBe('BARMAN');
    expect(component.getUserPrimaryRole(['SERVEUR'])).toBe('SERVEUR');
    expect(component.getUserPrimaryRole([])).toBe('SERVEUR');
  });

  it('KPI getters compute correct statistics', () => {
    component.users = [
      { id: 1, username: 'admin', roles: ['ADMIN'] } as User,
      { id: 2, username: 'manager', roles: ['MANAGER'] } as User,
      { id: 3, username: 'serveur', roles: ['SERVEUR'] } as User,
      { id: 4, username: 'barman', roles: ['BARMAN'] } as User
    ];
    component.totalElements = 4;

    expect(component.totalUsersCount).toBe(4);
    expect(component.adminsCount).toBe(1);
    expect(component.managersCount).toBe(1);
    expect(component.staffCount).toBe(2);
  });

  it('onPageChange() adjusts 1-indexed page to 0-indexed and reloads', () => {
    userServiceSpy.getUsersPaged.and.callFake((page: number) => of({
      ...mockPageResponse,
      pageNumber: page
    }));

    component.onPageChange(3);
    expect(component.currentPage).toBe(2);
    expect(userServiceSpy.getUsersPaged).toHaveBeenCalledWith(2, 10, '', 'ALL');
  });

  it('resetFilters() clears query, resets role, and reloads first page', () => {
    component.searchQuery = 'test';
    component.selectedRole = 'MANAGER';
    component.currentPage = 3;

    component.resetFilters();

    expect(component.searchQuery).toBe('');
    expect(component.selectedRole).toBe('ALL');
    expect(component.currentPage).toBe(0);
    expect(userServiceSpy.getUsersPaged).toHaveBeenCalledWith(0, 10, '', 'ALL');
  });
});
