import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  ModalController, AlertController, ToastController,
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonIcon, IonContent, IonBadge, IonSpinner, IonFooter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, banOutline, playOutline, checkmarkCircleOutline,
  checkmarkDoneOutline, timeOutline, personOutline,
  statsChartOutline, receiptOutline, gridOutline,
  cashOutline, chatbubbleEllipsesOutline,
} from 'ionicons/icons';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande, CommandeItem, CommandeStatut } from '../../../core/models/commande.model';
import { groupCommandeItems } from '../../../core/utils/order-item-grouper';

/**
 * Modal component rendering full order details, metrics, items breakdown with unit prices,
 * and direct action controls (advancing status, cancellation with confirmation popup).
 */
@Component({
  selector: 'app-commande-detail-modal',
  templateUrl: './commande-detail-modal.component.html',
  styleUrls: ['./commande-detail-modal.component.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonIcon, IonContent, IonBadge, IonSpinner, IonFooter,
    CurrencyPipe, DatePipe, TranslocoPipe,
  ],
})
export class CommandeDetailModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) commandeId!: number;
  @Input() commandeInput?: Commande;

  commande: Commande | null = null;
  isLoading = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
    private readonly commandeService: CommandeService,
    private readonly translocoService: TranslocoService,
  ) {
    addIcons({
      closeOutline, banOutline, playOutline, checkmarkCircleOutline,
      checkmarkDoneOutline, timeOutline, personOutline, gridOutline,
      statsChartOutline, receiptOutline, cashOutline, chatbubbleEllipsesOutline,
    });
  }

  ngOnInit(): void {
    if (this.commandeInput) {
      this.commande = this.commandeInput;
    } else if (this.commandeId) {
      this.charger();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    this.isLoading = true;
    this.commandeService.getById(this.commandeId)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoading = false)))
      .subscribe({
        next: commande => (this.commande = commande),
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Commande introuvable',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
          this.dismiss();
        },
      });
  }

  /**
   * Groups identical items (same cocktail name, variante, and notes) and sums quantities.
   */
  get groupedItems(): CommandeItem[] {
    return groupCommandeItems(this.commande?.items) as CommandeItem[];
  }

  getItemLineTotal(item: CommandeItem): number {
    return (item.prixUnitaire || 0) * (item.quantite || 1);
  }

  getStatutColor(statut: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'warning',
      EN_PREPARATION: 'tertiary',
      PRET: 'success',
      LIVREE: 'medium',
      REGLEE: 'dark',
      ANNULEE: 'danger',
    };
    return map[statut] ?? 'primary';
  }

  peutAnnuler(): boolean {
    return !!this.commande && !['LIVREE', 'REGLEE', 'ANNULEE'].includes(this.commande.statut);
  }

  onUpdateStatus(targetStatut: CommandeStatut): void {
    if (!this.commande) return;
    this.commandeService.changerStatut(this.commande.id, targetStatut)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async updated => {
          this.commande = updated;
          const toast = await this.toastCtrl.create({
            message: 'Statut de la commande mis à jour',
            duration: 2000,
            color: 'success',
          });
          toast.present();
          this.dismiss({ role: 'statusUpdated', commande: updated, targetStatut });
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du changement de statut',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  async onAnnuler(): Promise<void> {
    if (!this.commande) return;

    const title = this.translocoService.translate('COMMANDES.CONFIRM_CANCEL_TITLE');
    const msg = this.translocoService.translate('COMMANDES.CONFIRM_CANCEL_MSG', {
      id: this.commande.id,
      table: this.commande.tableNumero,
    });
    const confirmBtnText = this.translocoService.translate('COMMANDES.CONFIRM_CANCEL_OK');
    const keepBtnText = this.translocoService.translate('COMMANDES.CONFIRM_CANCEL_KEEP');

    const alert = await this.alertCtrl.create({
      header: title,
      message: msg,
      buttons: [
        {
          text: keepBtnText,
          role: 'cancel',
        },
        {
          text: confirmBtnText,
          role: 'destructive',
          handler: () => {
            this.confirmAnnuler();
          },
        },
      ],
    });

    await alert.present();
  }

  private confirmAnnuler(): void {
    if (!this.commande) return;
    this.commandeService.annuler(this.commande.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async updated => {
          this.commande = updated;
          const toast = await this.toastCtrl.create({
            message: 'Commande annulée avec succès',
            duration: 2000,
            color: 'warning',
          });
          toast.present();
          this.dismiss({ role: 'cancelled', commande: updated });
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Impossible d\'annuler cette commande',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  dismiss(data?: any): void {
    this.modalCtrl.dismiss(data);
  }
}
