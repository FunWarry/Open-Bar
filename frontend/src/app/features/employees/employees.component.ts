import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonGrid, IonRow, IonCol, IonBadge, IonButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, addCircleOutline } from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { UserAvatarComponent } from '../../core/components/ui/user-avatar/user-avatar.component';
import { RoleBadgeComponent } from '../../core/components/ui/role-badge/role-badge.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { EmployeeService } from './services/employee.service';
import { Employee } from './models/employee.model';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonGrid, IonRow, IonCol, IonBadge, IonButton, IonIcon,
    UserAvatarComponent, RoleBadgeComponent, ActionButtonComponent,
  ],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss'],
})
export class EmployeesComponent implements OnInit, OnDestroy {
  employees: Employee[] = [];
  loading = true;
  currentPage = 1;
  readonly pageSize = 10;
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly employeeService: EmployeeService) {
    addIcons({ createOutline, addCircleOutline });
  }

  ngOnInit() {
    this.loadEmployees();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEmployees() {
    this.loading = true;
    this.employeeService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: employees => { this.employees = employees; this.loading = false; },
        error: () => { this.loading = false; },
      });
  }

  get paginatedEmployees(): Employee[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.employees.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.employees.length / this.pageSize));
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  getStatusLabel(employee: Employee): string {
    return employee.isInShift ? 'In shift' : 'Absent';
  }

  getStatusColor(employee: Employee): string {
    return employee.isInShift ? 'success' : 'medium';
  }

  trackById(_: number, employee: Employee): number {
    return employee.id;
  }
}
