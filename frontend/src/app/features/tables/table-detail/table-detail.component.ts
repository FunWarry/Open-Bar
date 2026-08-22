import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonBadge, IonButton, IonButtons, IonIcon, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, create, eye } from 'ionicons/icons';
import { AsyncPipe, DatePipe } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
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
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonBadge, IonButton, IonButtons, IonIcon,
    AsyncPipe, DatePipe, AppCurrencyPipe,
    TranslocoPipe,
  ],
})
export class TableDetailComponent implements OnInit, OnDestroy {
  table: TableBar | null = null;
  commandes: Commande[] = [];
  isLoading = false;
  isAdmin$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly tableService: TableService,
    private readonly commandeService: CommandeService,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService,
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
          const toast = await this.toastCtrl.create({ message: String(this.transloco.translate('ERRORS.SERVER') || 'Erreur lors du chargement'), duration: 3000, color: 'danger' });
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
