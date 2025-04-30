import {Component, OnInit, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectIsAdmin} from '../../../core/store/auth.selectors';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatTableModule} from '@angular/material/table';
import {MatSortModule} from '@angular/material/sort';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { CurrencyPipe } from '@angular/common';

@Component({
    selector: 'app-commande-list',
    templateUrl: './commande-list.component.html',
    styleUrls: ['./commande-list.component.css'],
    standalone: true,
    imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatPaginatorModule, MatTableModule, MatSortModule, MatIconModule, MatButtonModule, MatChipsModule, CurrencyPipe]
})
export class CommandeListComponent implements OnInit {
  displayedColumns: string[] = ['table', 'status', 'total', 'actions'];
  dataSource: MatTableDataSource<any>;
  isAdmin$: Observable<boolean>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private store: Store) {
    this.dataSource = new MatTableDataSource();
    this.isAdmin$ = this.store.select(selectIsAdmin);
  }

  ngOnInit(): void {
    // TODO: Charger les commandes depuis le store
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'EN_ATTENTE':
        return 'warn';
      case 'EN_PREPARATION':
        return 'accent';
      case 'PRETE':
        return 'primary';
      case 'SERVIE':
        return 'primary';
      default:
        return 'primary';
    }
  }

  onAdd(): void {
    // TODO: Naviguer vers le formulaire de création
  }

  onView(commande: any): void {
    // TODO: Naviguer vers la vue détaillée
  }

  onEdit(commande: any): void {
    // TODO: Naviguer vers le formulaire d'édition
  }

  onDelete(commande: any): void {
    // TODO: Supprimer la commande
  }
}
