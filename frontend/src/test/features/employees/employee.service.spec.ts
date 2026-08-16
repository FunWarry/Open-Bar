import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EmployeeService } from '../../../app/features/employees/services/employee.service';
import { environment } from '../../../environments/environment';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EmployeeService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all employees and map raw user DTOs', () => {
    const rawUsers = [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        role: 'SERVEUR',
        email: 'john@bar.com',
        shiftsCompleted: 3,
        shiftsTotal: 5,
        totalHours: '24h',
        isInShift: true,
      },
      {
        id: 2,
        username: 'barman_jane',
        email: 'jane@bar.com',
      },
    ];

    service.getAll().subscribe((employees) => {
      expect(employees).toHaveSize(2);
      expect(employees[0].name).toBe('John Doe');
      expect(employees[0].isInShift).toBe(true);
      expect(employees[1].name).toBe('barman_jane');
      expect(employees[1].role).toBe('SERVEUR');
      expect(employees[1].shiftsCompleted).toBe(0);
      expect(employees[1].shiftsTotal).toBe(5);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(rawUsers);
  });

  it('should get employee by id', () => {
    const rawUser = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      role: 'SERVEUR',
      email: 'john@bar.com',
    };

    service.getById(1).subscribe((employee) => {
      expect(employee.id).toBe(1);
      expect(employee.name).toBe('John Doe');
      expect(employee.role).toBe('SERVEUR');
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(rawUser);
  });
});
