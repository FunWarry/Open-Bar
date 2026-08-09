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
  IonToast,
  IonButtons,
  ToastController
} from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';
import { ShiftPreset, TypeShift } from '../../core/models/shift.model';
import { ShiftService } from '../../core/services/shift.service';

/**
 * Manager Configuration Component for managing master shift template presets.
 * Allows Managers/Admins to configure default start, end times, and break durations for all shift types.
 */
@Component({
  selector: 'app-shift-presets-config',
  templateUrl: './shift-presets-config.component.html',
  styleUrls: ['./shift-presets-config.component.css'],
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
    IonToast,
    IonButtons
  ]
})
export class ShiftPresetsConfigComponent implements OnInit {
  private readonly shiftService = inject(ShiftService);
  private readonly toastCtrl = inject(ToastController);

  loading = true;
  savingMap: { [key: string]: boolean } = {};
  presets: ShiftPreset[] = [];

  ngOnInit(): void {
    this.loadPresets();
  }

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

  async savePreset(preset: ShiftPreset): Promise<void> {
    if (!preset.typeShift) return;
    this.savingMap[preset.typeShift] = true;

    this.shiftService.updatePreset(preset.typeShift, preset).subscribe({
      next: async (updated) => {
        this.savingMap[preset.typeShift] = false;
        const idx = this.presets.findIndex((p) => p.typeShift === updated.typeShift);
        if (idx >= 0) this.presets[idx] = updated;

        const toast = await this.toastCtrl.create({
          message: 'Modèle mis à jour avec succès',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      },
      error: async () => {
        this.savingMap[preset.typeShift] = false;
        const toast = await this.toastCtrl.create({
          message: 'Erreur lors de la mise à jour du modèle',
          duration: 2000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

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
}
