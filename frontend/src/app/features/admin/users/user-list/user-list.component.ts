import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ModalController,
  ToastController,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonBadge,
  IonIcon,
  IonButton,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personAdd, create, trash,
  chevronBackOutline, chevronForwardOutline, searchOutline, filterOutline, calendarOutline
} from 'ionicons/icons';
import { User } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';
import { DeleteUserDialogComponent } from '../delete-user-dialog/delete-user-dialog.component';

/**
 * Component managing the administrator/manager view for paginated user listing, search, filtering, and CRUD operations.
 */
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonBadge,
    IonIcon,
    IonButton,
    IonSpinner,
    IonSelect,
    IonSelectOption,
    IonInput
  ]
})
export class UserListComponent implements OnInit {
  users: User[] = [];
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
  readonly availableRoles = [
    { value: 'ALL', label: 'Tous les rôles' },
    { value: 'ADMIN', label: 'Administrateur' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'SERVEUR', label: 'Serveur' },
    { value: 'BARMAN', label: 'Barman' }
  ];

  constructor(
    private readonly userService: UserService,
    private readonly modalCtrl: ModalController,
    private readonly toastCtrl: ToastController
  ) {
    addIcons({
      personAdd, create, trash,
      chevronBackOutline, chevronForwardOutline, searchOutline, filterOutline, calendarOutline
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  /**
   * Loads the paginated list of users from the backend API based on current page, size, search query, and role filter.
   */
  loadUsers(): void {
    this.loading = true;
    this.userService.getUsersPaged(this.currentPage, this.pageSize, this.searchQuery, this.selectedRole).subscribe({
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
        this.showToast('Erreur lors du chargement des utilisateurs', 'danger');
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 0;
    this.loadUsers();
  }

  onRoleChange(): void {
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

  trackById(index: number, user: User): number {
    return user.id ?? index;
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'ADMIN': return 'tertiary';
      case 'MANAGER': return 'secondary';
      case 'SERVEUR': return 'primary';
      case 'BARMAN': return 'warning';
      default: return 'medium';
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
          this.showToast('Utilisateur créé avec succès', 'success');
          this.loadUsers();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Erreur lors de la création de l\'utilisateur';
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
          this.showToast('Utilisateur modifié avec succès', 'success');
          this.loadUsers();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Erreur lors de la modification de l\'utilisateur';
          this.showToast(msg, 'danger');
        }
      });
    }
  }

  async openDeleteDialog(user: User): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: DeleteUserDialogComponent,
      componentProps: { data: user },
      cssClass: 'delete-modal'
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.showToast('Utilisateur supprimé avec succès', 'success');
          this.loadUsers();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Erreur lors de la suppression de l\'utilisateur';
          this.showToast(msg, 'danger');
        }
      });
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
