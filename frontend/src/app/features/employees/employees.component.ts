import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  IonIcon,
  IonSpinner,
  ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  timeOutline,
  calendarOutline,
  trendingUpOutline,
  mailOutline,
  personOutline,
  downloadOutline,
  settingsOutline,
  searchOutline,
  optionsOutline,
  refreshOutline,
  chevronForwardOutline,
  briefcaseOutline,
  wineOutline,
  restaurantOutline,
  shieldCheckmarkOutline,
  speedometerOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { User } from '../../core/models/user.model';
import { EmployeeShift } from '../../core/models/shift.model';
import { UserService } from '../../core/services/user.service';
import { ShiftService } from '../../core/services/shift.service';
import { EmployeeShiftModalComponent } from './employee-shift-modal/employee-shift-modal.component';
import { SearchBarComponent } from '../../core/components/ui/search-bar/search-bar.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { StatCardComponent } from '../../core/components/ui/stat-card/stat-card.component';
import { UserAvatarComponent } from '../../core/components/ui/user-avatar/user-avatar.component';
import { RoleBadgeComponent, UserRoleType } from '../../core/components/ui/role-badge/role-badge.component';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { SearchableSelectComponent, SearchableOption } from '../../core/components/ui/searchable-select/searchable-select.component';
import { CsvExportService, CsvColumn } from '../../core/services/csv-export.service';

/**
 * Summary information for an employee's weekly workload and shifts.
 */
export interface EmployeeSummary {
  user: User;
  shiftsCount: number;
  totalHours: number;
}

/**
 * Component displaying the list of all staff employees with search, role filtering,
 * weekly shift metrics, executive KPI cards, and modal shortcut for shift management.
 */
