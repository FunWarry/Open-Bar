import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CommonModule } from '@angular/common';
import { EmployeesComponent } from '../../../app/features/employees/employees.component';
import { Employee } from '../../../app/features/employees/models/employee.model';

describe('EmployeesComponent', () => {
  let component: EmployeesComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeesComponent, CommonModule, HttpClientTestingModule]
    }).compileComponents();

    const fixture = TestBed.createComponent(EmployeesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with loading true', () => {
    expect(component.loading).toBeTrue();
  });

  it('should paginate employees correctly', () => {
    // Create 15 mock employees
    const mockEmployees: Employee[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `Employee ${i + 1}`,
      role: 'SERVEUR' as const,
      email: `emp${i + 1}@bar.fr`,
      shiftsCompleted: 3,
      shiftsTotal: 5,
      totalHours: '35h',
      isInShift: i < 5,
    }));
    component.employees = mockEmployees;

    // Page 1 should show first 10
    component.currentPage = 1;
    expect(component.paginatedEmployees.length).toEqual(10);

    // Page 2 should show remaining 5
    component.currentPage = 2;
    expect(component.paginatedEmployees.length).toEqual(5);
  });

  it('should calculate total pages', () => {
    component.employees = Array.from({ length: 25 }, (_, i) => ({
      id: i, name: '', role: 'SERVEUR' as const, email: '',
      shiftsCompleted: 0, shiftsTotal: 0, totalHours: '0h', isInShift: false,
    }));
    expect(component.totalPages).toBe(3);
  });

  it('getStatusLabel returns correct label', () => {
    const inShift: Employee = { id: 1, name: 'A', role: 'SERVEUR', email: '', shiftsCompleted: 0, shiftsTotal: 0, totalHours: '0h', isInShift: true };
    const absent: Employee = { ...inShift, isInShift: false };
    expect(component.getStatusLabel(inShift)).toBe('In shift');
    expect(component.getStatusLabel(absent)).toBe('Absent');
  });

  it('prevPage should not go below 1', () => {
    component.currentPage = 1;
    component.prevPage();
    expect(component.currentPage).toBe(1);
  });

  it('nextPage should not exceed totalPages', () => {
    component.employees = Array.from({ length: 5 }, (_, i) => ({
      id: i, name: '', role: 'SERVEUR' as const, email: '',
      shiftsCompleted: 0, shiftsTotal: 0, totalHours: '0h', isInShift: false,
    }));
    component.currentPage = 1;
    component.nextPage();
    expect(component.currentPage).toBe(1); // only 1 page
  });
});
