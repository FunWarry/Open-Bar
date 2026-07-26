import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Employee } from '../models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Employee[]> {
    // Use existing /api/users endpoint, map UserResponseDTO to Employee
    return this.http.get<any[]>(`${this.apiUrl}`).pipe(
      map(users => users.map(u => this.mapToEmployee(u)))
    );
  }

  getById(id: number): Observable<Employee> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(u => this.mapToEmployee(u))
    );
  }

  private mapToEmployee(u: any): Employee {
    return {
      id: u.id,
      name: `${u.firstName ?? ''} ${u.lastName ?? u.username ?? ''}`.trim(),
      role: u.role ?? 'SERVEUR',
      email: u.email ?? '',
      shiftsCompleted: u.shiftsCompleted ?? 0,
      shiftsTotal: u.shiftsTotal ?? 5,
      totalHours: u.totalHours ?? '0h',
      isInShift: u.isInShift ?? false,
    };
  }
}
