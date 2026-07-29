import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonList, IonItem,
  IonLabel, IonBadge, IonButton, IonIcon, ToastController, IonSegment, IonSegmentButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, peopleOutline, checkmarkCircleOutline, printOutline, documentTextOutline } from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { FactureService } from '../services/facture.service';
import { Facture, FactureItem } from '../models/facture.model';
import { TicketReceiptComponent } from '../ticket-receipt/ticket-receipt.component';
import { EstablishmentConfig } from '../../../core/models/establishment-config.model';
import { EtablissementService } from '../../../core/services/etablissement.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-facture-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, TranslocoModule, TicketReceiptComponent,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonBackButton, IonButtons,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon,
    IonSegment, IonSegmentButton
  ],
  templateUrl: './facture-detail.component.html',
  styleUrls: ['./facture-detail.component.scss'],
})
export class FactureDetailComponent implements OnInit, OnDestroy {
  facture: Facture | null = null;
  establishmentConfig: EstablishmentConfig | null = null;
  activeView: 'invoice' | 'ticket' = 'invoice';

  private readonly route = inject(ActivatedRoute);
  private readonly factureService = inject(FactureService);
  private readonly etablissementService = inject(EtablissementService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroy$ = new Subject<void>();

  constructor() {
    addIcons({ downloadOutline, peopleOutline, checkmarkCircleOutline, printOutline, documentTextOutline });
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => this.factureService.getFactureById(Number(params.get('id')))),
      takeUntil(this.destroy$)
    ).subscribe({ next: f => this.facture = f });

    this.etablissementService.getConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: config => this.establishmentConfig = config, error: () => {} });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get montantAffiche(): number {
    return this.facture?.totalTTC ?? this.facture?.total ?? 0;
  }

  get totalHT(): number {
    return this.facture?.totalHT ?? (this.montantAffiche / 1.2);
  }

  get totalVAT(): number {
    return this.facture?.totalVAT ?? (this.montantAffiche - this.totalHT);
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

