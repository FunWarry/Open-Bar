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

@Component({
  selector: 'app-ingredient-list',
  templateUrl: './ingredient-list.component.html',
  styleUrls: ['./ingredient-list.component.css'],
  standalone: true,
  imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatPaginatorModule, MatTableModule, MatSortModule, MatIconModule, MatButtonModule, MatChipsModule]
})
export class IngredientListComponent implements OnInit {
  displayedColumns: string[] = ['name', 'category', 'stock', 'actions'];
  dataSource: MatTableDataSource<any>;
  isAdmin$: Observable<boolean>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private store: Store) {
    this.dataSource = new MatTableDataSource();
    this.isAdmin$ = this.store.select(selectIsAdmin);
  }

  ngOnInit(): void {
    // TODO: Charger les ingrédients depuis le store
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getStockColor(stock: number): string {
    if (stock <= 0) {
      return 'warn';
    } else if (stock < 10) {
      return 'accent';
    }
    return 'primary';
  }

  onAdd(): void {
    // TODO: Naviguer vers le formulaire de création
  }

  onView(ingredient: any): void {
    // TODO: Naviguer vers la vue détaillée
  }

  onEdit(ingredient: any): void {
    // TODO: Naviguer vers le formulaire d'édition
  }

  onDelete(ingredient: any): void {
    // TODO: Supprimer l'ingrédient
  }
}
