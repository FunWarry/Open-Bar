import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonRefresher, IonRefresherContent,
  IonGrid, IonRow, IonCol,
  IonSegment, IonSegmentButton, IonLabel,
  ToastController
} from '@ionic/angular/standalone';
import { TableCardComponent } from './components/table-card/table-card.component';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardServeurService } from './services/dashboard-serveur.service';
import { TableView } from './models/table-view.model';

@Component({
  selector: 'app-dashboard-serveur',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonRefresher, IonRefresherContent,
    IonGrid, IonRow, IonCol,
    IonSegment, IonSegmentButton, IonLabel,
    TableCardComponent
  ],
  templateUrl: './dashboard-serveur.component.html',
  styleUrls: ['./dashboard-serveur.component.scss'],
})
export class DashboardServeurComponent implements OnInit, OnDestroy {
  tables: TableView[] = [];
  filteredTables: TableView[] = [];
  selectedFilter = 'toutes';
  isLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private service: DashboardServeurService,
    private toastCtrl: ToastController,
    private notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.chargerTables();

    // Rechargement automatique des tables à chaque event WS table ou commande
    this.notificationService.onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        if (notif.type === 'table' || notif.type === 'commande') {
          this.chargerTables();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  chargerTables(refreshEvent?: any) {
    this.isLoading = true;
    this.service.getAllTables()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) refreshEvent.target.complete();
        }),
      )
      .subscribe({
        next: tables => {
          this.tables = tables;
          this.filtrer();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du chargement des tables',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  filtrer() {
    switch (this.selectedFilter) {
      case 'occupees':
        this.filteredTables = this.tables.filter(t => t.occupee);
        break;
      case 'libres':
        this.filteredTables = this.tables.filter(t => !t.occupee);
        break;
      default:
        this.filteredTables = [...this.tables];
    }
  }

  get countOccupees(): number {
    return this.tables.filter(t => t.occupee).length;
  }

  get countLibres(): number {
    return this.tables.filter(t => !t.occupee).length;
  }

  onSegmentChange(event: any) {
    this.selectedFilter = event.detail.value;
    this.filtrer();
  }

  async onLiberer(tableId: number) {
    this.service.libererTable(tableId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.chargerTables();
          const toast = await this.toastCtrl.create({
            message: 'Table libérée',
            duration: 2000,
            color: 'success',
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Impossible de libérer la table',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  onRefresh(event: any) {
    this.chargerTables(event);
  }

  trackById(_: number, item: any): number {
    return item.id;
  }
}
