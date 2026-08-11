import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
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
import { addIcons } from 'ionicons';
import {
  closeOutline,
  chevronBackOutline,
  chevronForwardOutline,
  addOutline,
  trashOutline,
  timeOutline,
  lockClosedOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';
import { Store } from '@ngrx/store';
import { User } from '../../../core/models/user.model';
import { EmployeeShift, EmployeeShiftRequest, ShiftPreset, TypePoste, TypeShift } from '../../../core/models/shift.model';
import { ShiftService } from '../../../core/services/shift.service';
import { selectCurrentUser } from '../../../core/store/auth.selectors';

/**
 * Modal component for viewing and managing work shifts of a specific employee.
 * Enforces strict access control:
 * - Managers and Admins can create, modify planning and clocking fields, and delete shifts.
 * - Employees can only edit their own clocking/actual hours (pointage réel) on existing shifts.
 * - Other users have read-only access.
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
export class EmployeeShiftModalComponent implements OnInit, OnDestroy {
  /** The employee whose shifts are being managed. */
  @Input() employee!: User;

  /**
   * Optional ISO date string (yyyy-MM-dd) to pre-fill the shift creation form.
   * When set alongside {@link openInCreateMode}, the form will be displayed immediately
   * with this date pre-selected.
   */
  @Input() initialDate: string | null = null;

  /**
   * When true, the modal will open directly in shift creation mode instead
   * of showing the shift list first.
   */
  @Input() openInCreateMode = false;

  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly shiftService = inject(ShiftService);
  private readonly store = inject(Store);
  private readonly destroy$ = new Subject<void>();

  loading = true;
  saving = false;
  shifts: EmployeeShift[] = [];
  presets: ShiftPreset[] = [];

  // Authenticated user state
  currentUser: User | null = null;
  isManagerOrAdmin = false;

  /**
   * Checks if the currently logged-in user is the employee being viewed.
   */
  get isSelf(): boolean {
    return Boolean(this.currentUser?.id && this.currentUser.id === this.employee?.id);
  }

  /**
   * Whether the logged-in user has permission to edit this employee's shift.
   * True for Managers/Admins (all employees) and for the employee themselves (own shifts).
   */
  get canEditShift(): boolean {
    return this.isManagerOrAdmin || this.isSelf;
  }

  /**
   * Whether the logged-in user can create a brand new scheduled shift.
   * Restricted to Managers/Admins.
   */
  get canCreateShift(): boolean {
    return this.isManagerOrAdmin;
  }

  /**
   * Whether the logged-in user can modify planning fields (date, start/end scheduled times, break duration, shift type, poste).
   * Restricted to Managers/Admins.
   */
  get canEditPlanningFields(): boolean {
    return this.isManagerOrAdmin;
  }

  /**
   * Whether the logged-in user can edit clocking/real tracking fields (real start/end, overtime, hours done, notes).
   * Allowed for Managers/Admins and the employee themselves.
   */
  get canEditRealHours(): boolean {
    return this.isManagerOrAdmin || this.isSelf;
  }

  /**
   * Whether the logged-in user can delete a shift.
   * Restricted to Managers/Admins.
   */
  get canDeleteShift(): boolean {
    return this.isManagerOrAdmin;
  }

  // Preset manager toggle
  showPresetManager = false;

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
  formHeurePauseDebut = '12:00';
  formDureePauseMinutes = 30;
  formHeureDebutReelle = '';
  formHeureFinReelle = '';
  formHeuresSup = 0;
  formHeuresPrevues = 7.5;
  formHeuresEffectuees = 7.5;
  formNotes = '';

  availableShiftTypes: TypeShift[] = ['MATIN', 'SOIR', 'COUPURE', 'NUIT', 'CONGE'];
  availablePosteTypes: TypePoste[] = ['SERVEUR', 'BARMAN', 'CAISSE', 'MANAGER'];

  constructor() {
    addIcons({
      closeOutline,
      chevronBackOutline,
      chevronForwardOutline,
      addOutline,
      trashOutline,
      timeOutline,
      lockClosedOutline,
      informationCircleOutline
    });
  }

  ngOnInit(): void {
    const today = new Date();
    this.currentWeekStart = this.getMonday(today);

    this.store.select(selectCurrentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        if (user?.roles) {
          this.isManagerOrAdmin = user.roles.includes('ADMIN') || user.roles.includes('MANAGER');
        }
      });

    if (this.employee?.roles?.length) {
      if (this.employee.roles.includes('BARMAN')) this.formTypePoste = 'BARMAN';
      else if (this.employee.roles.includes('MANAGER')) this.formTypePoste = 'MANAGER';
      else if (this.employee.roles.includes('SERVEUR')) this.formTypePoste = 'SERVEUR';
    }

    this.loadPresets();
    this.loadShifts();

    // If opened from the schedule grid with a pre-selected date, jump straight to the creation form (managers only)
    if (this.openInCreateMode && this.initialDate && this.canCreateShift) {
      this.formDate = this.initialDate;
      this.showForm = true;
      this.editingShiftId = null;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  loadPresets(): void {
    this.shiftService.getPresets().subscribe({
      next: (presets) => {
        this.presets = presets;
      },
      error: () => {}
    });
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
    return this.shifts.reduce((acc, s) => acc + (s.heuresEffectuees || s.heuresPrevues || 0), 0);
  }

  get totalPlannedWeekHours(): number {
    return this.shifts.reduce((acc, s) => acc + (s.heuresPrevues || 0), 0);
  }

  get totalOvertimeWeekHours(): number {
    return this.shifts.reduce((acc, s) => acc + (s.heuresSup || 0), 0);
  }

  /**
   * Called when shift type dropdown changes to auto-fill times and break duration from presets.
   */
  onShiftTypeChange(type: TypeShift): void {
    this.formTypeShift = type;
    const preset = this.presets.find(p => p.typeShift === type);
    if (preset) {
      this.formHeureDebut = preset.heureDebut;
      this.formHeureFin = preset.heureFin;
      this.formDureePauseMinutes = preset.dureePauseMinutes || 30;
    } else if (type === 'MATIN') {
      this.formHeureDebut = '08:00'; this.formHeureFin = '16:00'; this.formDureePauseMinutes = 30;
    } else if (type === 'SOIR') {
      this.formHeureDebut = '16:00'; this.formHeureFin = '00:00'; this.formDureePauseMinutes = 30;
    } else if (type === 'COUPURE') {
      this.formHeureDebut = '11:00'; this.formHeureFin = '22:00'; this.formDureePauseMinutes = 120;
    } else if (type === 'NUIT') {
      this.formHeureDebut = '22:00'; this.formHeureFin = '06:00'; this.formDureePauseMinutes = 30;
    } else if (type === 'CONGE') {
      this.formHeureDebut = '00:00'; this.formHeureFin = '00:00'; this.formDureePauseMinutes = 0;
    }
    this.recalculatePlannedHours();
  }

  /**
   * Calculates planned work hours: (end - start) - breakDuration
   */
  recalculatePlannedHours(): void {
    if (!this.formHeureDebut || !this.formHeureFin || !this.formHeureDebut.includes(':') || !this.formHeureFin.includes(':')) {
      this.formHeuresPrevues = 8;
      return;
    }
    try {
      const [sH, sM] = this.formHeureDebut.split(':').map(Number);
      const [eH, eM] = this.formHeureFin.split(':').map(Number);
      let startMin = sH * 60 + sM;
      let endMin = eH * 60 + eM;
      if (endMin <= startMin) {
        endMin += 24 * 60; // Spans midnight
      }
      const totalMins = endMin - startMin - (Number(this.formDureePauseMinutes) || 0);
      const hours = Math.max(0, totalMins / 60);
      this.formHeuresPrevues = Math.round(hours * 100) / 100;
      if (!this.editingShiftId) {
        this.formHeuresEffectuees = this.formHeuresPrevues;
      }
    } catch {
      this.formHeuresPrevues = 8;
    }
  }

  openNewShiftForm(): void {
    if (!this.canCreateShift) return;
    this.editingShiftId = null;
    this.formDate = this.formatDateISO(new Date());
    this.onShiftTypeChange('MATIN');
    this.formHeurePauseDebut = '12:00';
    this.formHeureDebutReelle = '';
    this.formHeureFinReelle = '';
    this.formHeuresSup = 0;
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
    this.formHeurePauseDebut = shift.heurePauseDebut || '12:00';
    this.formDureePauseMinutes = shift.dureePauseMinutes ?? 30;
    this.formHeureDebutReelle = shift.heureDebutReelle || '';
    this.formHeureFinReelle = shift.heureFinReelle || '';
    this.formHeuresSup = shift.heuresSup || 0;
    this.formHeuresPrevues = shift.heuresPrevues || 8;
    this.formHeuresEffectuees = shift.heuresEffectuees || 8;
    this.formNotes = shift.notes || '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingShiftId = null;
  }

  togglePresetManager(): void {
    this.showPresetManager = !this.showPresetManager;
  }

  savePreset(preset: ShiftPreset): void {
    if (!preset.typeShift) return;
    this.shiftService.updatePreset(preset.typeShift, preset).subscribe({
      next: (updated) => {
        const idx = this.presets.findIndex(p => p.typeShift === updated.typeShift);
        if (idx >= 0) this.presets[idx] = updated;
        else this.presets.push(updated);
      }
    });
  }

  saveShift(): void {
    if (!this.canEditShift) return;
    if (!this.formDate || !this.formHeureDebut || !this.formHeureFin) return;

    this.recalculatePlannedHours();
    this.saving = true;
    const payload: EmployeeShiftRequest = {
      userId: this.employee.id,
      dateShift: this.formDate,
      typeShift: this.formTypeShift,
      typePoste: this.formTypePoste,
      heureDebut: this.formHeureDebut,
      heureFin: this.formHeureFin,
      heurePauseDebut: this.formHeurePauseDebut,
      dureePauseMinutes: Number(this.formDureePauseMinutes) || 0,
      heureDebutReelle: this.formHeureDebutReelle,
      heureFinReelle: this.formHeureFinReelle,
      heuresSup: Number(this.formHeuresSup) || 0,
      heuresPrevues: Number(this.formHeuresPrevues) || 0,
      heuresEffectuees: Number(this.formHeuresEffectuees) || Number(this.formHeuresPrevues) || 0,
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
    } else if (this.canCreateShift) {
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
