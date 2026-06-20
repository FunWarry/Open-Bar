import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectIsAdmin} from '../../../core/store/auth.selectors';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {arrowBack, create, eye} from 'ionicons/icons';
import {NgIf, NgFor, AsyncPipe, DatePipe, CurrencyPipe} from '@angular/common';

@Component({
  selector: 'app-table-detail',
  templateUrl: './table-detail.component.html',
  styleUrls: ['./table-detail.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon,
    NgIf, NgFor, AsyncPipe, DatePipe, CurrencyPipe
  ]
})
export class TableDetailComponent implements OnInit {
  table: any; // TODO: Remplacer par le type Table
  isAdmin$: Observable<boolean>;
  commandesDataSource: any[] = [];

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({arrowBack, create, eye});
  }

  ngOnInit(): void {
    // TODO: Charger les données de la table depuis le store
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'EN_ATTENTE': return 'warning';
      case 'EN_PREPARATION': return 'tertiary';
      case 'PRETE': return 'success';
      case 'SERVIE': return 'medium';
      default: return 'primary';
    }
  }

  onBack(): void {
    this.router.navigate(['/tables']);
  }

  onEdit(): void {
    this.router.navigate(['/tables', this.table.id, 'edit']);
  }

  onViewCommande(): void {
    if (this.table?.currentCommande) {
      this.router.navigate(['/commandes', this.table.currentCommande.id]);
    }
  }
}
