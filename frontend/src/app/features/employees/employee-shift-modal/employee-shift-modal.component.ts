import { Component, Input, OnInit, inject } from '@angular/core';
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
  IonList,
  IonItem,
  IonBadge,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonTextarea,
  ModalController,
  AlertController
} from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';
import { User } from '../../../core/models/user.model';
import { EmployeeShift, EmployeeShiftRequest, TypePoste, TypeShift } from '../../../core/models/shift.model';
import { ShiftService } from '../../../core/services/shift.service';

/**
 * Modal component for viewing and managing work shifts of a specific employee.
 */
@Component({
  selector: 'app-employee-shift-modal',
  templateUrl: './employee-shift-modal.component.html',
  styleUrls: ['./employee-shift-modal.component.css'],
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
    IonList,
    IonItem,
    IonBadge,
    IonSpinner,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonTextarea
  ]
})
export class EmployeeShiftModalComponent implements OnInit {
  @Input() employee!: User;

  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly shiftService = inject(ShiftService);

  loading = true;
  saving = false;
  shifts: EmployeeShift[] = [];

  // Week navigation state
  currentWeekStart!: Date;

  // Form state
  showForm = false;
  editingShiftId: number | null = null;
  formDate = '';
  formTypeShift: TypeShift = 'MATIN';
  formTypePoste: TypePoste = 'SERVEUR';
  formHeureDebut = '08:00';
  formHeureFin = '16:00';
  formHeuresEffectuees = 8;
  formNotes = '';

  availableShiftTypes: TypeShift[] = ['MATIN', 'SOIR', 'COUPURE', 'NUIT', 'CONGE'];
  availablePosteTypes: TypePoste[] = ['SERVEUR', 'BARMAN', 'CAISSE', 'MANAGER'];

  ngOnInit(): void {
    const today = new Date();
    this.currentWeekStart = this.getMonday(today);
    if (this.employee?.roles?.length) {
      if (this.employee.roles.includes('BARMAN')) this.formTypePoste = 'BARMAN';
      else if (this.employee.roles.includes('MANAGER')) this.formTypePoste = 'MANAGER';
      else if (this.employee.roles.includes('SERVEUR')) this.formTypePoste = 'SERVEUR';
    }
    this.loadShifts();
  }

  /**
   * Calculates Monday for a given date.
   */
  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Gets Sunday for the current week start date.
   */
  get currentWeekEnd(): Date {
    const end = new Date(this.currentWeekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }

  /**
   * Formats a Date object to YYYY-MM-DD string.
   */
  formatDateISO(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formats a Date object to readable DD/MM string.
   */
  formatDateShort(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  loadShifts(): void {
    this.loading = true;
    const startStr = this.formatDateISO(this.currentWeekStart);
    const endStr = this.formatDateISO(this.currentWeekEnd);

    this.shiftService.getShiftsForWeek(startStr, endStr).subscribe({
      next: (allShifts) => {
        this.shifts = allShifts.filter((s) => s.userId === this.employee.id);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  prevWeek(): void {
    const prev = new Date(this.currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    this.currentWeekStart = prev;
    this.loadShifts();
  }

  nextWeek(): void {
    const next = new Date(this.currentWeekStart);
    next.setDate(next.getDate() + 7);
    this.currentWeekStart = next;
    this.loadShifts();
  }

  resetToCurrentWeek(): void {
    this.currentWeekStart = this.getMonday(new Date());
    this.loadShifts();
  }

  get totalWeekHours(): number {
    return this.shifts.reduce((acc, s) => acc + (s.heuresEffectuees || 0), 0);
  }

  openNewShiftForm(): void {
    this.editingShiftId = null;
    this.formDate = this.formatDateISO(new Date());
    this.formTypeShift = 'MATIN';
    this.formHeureDebut = '08:00';
    this.formHeureFin = '16:00';
    this.formHeuresEffectuees = 8;
    this.formNotes = '';
    this.showForm = true;
  }

  openEditShiftForm(shift: EmployeeShift): void {
    this.editingShiftId = shift.id || null;
    this.formDate = shift.dateShift;
    this.formTypeShift = shift.typeShift;
    this.formTypePoste = shift.typePoste;
    this.formHeureDebut = shift.heureDebut;
    this.formHeureFin = shift.heureFin;
    this.formHeuresEffectuees = shift.heuresEffectuees || 8;
    this.formNotes = shift.notes || '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingShiftId = null;
  }

  saveShift(): void {
    if (!this.formDate || !this.formHeureDebut || !this.formHeureFin) return;

    this.saving = true;
    const payload: EmployeeShiftRequest = {
      userId: this.employee.id,
      dateShift: this.formDate,
      typeShift: this.formTypeShift,
      typePoste: this.formTypePoste,
      heureDebut: this.formHeureDebut,
      heureFin: this.formHeureFin,
      heuresEffectuees: Number(this.formHeuresEffectuees) || 0,
      notes: this.formNotes || ''
    };

    if (this.editingShiftId) {
      this.shiftService.updateShift(this.editingShiftId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeForm();
          this.loadShifts();
        },
        error: () => {
          this.saving = false;
        }
      });
    } else {
      this.shiftService.createShift(payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeForm();
          this.loadShifts();
        },
        error: () => {
          this.saving = false;
        }
      });
    }
  }

  async confirmDeleteShift(shift: EmployeeShift): Promise<void> {
    if (!shift.id) return;
    const alert = await this.alertCtrl.create({
      header: 'Suppression',
      message: 'Voulez-vous vraiment supprimer ce créneau ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            if (shift.id) {
              this.shiftService.deleteShift(shift.id).subscribe(() => this.loadShifts());
            }
          }
        }
      ]
    });
    await alert.present();
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
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
