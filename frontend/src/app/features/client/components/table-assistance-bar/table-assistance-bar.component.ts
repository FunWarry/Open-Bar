import { Component, Input, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ToastController } from '@ionic/angular/standalone';
import { TableAppelService } from '../../../../core/services/table-appel.service';
import { TableAppelType } from '../../../../core/models/table-appel.model';

/**
 * Reusable client assistance action bar providing one-tap waiter call
 * and bill requests with a synchronized 60-second cooldown timer.
 */
@Component({
  selector: 'app-table-assistance-bar',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  templateUrl: './table-assistance-bar.component.html',
  styleUrls: ['./table-assistance-bar.component.scss']
})
export class TableAssistanceBarComponent implements OnDestroy {
  @Input({ required: true }) tableNumero!: number;

  isCallingServer = false;
  cooldownSeconds = 0;
  activeCallType: TableAppelType | null = null;
  private cooldownTimer: any = null;

  private readonly tableAppelService = inject(TableAppelService);
  private readonly toastCtrl = inject(ToastController);
  private readonly translocoService = inject(TranslocoService);

  ngOnDestroy(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
  }

  /**
   * Triggers a waiter or bill assistance alert for the current table.
   *
   * @param type Alert type (ASSISTANCE or ADDITION)
   */
  appelerServeur(type: TableAppelType): void {
    if (this.isCallingServer || this.cooldownSeconds > 0 || !this.tableNumero) {
      return;
    }

    this.isCallingServer = true;
    this.tableAppelService.appelerServeur(this.tableNumero, type).subscribe({
      next: () => {
        this.isCallingServer = false;
        this.activeCallType = type;
        this.startCooldown(60);
        this.afficherToast(
          type === 'ADDITION'
            ? 'CLIENT.ALERTS.BILL_SENT_SUCCESS'
            : 'CLIENT.ALERTS.CALL_SENT_SUCCESS',
          'success'
        );
      },
      error: (err: { status?: number }) => {
        this.isCallingServer = false;
        const msgKey = err?.status === 400
          ? 'CLIENT.ALERTS.COOLDOWN_ACTIVE'
          : 'CLIENT.ALERTS.SEND_ERROR';
        this.afficherToast(msgKey, 'danger');
      }
    });
  }

  private startCooldown(seconds: number): void {
    this.cooldownSeconds = seconds;
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
    this.cooldownTimer = setInterval(() => {
      this.cooldownSeconds--;
      if (this.cooldownSeconds <= 0) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
        this.activeCallType = null;
      }
    }, 1000);
  }

  private async afficherToast(messageKey: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translocoService.translate(messageKey),
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
