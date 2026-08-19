import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { printOutline, receiptOutline } from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { Facture, FactureItem } from '../models/facture.model';
import { EstablishmentConfig } from '../../../core/models/establishment-config.model';
import { EtablissementService } from '../../../core/services/etablissement.service';

/**
 * Thermal receipt component formatted for 80mm and 58mm thermal printers and web preview.
 */
@Component({
  selector: 'app-ticket-receipt',
  standalone: true,
  imports: [CommonModule, IonIcon, TranslocoModule],
  templateUrl: './ticket-receipt.component.html',
  styleUrls: ['./ticket-receipt.component.scss'],
})
export class TicketReceiptComponent implements OnInit {
  @Input() facture!: Facture;
  @Input() establishmentConfig?: EstablishmentConfig;
  @Input() ticketFormat?: '80mm' | '58mm';

  selectedFormat: '80mm' | '58mm' = '80mm';

  private readonly etablissementService = inject(EtablissementService);

  constructor() {
    addIcons({ printOutline, receiptOutline });
  }

  ngOnInit(): void {
    if (this.ticketFormat) {
      this.selectedFormat = this.ticketFormat;
    }
    if (!this.establishmentConfig) {
      this.etablissementService.getConfig().subscribe({
        next: (config) => {
          this.establishmentConfig = config;
          if (!this.ticketFormat && config?.ticketFormat) {
            this.selectedFormat = config.ticketFormat;
          }
        },
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
            ticketFormat: '80mm',
          };
        },
      });
    } else if (!this.ticketFormat && this.establishmentConfig.ticketFormat) {
      this.selectedFormat = this.establishmentConfig.ticketFormat;
    }
  }

  setFormat(format: '80mm' | '58mm'): void {
    this.selectedFormat = format;
  }

  get dividerString(): string {
    return this.selectedFormat === '58mm'
      ? '-----------------------'
      : '--------------------------------';
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
