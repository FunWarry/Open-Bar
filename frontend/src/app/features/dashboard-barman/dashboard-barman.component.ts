import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonRefresher, IonRefresherContent,
  IonGrid, IonRow, IonCol,
  ToastController
} from '@ionic/angular/standalone';
import { CommandeCardComponent } from './components/commande-card/commande-card.component';
import { DashboardBarmanService } from './services/dashboard-barman.service';
import { CommandeView } from './models/commande-view.model';

@Component({
  selector: 'app-dashboard-barman',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonRefresher, IonRefresherContent,
    IonGrid, IonRow, IonCol,
    CommandeCardComponent
  ],
  templateUrl: './dashboard-barman.component.html',
  styleUrls: ['./dashboard-barman.component.scss'],
})
export class DashboardBarmanComponent implements OnInit, OnDestroy {
  commandesEnAttente: CommandeView[] = [];
  commandesEnPreparation: CommandeView[] = [];
  commandesPret: CommandeView[] = [];

  stockAlertes: Array<{ message: string; niveau: 'warning' | 'critical' }> = [];

  private destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardBarmanService,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() {
    this.chargerCommandes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  chargerCommandes() {
    forkJoin({
      enAttente: this.dashboardService.getCommandesEnAttente(),
      enPreparation: this.dashboardService.getCommandesEnPreparation(),
      pret: this.dashboardService.getCommandesPret(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ enAttente, enPreparation, pret }) => {
          this.commandesEnAttente = enAttente as CommandeView[];
          this.commandesEnPreparation = enPreparation as CommandeView[];
          this.commandesPret = pret as CommandeView[];
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du chargement des commandes',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  async onChangerStatut(event: { id: number; statut: string }) {
    this.dashboardService
      .changerStatut(event.id, event.statut)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.chargerCommandes();
          const toast = await this.toastCtrl.create({
            message: 'Statut mis à jour',
            duration: 2000,
            color: 'success',
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Impossible de mettre à jour le statut',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  onRefresh(event: any) {
    this.chargerCommandes();
    setTimeout(() => event.target.complete(), 500);
  }

  dismissAlerte(index: number) {
    this.stockAlertes.splice(index, 1);
  }

  trackById(_: number, cmd: CommandeView): number {
    return cmd.id;
  }
}
