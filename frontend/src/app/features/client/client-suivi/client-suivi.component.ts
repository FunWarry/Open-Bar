import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoModule } from '@jsverse/transloco';
import { CommandeService } from '../../../core/services/commande.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Commande } from '../../../core/models/commande.model';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';

/**
 * Client Suivi Component for real-time tracking of a customer order via STOMP WebSocket.
 * Aligned with Figma Vue Client QR Code specs (`636:1083`).
 */
@Component({
  selector: 'app-client-suivi',
  templateUrl: './client-suivi.component.html',
  styleUrls: ['./client-suivi.component.css'],
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    TranslocoModule,
    ActionButtonComponent
  ]
})
export class ClientSuiviComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly commandeService = inject(CommandeService);
  private readonly websocketService = inject(WebSocketService);
  private readonly destroy$ = new Subject<void>();

  commandeId: number | null = null;
  commande: Commande | null = null;
  isLoading = true;

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
            if (updated && updated.id === id) {
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

  get statusLabel(): string {
    if (!this.commande) return 'Commande reçue';
    switch (this.commande.statut) {
      case 'EN_ATTENTE':
        return 'Commande transmise';
      case 'EN_PREPARATION':
        return 'En préparation par le barman';
      case 'PRET':
        return 'Votre commande est prête !';
      case 'LIVREE':
        return 'Commande servie à votre table';
      case 'REGLEE':
        return 'Commande réglée';
      default:
        return this.commande.statut;
    }
  }
}