@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslocoModule,
    SearchBarComponent,
    SearchableSelectComponent,
    ActionButtonComponent,
    StatCardComponent,
    UserAvatarComponent,
    RoleBadgeComponent,
    EmptyStateComponent,
    IonIcon,
    IonSpinner
  ]
})
export class EmployeesComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly shiftService = inject(ShiftService);
  private readonly modalCtrl = inject(ModalController);
  private readonly router = inject(Router);
  private readonly csvExportService = inject(CsvExportService);
  private readonly translocoService = inject(TranslocoService);

  loading = true;
  users: User[] = [];
  employeeSummaries: EmployeeSummary[] = [];
  filteredSummaries: EmployeeSummary[] = [];

  searchQuery = '';
  selectedRoles: string[] = [];

  get selectedRole(): string {
    if (this.selectedRoles.length === 0) return 'ALL';
    if (this.selectedRoles.length === 1) return this.selectedRoles[0];
    return this.selectedRoles.join(',');
  }

  set selectedRole(role: string) {
    if (!role || role === 'ALL') {
      this.selectedRoles = [];
    } else {
      this.selectedRoles = [role];
    }
    this.applyFilters();
  }

  get roleSelectOptions(): SearchableOption<string>[] {
    const counts = this.roleCounts;
    return [
      {
        value: 'SERVEUR',
        label: this.translocoService.translate('EMPLOYEES.ROLE_SERVEUR') || 'Serveurs',
        badge: (counts['SERVEUR'] ?? 0).toString(),
        badgeType: 'success',
        icon: 'restaurant-outline'
      },
      {
        value: 'BARMAN',
        label: this.translocoService.translate('EMPLOYEES.ROLE_BARMAN') || 'Barmans',
        badge: (counts['BARMAN'] ?? 0).toString(),
        badgeType: 'primary',
        icon: 'wine-outline'
      },
      {
        value: 'MANAGER',
        label: this.translocoService.translate('EMPLOYEES.ROLE_MANAGER') || 'Managers',
        badge: (counts['MANAGER'] ?? 0).toString(),
        badgeType: 'warning',
        icon: 'briefcase-outline'
      },
      {
        value: 'ADMIN',
        label: this.translocoService.translate('EMPLOYEES.ROLE_ADMIN') || 'Admins',
        badge: (counts['ADMIN'] ?? 0).toString(),
        badgeType: 'danger',
        icon: 'shield-checkmark-outline'
      }
    ];
  }

  constructor() {
    addIcons({
      peopleOutline,
      timeOutline,
      calendarOutline,
      trendingUpOutline,
      mailOutline,
      personOutline,
      downloadOutline,
      settingsOutline,
      searchOutline,
      optionsOutline,
      refreshOutline,
      chevronForwardOutline,
      briefcaseOutline,
      wineOutline,
      restaurantOutline,
      shieldCheckmarkOutline,
      speedometerOutline
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Total number of registered team members.
   */
  get totalEmployeesCount(): number {
    return this.users.length;
  }

  /**
   * Total scheduled work hours for the current week.
   */
  get totalWeeklyHours(): number {
    const sum = this.employeeSummaries.reduce((acc, s) => acc + (s.totalHours || 0), 0);
    return Math.round(sum * 10) / 10;
  }

  /**
   * Total scheduled shifts across the team for the current week.
   */
  get totalWeeklyShifts(): number {
    return this.employeeSummaries.reduce((acc, s) => acc + (s.shiftsCount || 0), 0);
  }

  /**
   * Average weekly hours per team member.
   */
  get averageWeeklyHours(): string {
    if (this.users.length === 0) return '0.0';
    const avg = this.totalWeeklyHours / this.users.length;
    return (Math.round(avg * 10) / 10).toFixed(1);
  }

  /**
   * Count of employees grouped by role.
   */
  get roleCounts(): Record<string, number> {
    const counts: Record<string, number> = {
      ALL: this.employeeSummaries.length,
      SERVEUR: 0,
      BARMAN: 0,
      MANAGER: 0,
      ADMIN: 0
    };
    for (const item of this.employeeSummaries) {
      for (const role of item.user.roles || []) {
        if (counts[role] !== undefined) {
          counts[role]++;
        }
      }
    }
    return counts;
  }

  /**
   * Selects or toggles an active role filter.
   */
  selectRole(role: string): void {
    if (role === 'ALL') {
      this.selectedRoles = [];
    } else {
      const idx = this.selectedRoles.indexOf(role);
      if (idx > -1) {
        this.selectedRoles.splice(idx, 1);
      } else {
        this.selectedRoles.push(role);
      }
    }
    this.onRoleChange();
  }

  /**
   * Clears search and resets the role filters.
   */
  resetFilters(): void {
    this.searchQuery = '';
    this.selectedRoles = [];
    this.applyFilters();
  }

  /**
   * Navigates to the full weekly schedule view.
   */
  goToSchedule(): void {
    void this.router.navigate(['/manager/schedule']);
  }

  /**
   * Navigates to the shift presets management page.
   */
  goToShiftPresets(): void {
    void this.router.navigate(['/manager/shift-presets']);
  }

  /**
   * Loads users and shifts for the current week.
   */
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
        this.selectedRoles.length === 0 ||
        Boolean(u.roles?.some((r) => this.selectedRoles.includes(r)));

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

  /**
   * Resolves the primary role token for an employee.
   */
  getUserPrimaryRole(roles?: string[]): UserRoleType {
    if (!roles || roles.length === 0) return 'SERVEUR';
    const first = roles[0].toUpperCase();
    if (first === 'ADMIN' || first === 'MANAGER' || first === 'BARMAN' || first === 'WAITER') {
      return first;
    }
    return 'SERVEUR';
  }

  /**
   * Calculates workload completion against a standard 35h week.
   */
  getWorkloadProgress(hours: number): number {
    if (!hours || hours <= 0) return 0;
    return Math.min(100, Math.round((hours / 35) * 100));
  }

  /**
   * Whether the employee has exceeded 35 hours this week.
   */
  isOvertime(hours: number): boolean {
    return (hours || 0) > 35;
  }

  /**
   * Formats employee display name (full name if available, fallback to username).
   */
  getDisplayName(user: User): string {
    const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim();
    return fullName || user.username;
  }

  /**
   * Exports employee summaries and worked hours to CSV.
   */
  exportEmployeeHoursCsv(): void {
    const list = this.filteredSummaries;
    if (!list || list.length === 0) {
      return;
    }

    const columns: CsvColumn<EmployeeSummary>[] = [
      { key: 'user', header: 'ID', formatter: (_, item) => item.user.id },
      {
        key: 'user',
        header: 'Nom_Complet',
        formatter: (_, item) => {
          const fullName = `${item.user.nom || ''} ${item.user.prenom || ''}`.trim();
          return fullName || item.user.username;
        }
      },
      { key: 'user', header: 'Identifiant', formatter: (_, item) => item.user.username },
      { key: 'user', header: 'Email', formatter: (_, item) => item.user.email },
      {
        key: 'user',
        header: 'Roles',
        formatter: (_, item) => (item.user.roles || []).join(', ')
      },
      { key: 'shiftsCount', header: 'Nombre_Shifts' },
      {
        key: 'totalHours',
        header: 'Heures_Travaillees',
        formatter: (val) => (val != null ? Number(val).toFixed(2) : '0.00')
      }
    ];

    this.csvExportService.exportTable(list, columns, 'heures_employes');
  }

  trackById(_index: number, item: EmployeeSummary): number {
    return item.user.id;
  }
}
