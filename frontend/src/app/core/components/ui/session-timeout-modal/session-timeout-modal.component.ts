import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButton,
  IonIcon,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { timeOutline, refreshOutline, logOutOutline, alertCircleOutline } from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Modal dialog warning the user that their 4-hour active session is about to expire,
 * displaying a live countdown and providing one-touch controls to extend or log out.
 */
@Component({
  selector: 'app-session-timeout-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButton,
    IonIcon,
    TranslocoPipe,
  ],
  templateUrl: './session-timeout-modal.component.html',
  styleUrls: ['./session-timeout-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionTimeoutModalComponent implements OnInit, OnDestroy {
  /** Initial remaining time in seconds when the warning dialog appears (defaults to 300s = 5min) */
  @Input() remainingSeconds = 300;

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private readonly modalCtrl = inject(ModalController);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({
      timeOutline,
      refreshOutline,
      logOutOutline,
      alertCircleOutline,
    });
  }

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  /**
   * Formats remaining seconds as MM:SS string.
   */
  get remainingFormatted(): string {
    const total = Math.max(0, Math.floor(this.remainingSeconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      if (this.remainingSeconds <= 0) {
        this.stopCountdown();
        this.modalCtrl.dismiss({ action: 'expired' });
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Dismisses the modal signaling the user wants to extend their session by 4 hours.
   */
  onExtend(): void {
    this.stopCountdown();
    this.modalCtrl.dismiss({ action: 'extend' });
  }

  /**
   * Dismisses the modal signaling the user wants to immediately log out.
   */
  onLogout(): void {
    this.stopCountdown();
    this.modalCtrl.dismiss({ action: 'logout' });
  }
}
