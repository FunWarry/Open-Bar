import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, peopleOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { FactureService } from '../services/facture.service';
import { Facture, FactureItem } from '../models/facture.model';
import { environment } from '../../../../environments/environment';

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
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly route: ActivatedRoute,private readonly factureService: FactureService,private readonly toastCtrl: ToastController,
  ) {
    addIcons({ downloadOutline, peopleOutline, checkmarkCircleOutline });
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

  telechargerPdf() {
    if (this.facture) {
      window.open(`${environment.apiUrl}/factures/${this.facture.id}/pdf`, '_blank');
    }
  }

  reglerFacture() {
    if (!this.facture || this.facture.reglee) return;
    this.factureService.reglerFacture(this.facture.id, 'ESPECES')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async f => {
          this.facture = f;
          const toast = await this.toastCtrl.create({ message: 'Facture marquée comme réglée', duration: 2000, color: 'success' });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Erreur lors du règlement', duration: 3000, color: 'danger' });
          toast.present();
        },
      });
  }
}
