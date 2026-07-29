import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {User} from '../../../../core/models/user.model';
import { ModalController, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons } from '@ionic/angular/standalone';
import {UserDialogComponent} from '../user-dialog/user-dialog.component';
import {DeleteUserDialogComponent} from '../delete-user-dialog/delete-user-dialog.component';

import {addIcons} from 'ionicons';
import {personAdd, create, trash} from 'ionicons/icons';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    DatePipe
  ],
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  users$: Observable<User[]>;

  constructor(private readonly store: Store,private readonly modalCtrl: ModalController) {
    // TODO: Remplacer par le sélecteur des utilisateurs
    this.users$ = this.store.select(state => []);
    addIcons({personAdd, create, trash});
  }

  ngOnInit(): void {
    this.users$.subscribe(users => {
      this.users = users;
    });
  }

  trackById(index: number, user: User): any {
    return user.id ?? index;
  }

  getRoleColor(role: string): string {
    return role === 'ADMIN' ? 'tertiary' : 'primary';
  }

  async openCreateDialog(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: UserDialogComponent,
      componentProps: {data: null}
    });
    await modal.present();
    const {data} = await modal.onWillDismiss();
    if (data) {
      // TODO: Dispatch l'action de création d'utilisateur
      console.log('Création utilisateur:', data);
    }
  }

  async openEditDialog(user: User): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: UserDialogComponent,
      componentProps: {data: user}
    });
    await modal.present();
    const {data} = await modal.onWillDismiss();
    if (data) {
      // TODO: Dispatch l'action de modification d'utilisateur
      console.log('Modification utilisateur:', data);
    }
  }

  async openDeleteDialog(user: User): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: DeleteUserDialogComponent,
      componentProps: {data: user},
      cssClass: 'delete-modal'
    });
    await modal.present();
    const {data} = await modal.onWillDismiss();
    if (data) {
      // TODO: Dispatch l'action de suppression d'utilisateur
      console.log('Suppression utilisateur:', user.id);
    }
  }
}
