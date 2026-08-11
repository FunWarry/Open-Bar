import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonBadge,
  IonSpinner,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  timeOutline,
  createOutline,
  trashOutline,
  addCircleOutline,
  informationCircleOutline,
  arrowForwardOutline
} from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { ShiftService } from '../../../core/services/shift.service';
import { EmployeeShift, ShiftAuditAction, ShiftAuditLog } from '../../../core/models/shift.model';

/**
 * Modal displaying the immutable modification history for an individual work shift.
 */
@Component({
  selector: 'app-shift-history-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonBadge,
    IonSpinner
  ],
  templateUrl: './shift-history-modal.component.html',
  styleUrls: ['./shift-history-modal.component.scss']
})
export class ShiftHistoryModalComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly shiftService = inject(ShiftService);

  @Input() shiftId!: number;
  @Input() employeeName?: string;

  loading = true;
  logs: ShiftAuditLog[] = [];

  constructor() {
    addIcons({
      closeOutline,
      timeOutline,
      createOutline,
      trashOutline,
      addCircleOutline,
      informationCircleOutline,
      arrowForwardOutline
    });
  }

  ngOnInit(): void {
    if (this.shiftId) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
    this.loading = true;
    this.shiftService.getShiftHistory(this.shiftId).subscribe({
      next: (logs) => {
        this.logs = logs;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  parseSnapshot(json?: string): EmployeeShift | null {
    if (!json) return null;
    try {
      return JSON.parse(json) as EmployeeShift;
    } catch {
      return null;
    }
  }

  getActionBadgeColor(action: ShiftAuditAction): string {
    switch (action) {
      case 'CREATED': return 'success';
      case 'UPDATED': return 'primary';
      case 'DELETED': return 'danger';
      default: return 'medium';
    }
  }

  getActionIcon(action: ShiftAuditAction): string {
    switch (action) {
      case 'CREATED': return 'add-circle-outline';
      case 'UPDATED': return 'create-outline';
      case 'DELETED': return 'trash-outline';
      default: return 'time-outline';
    }
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
