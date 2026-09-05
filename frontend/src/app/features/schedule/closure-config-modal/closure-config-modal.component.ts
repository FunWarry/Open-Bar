import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonInput,
  IonToggle,
  IonBadge,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, addOutline, trashOutline, calendarOutline, timeOutline, settingsOutline, lockClosedOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { ClosureService, EstablishmentClosure, DayOfWeek } from '../../../core/services/closure.service';

interface WeeklyDayOption {
  dayOfWeek: DayOfWeek;
  label: string;
  isClosed: boolean;
  closureId?: number;
}

/**
 * Modal component allowing Managers & Admins to configure weekly recurring closed days, single holidays, and date range closures.
 */
@Component({
  selector: 'app-closure-config-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonInput,
    IonToggle,
    IonBadge
  ],
  templateUrl: './closure-config-modal.component.html',
  styleUrls: ['./closure-config-modal.component.css']
})
export class ClosureConfigModalComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly closureService = inject(ClosureService);

  loading = true;
  saving = false;
  closures: EstablishmentClosure[] = [];

  weeklyDays: WeeklyDayOption[] = [
    { dayOfWeek: 'MONDAY', label: 'Lundi', isClosed: false },
    { dayOfWeek: 'TUESDAY', label: 'Mardi', isClosed: false },
    { dayOfWeek: 'WEDNESDAY', label: 'Mercredi', isClosed: false },
    { dayOfWeek: 'THURSDAY', label: 'Jeudi', isClosed: false },
    { dayOfWeek: 'FRIDAY', label: 'Vendredi', isClosed: false },
    { dayOfWeek: 'SATURDAY', label: 'Samedi', isClosed: false },
    { dayOfWeek: 'SUNDAY', label: 'Dimanche', isClosed: false }
  ];

  // New exceptional closure form fields
  newClosureReason = '';
  newClosureDate = '';
  newEndDate = '';
  newIsDateRange = false;
  newIsAnnualRecurring = false;

  presetReasons = ['Congés annuels', 'Jour Férié', 'Armistice', 'Travaux', 'Fermeture exceptionnelle'];

  constructor() {
    addIcons({
      closeOutline,
      addOutline,
      trashOutline,
      calendarOutline,
      timeOutline,
      settingsOutline,
      lockClosedOutline,
      checkmarkCircleOutline
    });
  }

  ngOnInit(): void {
    this.loadClosures();
  }

  loadClosures(): void {
    this.loading = true;
    this.closureService.getClosures().subscribe({
      next: (data) => {
        this.closures = data;
        this.syncWeeklyDays();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private syncWeeklyDays(): void {
    const weeklyMap = new Map<DayOfWeek, number>();
    this.closures.forEach((c) => {
      if (c.type === 'WEEKLY_RECURRING' && c.dayOfWeek) {
        weeklyMap.set(c.dayOfWeek, c.id);
      }
    });

    this.weeklyDays.forEach((d) => {
      if (weeklyMap.has(d.dayOfWeek)) {
        d.isClosed = true;
        d.closureId = weeklyMap.get(d.dayOfWeek);
      } else {
        d.isClosed = false;
        d.closureId = undefined;
      }
    });
  }

  toggleWeeklyDay(day: WeeklyDayOption): void {
    if (day.isClosed && day.closureId) {
      this.closureService.deleteClosure(day.closureId).subscribe(() => {
        this.loadClosures();
      });
    } else {
      this.closureService
        .createClosure({
          type: 'WEEKLY_RECURRING',
          dayOfWeek: day.dayOfWeek,
          reason: `Fermeture hebdomadaire (${day.label})`
        })
        .subscribe(() => {
          this.loadClosures();
        });
    }
  }

  selectPreset(preset: string): void {
    this.newClosureReason = preset;
    if (preset === 'Congés annuels' || preset === 'Annual Leave') {
      this.newIsDateRange = true;
      if (this.newClosureDate) {
        const d = new Date(this.newClosureDate);
        d.setDate(d.getDate() + 7);
        this.newEndDate = d.toISOString().split('T')[0];
      }
    }
  }

  addExceptionalClosure(): void {
    if (!this.newClosureDate || !this.newClosureReason.trim()) return;

    this.saving = true;
    this.closureService
      .createClosure({
        type: 'EXCEPTIONAL',
        closureDate: this.newClosureDate,
        endDate: this.newIsDateRange && this.newEndDate ? this.newEndDate : undefined,
        isAnnualRecurring: this.newIsAnnualRecurring,
        reason: this.newClosureReason.trim()
      })
      .subscribe({
        next: () => {
          this.newClosureReason = '';
          this.newClosureDate = '';
          this.newEndDate = '';
          this.newIsDateRange = false;
          this.newIsAnnualRecurring = false;
          this.saving = false;
          this.loadClosures();
        },
        error: () => {
          this.saving = false;
        }
      });
  }

  deleteClosure(id: number): void {
    this.closureService.deleteClosure(id).subscribe(() => {
      this.loadClosures();
    });
  }

  get exceptionalClosures(): EstablishmentClosure[] {
    return this.closures.filter((c) => c.type === 'EXCEPTIONAL');
  }

  dismiss(): void {
    this.modalCtrl.dismiss(true);
  }
}
