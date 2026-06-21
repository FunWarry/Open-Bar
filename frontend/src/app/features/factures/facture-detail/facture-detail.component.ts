import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonBackButton, IonButtons,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline } from 'ionicons/icons';
import { FactureService } from '../services/facture.service';
import { Facture, FactureItem } from '../models/facture.model';

@Component({
  selector: 'app-facture-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonBackButton, IonButtons,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon
  ],
  templateUrl: './facture-detail.component.html',
  styleUrls: ['./facture-detail.component.scss'],
})
export class FactureDetailComponent implements OnInit, OnDestroy {
  facture: Facture | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private factureService: FactureService
  ) {
    addIcons({ peopleOutline });
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => this.factureService.getFactureById(Number(params.get('id')))),
      takeUntil(this.destroy$)
    ).subscribe({ next: f => this.facture = f });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get montantAffiche(): number {
    return this.facture?.totalTTC ?? this.facture?.total ?? 0;
  }

  statutColor(reglee: boolean): string {
    return reglee ? 'success' : 'warning';
  }

  statutLabel(reglee: boolean): string {
    return reglee ? 'RÉGLÉE' : 'EN ATTENTE';
  }

  trackById(_: number, item: FactureItem) {
    return item.id;
  }
}
