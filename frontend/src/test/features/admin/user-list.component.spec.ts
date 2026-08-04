import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserListComponent } from '../../../app/features/admin/users/user-list/user-list.component';
import { ModalController, ToastController } from '@ionic/angular/standalone';
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

  it('ngOnInit() charge les utilisateurs paginés', () => {
    expect(userServiceSpy.getUsersPaged).toHaveBeenCalledWith(0, 10, '', 'ALL');
    expect(component.users).toEqual(mockUsers);
    expect(component.loading).toBeFalse();
  });

  it('onSearchChange() réinitialise la page et charge les résultats', () => {
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

  it('loadUsers() affiche un toast d\'erreur si la requête échoue', () => {
    userServiceSpy.getUsersPaged.and.returnValue(throwError(() => new Error('Server error')));

    component.loadUsers();

    expect(component.loading).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  });

  it('trackById() retourne user.id si présent', () => {
    const user = { id: 42, username: 'test' } as User;
    expect(component.trackById(0, user)).toBe(42);
  });

  it('getRoleColor() retourne les bonnes couleurs par rôle', () => {
    expect(component.getRoleColor('ADMIN')).toBe('tertiary');
    expect(component.getRoleColor('MANAGER')).toBe('secondary');
    expect(component.getRoleColor('SERVEUR')).toBe('primary');
    expect(component.getRoleColor('BARMAN')).toBe('warning');
    expect(component.getRoleColor('UNKNOWN')).toBe('medium');
  });

  it('onRoleChange() réinitialise la page et charge les résultats', () => {
    component.selectedRole = 'BARMAN';
    component.onRoleChange();

    expect(component.currentPage).toBe(0);
    expect(userServiceSpy.getUsersPaged).toHaveBeenCalledWith(0, 10, '', 'BARMAN');
  });

  it('changePageSize() met à jour la taille et recharge', () => {
    userServiceSpy.getUsersPaged.and.returnValue(of({
      ...mockPageResponse,
      pageSize: 20
    }));

    component.changePageSize(20);

    expect(component.pageSize).toBe(20);
    expect(component.currentPage).toBe(0);
    expect(userServiceSpy.getUsersPaged).toHaveBeenCalledWith(0, 20, '', 'ALL');
  });

  it('nextPage() ne fait rien si isLast = true', () => {
    component.isLast = true;
    component.currentPage = 2;
    component.nextPage();

    expect(component.currentPage).toBe(2);
  });

  it('prevPage() ne fait rien si isFirst = true', () => {
    component.isFirst = true;
    component.currentPage = 0;
    component.prevPage();

    expect(component.currentPage).toBe(0);
  });
});
