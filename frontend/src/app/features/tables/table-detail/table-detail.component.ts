import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon, IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, create, eye } from 'ionicons/icons';
import { NgIf, NgFor, AsyncPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { TableService } from '../../../core/services/table.service';
import { CommandeService } from '../../../core/services/commande.service';
import { TableBar } from '../../../core/models/table.model';
import { Commande } from '../../../core/models/commande.model';

@Component({
  selector: 'app-table-detail',
  templateUrl: './table-detail.component.html',
  styleUrls: ['./table-detail.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon,
    NgIf, NgFor, AsyncPipe, DatePipe, CurrencyPipe,
  ],
})
export class TableDetailComponent implements OnInit, OnDestroy {
  table: TableBar | null = null;
  commandes: Commande[] = [];
  isLoading = false;
  isAdmin$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly store: Store,private readonly router: Router,private readonly route: ActivatedRoute,private readonly tableService: TableService,private readonly commandeService: CommandeService,private readonly toastCtrl: ToastController,
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({ arrowBack, create, eye });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.isLoading = true;
    forkJoin({
      table:    this.tableService.getById(+id),
      commandes: this.commandeService.getByTable(+id),
    })
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ table, commandes }) => {
          this.table = table;
          this.commandes = commandes.filter(c => c.statut !== 'REGLEE' && c.statut !== 'ANNULEE');
        },
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Erreur lors du chargement', duration: 3000, color: 'danger' });
          toast.present();
          this.router.navigate(['/tables']);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatutColor(statut: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'warning', EN_PREPARATION: 'tertiary',
      PRET: 'success', LIVREE: 'medium', ANNULEE: 'danger',
    };
    return map[statut] ?? 'primary';
  }

  onBack(): void { this.router.navigate(['/tables']); }
  onEdit(): void { this.router.navigate(['/tables', this.table?.id, 'edit']); }
  onViewCommande(c: Commande): void { this.router.navigate(['/commandes', c.id]); }
  trackById(_: number, item: any): any { return item.id ?? _; }
}
