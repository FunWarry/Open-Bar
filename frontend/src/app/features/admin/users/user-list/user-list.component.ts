import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ModalController,
  ToastController,
  IonIcon,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personAdd,
  create,
  trash,
  chevronBackOutline,
  chevronForwardOutline,
  searchOutline,
  filterOutline,
  calendarOutline,
  shieldCheckmarkOutline,
  peopleOutline,
  briefcaseOutline,
  wineOutline,
  mailOutline,
  createOutline,
  trashOutline,
  restaurantOutline,
  checkmarkCircleOutline,
  closeCircleOutline
} from 'ionicons/icons';
import { User } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';
import { ConfirmDeleteModalComponent } from '../../../../core/components/ui/confirm-delete-modal/confirm-delete-modal.component';
import { SearchBarComponent } from '../../../../core/components/ui/search-bar/search-bar.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { StatCardComponent } from '../../../../core/components/ui/stat-card/stat-card.component';
import { SearchableSelectComponent, SearchableOption } from '../../../../core/components/ui/searchable-select/searchable-select.component';
import { UserAvatarComponent } from '../../../../core/components/ui/user-avatar/user-avatar.component';
import { RoleBadgeComponent, UserRoleType } from '../../../../core/components/ui/role-badge/role-badge.component';
import { EmptyStateComponent } from '../../../../core/components/ui/empty-state/empty-state.component';
import { PaginationComponent } from '../../../../core/components/ui/pagination/pagination.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

