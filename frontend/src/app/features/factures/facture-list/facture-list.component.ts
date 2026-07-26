import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonList, IonItem, IonLabel, IonBadge,
  IonRefresher, IonRefresherContent,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { receiptOutline, chevronForwardOutline } from 'ionicons/icons';
import { FactureService } from '../services/facture.service';
import { Facture } from '../models/facture.model';

@Component({
  selector: 'app-facture-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonList, IonItem, IonLabel, IonBadge,
    IonRefresher, IonRefresherContent,
    IonIcon
  ],
  templateUrl: './facture-list.component.html',
  styleUrls: ['./facture-list.component.scss'],
})
export class FactureListComponent implements OnInit, OnDestroy {
  factures: Facture[] = [];
  loading = false;
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly factureService: FactureService) {
    addIcons({ receiptOutline, chevronForwardOutline });
  }

  ngOnInit() {
    this.charger();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger() {
    this.loading = true;
    this.factureService.getAllFactures()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: f => { this.factures = f; this.loading = false; },
        error: () => { this.loading = false; }
      });
  }

  onRefresh(event: CustomEvent) {
    const target = event.target as HTMLIonRefresherElement;
    this.factureService.getAllFactures()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: f => { this.factures = f; target.complete(); },
        error: () => target.complete()
      });
  }

  statutColor(reglee: boolean): string {
    return reglee ? 'success' : 'warning';
  }

  statutLabel(reglee: boolean): string {
    return reglee ? 'RÉGLÉE' : 'EN ATTENTE';
  }

  trackById(_: number, f: Facture) {
    return f.id;
  }
}
