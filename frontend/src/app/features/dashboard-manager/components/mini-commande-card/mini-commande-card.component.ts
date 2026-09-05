import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { timeOutline, timerOutline, personOutline, documentTextOutline } from 'ionicons/icons';
import { OngoingOrder } from '../../models/ongoing-order.model';
import { AppSettingsService } from '../../../../core/services/app-settings.service';

/**
 * Compact order card representation for Manager Kanban columns.
 * Displays order context, items breakdown, server, total amount, elapsed time, and wait duration.
 */
@Component({
  selector: 'app-mini-commande-card',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonIcon],
  templateUrl: './mini-commande-card.component.html',
  styleUrls: ['./mini-commande-card.component.scss'],
})
export class MiniCommandeCardComponent {
  /** The ongoing order view displayed by the mini card. */
  @Input() order!: OngoingOrder;

  private readonly appSettingsService = inject(AppSettingsService, { optional: true });

  constructor() {
    addIcons({ timeOutline, timerOutline, personOutline, documentTextOutline });
  }

  /** Formatted time string (HH:mm) of order creation. */
  get formattedTime(): string {
    if (!this.order?.dateCommande) return '';
    const date = new Date(this.order.dateCommande);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  /** Elapsed waiting time in minutes since order creation. */
  get waitTimeMinutes(): number {
    if (!this.order?.dateCommande) return 0;
    const orderTime = new Date(this.order.dateCommande).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - orderTime);
    return Math.floor(diffMs / 60000);
  }

  /** Human-readable elapsed waiting time string (e.g. "5 min", "1h 12m", "+2j"). */
  get waitTimeLabel(): string {
    const mins = this.waitTimeMinutes;
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `+${days}j`;
    }
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  }

  /** Color-coded severity level based on elapsed wait duration, order status, and dynamic thresholds. */
  get waitTimeSeverity(): 'normal' | 'warning' | 'urgent' | 'critical' {
    if (this.order?.statut === 'LIVREE') return 'normal';
    const mins = this.waitTimeMinutes;
    const settings = this.appSettingsService?.currentSettings;
    const warning = settings?.tempsAlerteWarningMinutes ?? 3;
    const urgent = settings?.tempsAlerteCommandeMinutes ?? 5;
    const critical = settings?.tempsAlerteCritiqueCommandeMinutes ?? 10;

    if (mins >= critical) return 'critical';
    if (mins >= urgent) return 'urgent';
    if (mins >= warning) return 'warning';
    return 'normal';
  }

  /** Formats currency amount in EUR. */
  formatCurrency(val?: number): string {
    if (val === undefined || val === null) return '';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
  }
}
