import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
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
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAdd, create, trash } from 'ionicons/icons';
import { User } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';
import { DeleteUserDialogComponent } from '../delete-user-dialog/delete-user-dialog.component';

/**
 * Component managing the administrator view for user listing, creation, modification, and deletion.
 */
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
  standalone: true,
  imports: [
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
    DatePipe
  ]
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  loading = false;

  constructor(
    private readonly userService: UserService,
    private readonly modalCtrl: ModalController,
    private readonly toastCtrl: ToastController
  ) {
    addIcons({ personAdd, create, trash });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  /**
   * Loads the current list of users from the backend API.
   */
  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showToast('Erreur lors du chargement des utilisateurs', 'danger');
      }
    });
  }

  /**
   * Tracks user items by unique identifier for list rendering optimization.
   *
   * @param index Item index.
   * @param user User entity.
   * @returns User ID or array index.
   */
  trackById(index: number, user: User): number {
    return user.id ?? index;
  }

  /**
   * Returns the color associated with a user role for badge display.
   *
   * @param role User role name.
   * @returns Ionic color string.
   */
  getRoleColor(role: string): string {
    return role === 'ADMIN' ? 'tertiary' : 'primary';
  }

  /**
   * Opens the creation dialog for a new user.
   */
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

  /**
   * Opens the editing dialog for an existing user.
   *
   * @param user Target user to edit.
   */
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

  /**
   * Opens the deletion confirmation dialog for a user.
   *
   * @param user Target user to delete.
   */
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

  /**
   * Helper displaying a transient toast message to the user.
   *
   * @param message Message to display.
   * @param color Toast color theme.
   */
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
