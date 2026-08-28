import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonList,
  IonItem,
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  ModalController
} from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';
import { User } from '../../core/models/user.model';
import { EmployeeShift } from '../../core/models/shift.model';
import { UserService } from '../../core/services/user.service';
import { ShiftService } from '../../core/services/shift.service';
import { EmployeeShiftModalComponent } from './employee-shift-modal/employee-shift-modal.component';

interface EmployeeSummary {
  user: User;
  shiftsCount: number;
  totalHours: number;
}

/**
 * Component displaying the list of all staff employees with search, role filtering,
 * weekly shift metrics, and modal shortcut for shift management.
 */
@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslocoModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonList,
    IonItem,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner
  ]
})
export class EmployeesComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly shiftService = inject(ShiftService);
  private readonly modalCtrl = inject(ModalController);

  loading = true;
  users: User[] = [];
  employeeSummaries: EmployeeSummary[] = [];
  filteredSummaries: EmployeeSummary[] = [];

  searchQuery = '';
  selectedRole = 'ALL';

  availableRoles = [
    { label: 'Tous les rôles', value: 'ALL' },
    { label: 'Manager', value: 'MANAGER' },
    { label: 'Serveur', value: 'SERVEUR' },
    { label: 'Barman', value: 'BARMAN' },
    { label: 'Admin', value: 'ADMIN' }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    // Current week ISO dates (Monday to Sunday)
    const today = new Date();
    const monday = this.getMonday(today);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const mondayStr = this.formatDateISO(monday);
    const sundayStr = this.formatDateISO(sunday);

    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.shiftService.getShiftsForWeek(mondayStr, sundayStr).subscribe({
          next: (shifts) => {
            this.buildSummaries(users, shifts);
            this.loading = false;
          },
          error: () => {
            this.buildSummaries(users, []);
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private buildSummaries(users: User[], shifts: EmployeeShift[]): void {
    const shiftMap = new Map<number, EmployeeShift[]>();
    for (const shift of shifts) {
      if (shift.userId) {
        const list = shiftMap.get(shift.userId) || [];
        list.push(shift);
        shiftMap.set(shift.userId, list);
      }
    }

    this.employeeSummaries = users.map((user) => {
      const userShifts = shiftMap.get(user.id) || [];
      const totalHours = userShifts.reduce((acc, s) => acc + (s.heuresEffectuees || 0), 0);
      return {
        user,
        shiftsCount: userShifts.length,
        totalHours
      };
    });

    this.applyFilters();
  }

  applyFilters(): void {
    const query = this.searchQuery.toLowerCase().trim();

    this.filteredSummaries = this.employeeSummaries.filter((es) => {
      const u = es.user;
      const matchesSearch =
        !query ||
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.nom?.toLowerCase().includes(query) ||
        u.prenom?.toLowerCase().includes(query);

      const matchesRole =
        this.selectedRole === 'ALL' ||
        u.roles?.includes(this.selectedRole as any);

      return Boolean(matchesSearch && matchesRole);
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onRoleChange(): void {
    this.applyFilters();
  }

  async openEmployeeShiftsModal(employee: User): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EmployeeShiftModalComponent,
      componentProps: { employee },
      cssClass: 'employee-shift-modal-container'
    });

    await modal.present();
    await modal.onDidDismiss();
    this.loadData();
  }

  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private formatDateISO(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'MANAGER': return 'warning';
      case 'SERVEUR': return 'success';
      case 'BARMAN': return 'secondary';
      case 'ADMIN': return 'tertiary';
      default: return 'primary';
    }
  }

  trackById(_index: number, item: EmployeeSummary): number {
    return item.user.id;
  }
}
