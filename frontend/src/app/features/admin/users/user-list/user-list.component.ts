import {Component, OnInit, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {User} from '../../../../core/models/user.model';
import {UserDialogComponent} from '../user-dialog/user-dialog.component';
import {DeleteUserDialogComponent} from '../delete-user-dialog/delete-user-dialog.component';
import {MatCardModule} from '@angular/material/card';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatTableModule} from '@angular/material/table';
import {MatSortModule} from '@angular/material/sort';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatChipsModule} from '@angular/material/chips';
import { DatePipe } from '@angular/common';
@Component({
  selector: 'app-user-list',
  templateUrl: `./user-list.component.html`,
  styleUrl: `./user-list.component.scss`,
  standalone: true,
  imports: [
    MatCardModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    DatePipe
  ]
})
export class UserListComponent implements OnInit {
  displayedColumns: string[] = ['username', 'email', 'roles', 'createdAt', 'actions'];
  dataSource: MatTableDataSource<User>;
  users$: Observable<User[]>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private store: Store,
    private dialog: MatDialog
  ) {
    this.dataSource = new MatTableDataSource();
    // TODO: Remplacer par le sélecteur des utilisateurs
    this.users$ = this.store.select(state => []);
  }

  ngOnInit(): void {
    this.users$.subscribe(users => {
      this.dataSource.data = users;
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '600px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // TODO: Dispatch l'action de création d'utilisateur
        console.log('Création utilisateur:', result);
      }
    });
  }

  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '600px',
      data: user
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // TODO: Dispatch l'action de modification d'utilisateur
        console.log('Modification utilisateur:', result);
      }
    });
  }

  openDeleteDialog(user: User): void {
    const dialogRef = this.dialog.open(DeleteUserDialogComponent, {
      width: '400px',
      data: user
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // TODO: Dispatch l'action de suppression d'utilisateur
        console.log('Suppression utilisateur:', user.id);
      }
    });
  }
}
