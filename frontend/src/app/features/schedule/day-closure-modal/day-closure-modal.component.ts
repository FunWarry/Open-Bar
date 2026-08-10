import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonInput,
  IonToggle,
  IonBadge,
  IonButtons,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, calendarOutline, lockClosedOutline, lockOpenOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-day-closure-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonToggle,
    IonBadge,
    IonButtons
  ],
  templateUrl: './day-closure-modal.component.html',
  styleUrls: ['./day-closure-modal.component.css']
})
export class DayClosureModalComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);

  @Input() dateISO!: string;
  @Input() isClosed = false;
  @Input() closureReason?: string;

  formattedDate = '';
  startDate = '';
  endDate = '';
  isDateRange = false;
  reason = 'Fermeture exceptionnelle';
  isAnnualRecurring = false;

  presetReasons = ['Congés annuels', 'Jour Férié', 'Armistice', 'Travaux', 'Fermeture exceptionnelle'];

  constructor() {
    addIcons({
      closeOutline,
      calendarOutline,
      lockClosedOutline,
      lockOpenOutline,
      checkmarkCircleOutline,
      alertCircleOutline
    });
  }

  ngOnInit(): void {
    if (this.dateISO) {
      this.startDate = this.dateISO;
      this.endDate = this.dateISO;

      const [year, month, day] = this.dateISO.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      this.formattedDate = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      this.formattedDate = this.formattedDate.charAt(0).toUpperCase() + this.formattedDate.slice(1);
    }
    if (this.isClosed && this.closureReason) {
      this.reason = this.closureReason;
    }
  }

  selectPreset(preset: string): void {
    this.reason = preset;
    if (preset === 'Congés annuels') {
      this.isDateRange = true;
      // Default to 1 week from start date
      if (this.startDate) {
        const d = new Date(this.startDate);
        d.setDate(d.getDate() + 7);
        this.endDate = d.toISOString().split('T')[0];
      }
    }
  }

  dismiss(): void {
    this.modalCtrl.dismiss(null);
  }

  saveClosure(): void {
    this.modalCtrl.dismiss({
      action: 'close',
      startDate: this.startDate || this.dateISO,
      endDate: this.isDateRange && this.endDate ? this.endDate : undefined,
      reason: this.reason.trim() || 'Fermeture exceptionnelle',
      isAnnualRecurring: this.isAnnualRecurring
    });
  }

  reopenDay(): void {
    this.modalCtrl.dismiss({
      action: 'reopen'
    });
  }
}
