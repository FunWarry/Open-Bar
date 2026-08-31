import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ToastController } from '@ionic/angular/standalone';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { CommandeService } from '../../../core/services/commande.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { TableAppelService } from '../../../core/services/table-appel.service';
import { TableAppelType } from '../../../core/models/table-appel.model';
import { Commande } from '../../../core/models/commande.model';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';

/**
 * Client Suivi Component for real-time tracking of a customer order via STOMP WebSocket,
 * with quick assistance call and bill request actions.
 * Aligned with Figma Vue Client QR Code specs (`636:1083`).
 */
@Component({
  selector: 'app-client-suivi',
  templateUrl: './client-suivi.component.html',
  styleUrls: ['./client-suivi.component.css'],
  standalone: true,
  imports: [
    RouterLink,
    AppCurrencyPipe,
    TranslocoModule,
    ActionButtonComponent
  ]
})
export class ClientSuiviComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly commandeService = inject(CommandeService);
  private readonly websocketService = inject(WebSocketService);
  private readonly tableAppelService = inject(TableAppelService);
  private readonly toastCtrl = inject(ToastController);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  commandeId: number | null = null;
  commande: Commande | null = null;
  isLoading = true;

  // Table alert & cooldown state
  isCallingServer = false;
  cooldownSeconds = 0;
  activeCallType: TableAppelType | null = null;
  private cooldownTimer: any = null;

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = Number.parseInt(params['id'], 10);
      if (!Number.isNaN(id)) {
        this.commandeId = id;
        this.loadCommande(id);
        this.subscribeWebSocket(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
  }

  /**
   * Triggers a waiter assistance call or bill request alert from the tracking page.
   *
   * @param type - Alert type ('ASSISTANCE' or 'ADDITION')
   */
  appelerServeur(type: TableAppelType = 'ASSISTANCE'): void {
    const tableId = this.commande?.tableNumero || this.commande?.tableId;
    if (!tableId || this.isCallingServer || this.cooldownSeconds > 0) return;

    this.isCallingServer = true;
    this.tableAppelService
      .appelerServeur(tableId, type)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.isCallingServer = false;
          this.activeCallType = type;
          this.startCooldown(60);

          const msgKey = type === 'ADDITION'
            ? 'CLIENT.ALERTS.BILL_REQUEST_SENT'
            : 'CLIENT.ALERTS.WAITER_CALLED';
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate(msgKey),
            duration: 4000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
        },
        error: async (err) => {
          this.isCallingServer = false;
          const errMsg = err?.error?.message || this.translocoService.translate('CLIENT.ALERTS.CALL_FAILED');
          const toast = await this.toastCtrl.create({
            message: errMsg,
            duration: 4000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
        }
      });
  }

  private startCooldown(seconds: number): void {
    this.cooldownSeconds = seconds;
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
    this.cooldownTimer = setInterval(() => {
      if (this.cooldownSeconds > 1) {
        this.cooldownSeconds -= 1;
      } else {
        this.cooldownSeconds = 0;
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }

  private loadCommande(id: number): void {
    this.isLoading = true;
    this.commandeService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Commande) => {
          this.commande = data;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  private subscribeWebSocket(id: number): void {
    this.websocketService
      .watch(`/topic/commande/${id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          try {
            const updated: Commande = JSON.parse(message.body);
            if (updated?.id === id) {
              this.commande = updated;
            }
          } catch {
            this.loadCommande(id);
          }
        }
      });
  }

  get statusStep(): number {
    if (!this.commande) return 1;
    switch (this.commande.statut) {
      case 'EN_ATTENTE':
        return 1;
      case 'EN_PREPARATION':
        return 2;
      case 'PRET':
      case 'LIVREE':
      case 'REGLEE':
        return 3;
      default:
        return 1;
    }
  }

  get statusLabelKey(): string {
    if (!this.commande) return 'CLIENT.STATUS_RECEIVED';
    switch (this.commande.statut) {
      case 'EN_ATTENTE':
        return 'CLIENT.STATUS_RECEIVED';
      case 'EN_PREPARATION':
        return 'CLIENT.STATUS_PREPARING';
      case 'PRET':
        return 'CLIENT.STATUS_READY';
      case 'LIVREE':
        return 'CLIENT.STATUS_SERVED';
      case 'REGLEE':
        return 'CLIENT.STATUS_SETTLED';
      default:
        return this.commande.statut;
    }
  }

  get statusLabel(): string {
    return this.statusLabelKey;
  }
}
