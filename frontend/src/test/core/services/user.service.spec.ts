import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from '../../../../src/app/core/services/user.service';
import { User } from '../../../../src/app/core/models/user.model';
import { environment } from '../../../../src/environments/environment';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/users`;

  const mockUsers: User[] = [
    {
      id: 1,
      username: 'admin',
      email: 'admin@openbar.fr',
      roles: ['ADMIN'],
      enabled: true,
      createdAt: '2026-07-30T10:00:00Z',
      updatedAt: '2026-07-30T10:00:00Z'
    },
    {
      id: 2,
      username: 'barman1',
      email: 'barman1@openbar.fr',
      roles: ['BARMAN'],
      enabled: true,
      createdAt: '2026-07-30T10:00:00Z',
      updatedAt: '2026-07-30T10:00:00Z'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [UserService]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getUsers() should fetch users array via GET', () => {
    service.getUsers().subscribe((users) => {
      expect(users).toHaveSize(2);
      expect(users).toEqual(mockUsers);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  it('getUserById() should fetch single user by ID via GET', () => {
    service.getUserById(1).subscribe((user) => {
      expect(user).toEqual(mockUsers[0]);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers[0]);
  });

  it('createUser() should send POST request with payload', () => {
    const newUser: Partial<User> = {
      username: 'serveur1',
      email: 'serveur1@openbar.fr',
      roles: ['SERVEUR']
    };

    service.createUser(newUser).subscribe((created) => {
      expect(created.id).toBe(3);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newUser);
    req.flush({ ...newUser, id: 3, enabled: true });
  });

  it('updateUser() should send PUT request with updated data', () => {
    const updateData: Partial<User> = { email: 'updated@openbar.fr' };

    service.updateUser(1, updateData).subscribe((updated) => {
      expect(updated.email).toBe('updated@openbar.fr');
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateData);
    req.flush({ ...mockUsers[0], email: 'updated@openbar.fr' });
  });

  it('deleteUser() should send DELETE request for given ID', () => {
    service.deleteUser(1).subscribe(() => {
      expect(true).toBeTrue();
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getUsersPaged() should send GET with page, size, search and role params', () => {
    const mockPage = {
      content: [mockUsers[0]],
      pageNumber: 0,
      pageSize: 10,
      totalElements: 1,
      totalPages: 1,
      isFirst: true,
      isLast: true
    };

    service.getUsersPaged(0, 10, 'admin', 'ADMIN').subscribe((page) => {
      expect(page.content).toHaveSize(1);
      expect(page.totalElements).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/users/paged?page=0&size=10&search=admin&role=ADMIN`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('getUsersPaged() should omit empty search and role params', () => {
    const mockPage = {
      content: mockUsers,
      pageNumber: 0,
      pageSize: 10,
      totalElements: 2,
      totalPages: 1,
      isFirst: true,
      isLast: true
    };

    service.getUsersPaged(0, 10, '', '').subscribe((page) => {
      expect(page.content).toHaveSize(2);
    });

    // Service omits empty search/role — only page and size are sent
    const req = httpMock.expectOne(`${environment.apiUrl}/users/paged?page=0&size=10`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });
});
