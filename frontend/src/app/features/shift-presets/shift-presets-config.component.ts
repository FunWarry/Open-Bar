import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonInput,
  IonBadge,
  IonSpinner,
  IonButtons,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  settingsOutline,
  saveOutline,
  timeOutline,
  cafeOutline,
  moonOutline,
  sunnyOutline,
  fitnessOutline,
  refreshOutline,
  hourglassOutline,
  checkmarkCircleOutline,
  restaurantOutline,
  bedOutline,
  calendarOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ShiftPreset, TypeShift } from '../../core/models/shift.model';
import { ShiftService } from '../../core/services/shift.service';

/**
 * Manager Configuration Component for managing master shift template presets.
 * Allows Managers and Administrators to configure default start, end times, and break durations for all shift types,
 * complete with real-time duration calculation, quick break chips, and standard preset restoration.
 */
@Component({
  selector: 'app-shift-presets-config',
  templateUrl: './shift-presets-config.component.html',
  styleUrls: ['./shift-presets-config.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslocoModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonInput,
    IonBadge,
    IonSpinner,
    IonButtons
  ]
})
export class ShiftPresetsConfigComponent implements OnInit {
  private readonly shiftService = inject(ShiftService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translocoService = inject(TranslocoService);

  loading = true;
  savingMap: { [key: string]: boolean } = {};
  presets: ShiftPreset[] = [];

  readonly breakPresets: number[] = [0, 15, 30, 45, 60, 120];

  constructor() {
    addIcons({
      arrowBackOutline,
      settingsOutline,
      saveOutline,
      timeOutline,
      cafeOutline,
      moonOutline,
      sunnyOutline,
      fitnessOutline,
      refreshOutline,
      hourglassOutline,
      checkmarkCircleOutline,
      restaurantOutline,
      bedOutline,
      calendarOutline
    });
  }

  ngOnInit(): void {
    this.loadPresets();
  }

  /**
   * Fetches all configured shift presets from the backend service.
   */
  loadPresets(): void {
    this.loading = true;
    this.shiftService.getPresets().subscribe({
      next: (data) => {
        this.presets = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Updates a single shift template preset.
   *
   * @param preset The modified ShiftPreset to persist
   */
  async savePreset(preset: ShiftPreset): Promise<void> {
    if (!preset.typeShift) return;
    this.savingMap[preset.typeShift] = true;

    this.shiftService.updatePreset(preset.typeShift, preset).subscribe({
      next: async (updated) => {
        this.savingMap[preset.typeShift] = false;
        const idx = this.presets.findIndex((p) => p.typeShift === updated.typeShift);
        if (idx >= 0) this.presets[idx] = updated;

        const message = this.translocoService.translate('SHIFTS.CONFIG.SAVE_SUCCESS');
        const toast = await this.toastCtrl.create({
          message,
          duration: 2500,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      },
      error: async () => {
        this.savingMap[preset.typeShift] = false;
        const message = this.translocoService.translate('SHIFTS.CONFIG.SAVE_ERROR');
        const toast = await this.toastCtrl.create({
          message,
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

  /**
   * Fast break duration selector chip handler.
   *
   * @param preset The target ShiftPreset
   * @param minutes The break duration in minutes
   */
  setBreakDuration(preset: ShiftPreset, minutes: number): void {
    preset.dureePauseMinutes = minutes;
  }

  /**
   * Parses time string (HH:mm) into minutes from midnight.
   */
  private parseTimeToMinutes(timeStr?: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    const hours = Number.isNaN(parts[0]) ? 0 : parts[0];
    const minutes = Number.isNaN(parts[1]) ? 0 : parts[1];
    return hours * 60 + minutes;
  }

  /**
   * Calculates gross duration, net duration, and overnight state for a preset in real time.
   */
  calculateEffectiveDuration(preset: ShiftPreset): {
    grossFormatted: string;
    effectiveFormatted: string;
    isOvernight: boolean;
    netMinutes: number;
  } {
    if (!preset.heureDebut || !preset.heureFin || preset.typeShift === 'CONGE') {
      return {
        grossFormatted: '0h',
        effectiveFormatted: '0h',
        isOvernight: false,
        netMinutes: 0
      };
    }

    const startMin = this.parseTimeToMinutes(preset.heureDebut);
    let endMin = this.parseTimeToMinutes(preset.heureFin);
    let isOvernight = false;

    if (endMin <= startMin) {
      endMin += 24 * 60;
      isOvernight = true;
    }

    const grossMinutes = endMin - startMin;
    const breakMin = preset.dureePauseMinutes || 0;
    const netMinutes = Math.max(0, grossMinutes - breakMin);

    const formatMins = (totalMins: number): string => {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      if (m > 0) {
        const mStr = m < 10 ? `0${m}` : `${m}`;
        return `${h}h ${mStr}min`;
      }
      return `${h}h`;
    };

    return {
      grossFormatted: formatMins(grossMinutes),
      effectiveFormatted: formatMins(netMinutes),
      isOvernight,
      netMinutes
    };
  }

  /**
   * Computes the average effective work duration across all active presets.
   */
  getAverageEffectiveDuration(): string {
    const workingPresets = this.presets.filter((p) => p.typeShift !== 'CONGE');
    if (workingPresets.length === 0) return '0h';

    let totalNetMinutes = 0;
    for (const p of workingPresets) {
      totalNetMinutes += this.calculateEffectiveDuration(p).netMinutes;
    }
    const avgMinutes = Math.round(totalNetMinutes / workingPresets.length);
    const h = Math.floor(avgMinutes / 60);
    const m = avgMinutes % 60;
    if (m > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}h ${mStr}min`;
    }
    return `${h}h`;
  }

  /**
   * Computes the average break duration across all active presets.
   */
  getAverageBreakDuration(): number {
    const workingPresets = this.presets.filter((p) => p.typeShift !== 'CONGE');
    if (workingPresets.length === 0) return 0;

    const totalBreaks = workingPresets.reduce((sum, p) => sum + (p.dureePauseMinutes || 0), 0);
    return Math.round(totalBreaks / workingPresets.length);
  }

  /**
   * Prompts manager confirmation and restores all shift presets to standard default values.
   */
  async confirmResetToDefaults(): Promise<void> {
    const header = this.translocoService.translate('SHIFTS.CONFIG.RESET_CONFIRM_TITLE');
    const message = this.translocoService.translate('SHIFTS.CONFIG.RESET_CONFIRM_MSG');

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: this.translocoService.translate('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translocoService.translate('COMMON.CONFIRM'),
          handler: () => {
            this.executeResetToDefaults();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Restores default standard working hours for all presets.
   */
  private executeResetToDefaults(): void {
    const standardDefaults: { [key in TypeShift]: { nom: string; debut: string; fin: string; pause: number } } = {
      MATIN: { nom: 'Service Matin', debut: '08:00', fin: '16:00', pause: 30 },
      SOIR: { nom: 'Service Soir', debut: '16:00', fin: '00:00', pause: 30 },
      COUPURE: { nom: 'Service Coupure', debut: '11:00', fin: '22:00', pause: 120 },
      NUIT: { nom: 'Service Nuit', debut: '22:00', fin: '06:00', pause: 30 },
      CONGE: { nom: 'Congé / Absence', debut: '00:00', fin: '00:00', pause: 0 }
    };

    for (const preset of this.presets) {
      const def = standardDefaults[preset.typeShift];
      if (def) {
        preset.nom = def.nom;
        preset.heureDebut = def.debut;
        preset.heureFin = def.fin;
        preset.dureePauseMinutes = def.pause;
        this.savePreset(preset);
      }
    }
  }

  /**
   * Returns Ionic badge color token corresponding to shift type.
   */
  getShiftBadgeColor(type: TypeShift): string {
    switch (type) {
      case 'MATIN': return 'warning';
      case 'SOIR': return 'primary';
      case 'COUPURE': return 'tertiary';
      case 'NUIT': return 'secondary';
      case 'CONGE': return 'medium';
      default: return 'primary';
    }
  }

  /**
   * Returns Ionic icon name corresponding to shift type.
   */
  getShiftIcon(type: TypeShift): string {
    switch (type) {
      case 'MATIN': return 'sunny-outline';
      case 'SOIR': return 'time-outline';
      case 'COUPURE': return 'cafe-outline';
      case 'NUIT': return 'moon-outline';
      case 'CONGE': return 'fitness-outline';
      default: return 'time-outline';
    }
  }
}
