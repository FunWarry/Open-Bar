import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { printOutline } from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { Facture, FactureItem } from '../models/facture.model';
import { EstablishmentConfig } from '../../../core/models/establishment-config.model';
import { EtablissementService } from '../../../core/services/etablissement.service';

/**
 * Thermal receipt component formatted for 80mm thermal printers and web preview.
 */
@Component({
  selector: 'app-ticket-receipt',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, TranslocoModule],
  templateUrl: './ticket-receipt.component.html',
  styleUrls: ['./ticket-receipt.component.scss'],
})
export class TicketReceiptComponent implements OnInit {
  @Input() facture!: Facture;
  @Input() establishmentConfig?: EstablishmentConfig;

  private readonly etablissementService = inject(EtablissementService);

  constructor() {
    addIcons({ printOutline });
  }

  ngOnInit(): void {
    if (!this.establishmentConfig) {
      this.etablissementService.getConfig().subscribe({
        next: (config) => (this.establishmentConfig = config),
        error: () => {
          // Fallback default config if service fails
          this.establishmentConfig = {
            legalName: 'OpenBar SARL',
            legalForm: 'SARL',
            siret: '12345678900010',
            rcsCity: 'Paris',
            rcsNumber: 'B 123 456 789',
            tvaNumber: 'FR12123456789',
            codeApe: '5630Z',
            capitalSocial: 10000,
            address: '12 Rue du Bar, 75001 Paris',
            phone: '+33123456789',
            email: 'contact@openbar.local',
            paymentTerms: 'Paiement immédiat à réception',
            discountPolicy: 'Aucun escompte pour paiement anticipé',
            latePaymentRate: 0.12,
          };
        },
      });
    }
  }

  get totalTTC(): number {
    return this.facture?.totalTTC ?? this.facture?.total ?? 0;
  }

  get totalHT(): number {
    if (this.facture?.totalHT) return this.facture.totalHT;
    return this.totalTTC / 1.2;
  }

  get totalVAT(): number {
    if (this.facture?.totalVAT) return this.facture.totalVAT;
    return this.totalTTC - this.totalHT;
  }

  trackById(_index: number, item: FactureItem): number {
    return item.id;
  }

  imprimerTicket(): void {
    window.print();
  }
}