/**
 * Component managing the administrator view for paginated user listing, executive KPI statistics,
 * advanced search/filtering, and user CRUD management according to OpenBar Design System.
 */
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonSpinner,
    SearchBarComponent,
    ActionButtonComponent,
    StatCardComponent,
    SearchableSelectComponent,
    UserAvatarComponent,
    RoleBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    TranslocoPipe
  ]
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  allUsers: User[] = [];
  loading = false;

  // Pagination & Filter state
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  isFirst = true;
  isLast = true;

  searchQuery = '';
  selectedRole = 'ALL';

  readonly pageSizeOptions = [5, 10, 20];

  readonly roleSelectOptions: SearchableOption<string>[] = [
    { value: 'ALL', label: 'Tous les rôles' },
    { value: 'ADMIN', label: 'Administrateur', badge: 'ADMIN', badgeType: 'danger' },
    { value: 'MANAGER', label: 'Manager', badge: 'MANAGER', badgeType: 'warning' },
    { value: 'SERVEUR', label: 'Serveur', badge: 'SERVEUR', badgeType: 'primary' },
    { value: 'BARMAN', label: 'Barman', badge: 'BARMAN', badgeType: 'warning' }
  ];

  constructor(
    private readonly userService: UserService,
    private readonly modalCtrl: ModalController,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService
  ) {
    addIcons({
      personAdd,
      create,
      trash,
      chevronBackOutline,
      chevronForwardOutline,
      searchOutline,
      filterOutline,
      calendarOutline,
      shieldCheckmarkOutline,
      peopleOutline,
      briefcaseOutline,
      wineOutline,
      mailOutline,
      createOutline,
      trashOutline,
      restaurantOutline,
      checkmarkCircleOutline,
      closeCircleOutline
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadGlobalUserStats();
  }

  /** Total count of registered users. */
  get totalUsersCount(): number {
    return this.totalElements || this.users.length;
  }

  /** Count of administrator accounts. */
  get adminsCount(): number {
    const pool = this.allUsers.length > 0 ? this.allUsers : this.users;
    return pool.filter((u) => u.roles?.some((r) => r.toUpperCase() === 'ADMIN')).length;
  }

  /** Count of manager accounts. */
  get managersCount(): number {
    const pool = this.allUsers.length > 0 ? this.allUsers : this.users;
    return pool.filter((u) => u.roles?.some((r) => r.toUpperCase() === 'MANAGER')).length;
  }

  /** Count of waiter (SERVEUR) accounts. */
  get waitersCount(): number {
    const pool = this.allUsers.length > 0 ? this.allUsers : this.users;
    return pool.filter((u) =>
      u.roles?.some((r) => {
        const upper = r.toUpperCase();
        return upper === 'SERVEUR' || upper === 'WAITER';
      })
    ).length;
  }

  /** Count of bartender (BARMAN) accounts. */
  get bartendersCount(): number {
    const pool = this.allUsers.length > 0 ? this.allUsers : this.users;
    return pool.filter((u) => u.roles?.some((r) => r.toUpperCase() === 'BARMAN')).length;
  }

  /** Count of staff accounts (waiters and bartenders). Backward-compatibility helper. */
  get staffCount(): number {
    return this.waitersCount + this.bartendersCount;
  }

  /**
   * Loads the paginated list of users from the backend API based on current page, size, search query, and role filter.
   */
  loadUsers(): void {
    this.loading = true;
    this.userService
      .getUsersPaged(this.currentPage, this.pageSize, this.searchQuery, this.selectedRole)
      .subscribe({
        next: (page) => {
          this.users = page.content;
          this.currentPage = page.pageNumber;
          this.pageSize = page.pageSize;
          this.totalElements = page.totalElements;
          this.totalPages = page.totalPages;
          this.isFirst = page.isFirst;
          this.isLast = page.isLast;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.showToast(this.transloco.translate('USERS.LOAD_ERROR'), 'danger');
        }
      });
  }

  /**
   * Loads all users to accurately calculate global KPIs without pagination truncation when available.
   */
  private loadGlobalUserStats(): void {
    if (typeof this.userService.getUsers === 'function') {
      this.userService.getUsers().subscribe({
        next: (all) => {
          this.allUsers = all || [];
        },
        error: () => {
          // Keep using paginated items as fallback
        }
      });
    }
  }

  onSearchChange(): void {
    this.currentPage = 0;
    this.loadUsers();
  }

  onRoleChange(): void {
    this.currentPage = 0;
    this.loadUsers();
  }

  /**
   * Resets all search queries and role filters.
   */
  resetFilters(): void {
    this.searchQuery = '';
    this.selectedRole = 'ALL';
    this.currentPage = 0;
    this.loadUsers();
  }

  prevPage(): void {
    if (!this.isFirst && this.currentPage > 0) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (!this.isLast && this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  changePageSize(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadUsers();
  }

  /**
   * Handles 1-indexed page changes from Design System PaginationComponent.
   *
   * @param page1Indexed 1-indexed target page
   */
  onPageChange(page1Indexed: number): void {
    this.currentPage = Math.max(0, page1Indexed - 1);
    this.loadUsers();
  }

  trackById(index: number, user: User): number {
    return user.id ?? index;
  }

  /**
   * Formats employee display name (full name if available, fallback to username).
   */
  getDisplayName(user: User): string {
    const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim();
    return fullName || user.username;
  }

  /**
   * Resolves the primary role token for role badges and avatars.
   */
  getUserPrimaryRole(roles?: string[]): UserRoleType {
    if (!roles || roles.length === 0) return 'SERVEUR';
    const first = roles[0].toUpperCase();
    if (first === 'ADMIN' || first === 'MANAGER' || first === 'BARMAN' || first === 'WAITER') {
      return first as UserRoleType;
    }
    return 'SERVEUR';
  }

  /**
   * Formats an ISO date string or Date object into a readable localized date.
   */
  formatDate(dateInput?: string | Date): string {
    if (!dateInput) return '-';
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return String(dateInput);
    }
  }

  async openCreateDialog(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: UserDialogComponent,
      componentProps: { data: null }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.userService.createUser(data).subscribe({
        next: () => {
          this.showToast(this.transloco.translate('USERS.CREATE_SUCCESS'), 'success');
          this.loadUsers();
          this.loadGlobalUserStats();
        },
        error: (err) => {
          const msg = err?.error?.message || this.transloco.translate('USERS.CREATE_ERROR');
          this.showToast(msg, 'danger');
        }
      });
    }
  }

  async openEditDialog(user: User): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: UserDialogComponent,
      componentProps: { data: user }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.userService.updateUser(user.id, data).subscribe({
        next: () => {
          this.showToast(this.transloco.translate('USERS.EDIT_SUCCESS'), 'success');
          this.loadUsers();
          this.loadGlobalUserStats();
        },
        error: (err) => {
          const msg = err?.error?.message || this.transloco.translate('USERS.EDIT_ERROR');
          this.showToast(msg, 'danger');
        }
      });
    }
  }

  async openDeleteDialog(user: User): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ConfirmDeleteModalComponent,
      componentProps: {
        title: this.transloco.translate('USERS.DELETE_CONFIRM'),
        itemName: this.getDisplayName(user),
        warningMessage: this.transloco.translate('USERS.DELETE_WARNING'),
        metaTags: [
          { icon: 'mail-outline', text: user.email },
          { icon: 'shield-checkmark-outline', text: (user.roles || []).join(', ') }
        ],
        detailsSummary: [
          { label: this.transloco.translate('USERS.USERNAME_LABEL'), value: `@${user.username}` },
          { label: this.transloco.translate('USERS.EMAIL_LABEL'), value: user.email }
        ],
        confirmBtnText: this.transloco.translate('COMMON.DELETE')
      }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.confirmed) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.showToast(this.transloco.translate('USERS.DELETE_SUCCESS'), 'success');
          this.loadUsers();
          this.loadGlobalUserStats();
        },
        error: (err) => {
          const msg = err?.error?.message || this.transloco.translate('USERS.DELETE_ERROR');
          this.showToast(msg, 'danger');
        }
      });
    }
  }

  private showToast(message: string, color: 'success' | 'danger' | 'warning'): void {
    void this.toastCtrl
      .create({
        message,
        duration: 3000,
        color,
        position: 'bottom'
      })
      .then((t) => void t.present());
  }
}
