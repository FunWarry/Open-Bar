import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonBadge, IonIcon, IonButton, IonButtons,
  IonRefresher, IonRefresherContent, IonSpinner, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, eye, create, people, checkmarkCircle, closeCircle, layersOutline } from 'ionicons/icons';
import { AsyncPipe } from '@angular/common';
import { TableService } from '../../../core/services/table.service';
import { TableBar } from '../../../core/models/table.model';
import { ZoneManagerComponent } from '../zone-manager/zone-manager.component';

@Component({
  selector: 'app-table-list',
  templateUrl: './table-list.component.html',
  styleUrls: ['./table-list.component.css'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonGrid, IonRow, IonCol, IonBadge, IonIcon, IonButton, IonButtons,
    IonRefresher, IonRefresherContent, IonSpinner,
    AsyncPipe,
  ],
})
export class TableListComponent implements OnInit, OnDestroy {
  tables: TableBar[] = [];
  isLoading = false;
  isAdmin$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly tableService: TableService,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({ add, eye, create, people, checkmarkCircle, closeCircle, layersOutline });
  }

  ngOnInit(): void { this.charger(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(refreshEvent?: any): void {
    this.isLoading = true;
    this.tableService.getAll()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) refreshEvent.target.complete();
        }),
      )
      .subscribe({
        next: tables => (this.tables = tables),
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Erreur lors du chargement des tables', duration: 3000, color: 'danger' });
          toast.present();
        },
      });
  }

  async onManageZones(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ZoneManagerComponent,
      cssClass: 'modal-standard'
    });
    await modal.present();
    await modal.onDidDismiss();
    this.charger();
  }

  onAdd(): void { this.router.navigate(['/tables/new']); }
  onView(t: TableBar): void { this.router.navigate(['/tables', t.id]); }
  onEdit(t: TableBar): void { this.router.navigate(['/tables', t.id, 'edit']); }
  onRefresh(event: any): void { this.charger(event); }
  trackById(_: number, t: TableBar): number { return t.id; }
}
