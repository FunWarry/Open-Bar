import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import {
  addOutline,
  closeOutline,
  createOutline,
  refreshOutline,
  timeOutline,
  trashOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { RestaurantServiceShift, RestaurantShiftService } from '../../../../core/services/restaurant-shift.service';
import {
  SearchableOption,
  SearchableSelectComponent,
} from '../../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Modal dialog for configuring restaurant service shifts (Lunch, Dinner, Afterwork, Night, etc.).
 * Allows managers to define custom service names, time windows, and step intervals.
 */
@Component({
  selector: 'app-restaurant-shifts-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslocoPipe,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    SearchableSelectComponent,
  ],
  templateUrl: './restaurant-shifts-modal.component.html',
  styleUrls: ['./restaurant-shifts-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantShiftsModalComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly shiftService = inject(RestaurantShiftService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastCtrl = inject(ToastController);

  @Input() isOpen = false;
  @Output() modalClose = new EventEmitter<void>();
  @Output() shiftsUpdated = new EventEmitter<RestaurantServiceShift[]>();

  shiftsList: RestaurantServiceShift[] = [];
  addShiftForm!: FormGroup;
  editingShiftId: string | null = null;
  editForm!: FormGroup;

  readonly stepOptions: SearchableOption<number>[] = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '60 min (1h)', value: 60 },
  ];

  constructor() {
    addIcons({
      closeOutline,
      addOutline,
      trashOutline,
      createOutline,
      timeOutline,
      refreshOutline,
      checkmarkOutline,
    });
  }

  ngOnInit(): void {
    this.initForms();
    this.loadShifts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.loadShifts();
      this.cancelEditing();
    }
  }

  initForms(): void {
    this.addShiftForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      startTime: ['16:00', [Validators.required]],
      endTime: ['19:00', [Validators.required]],
      stepMinutes: [30, [Validators.required]],
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]],
      stepMinutes: [30, [Validators.required]],
    });
  }

  loadShifts(): void {
    this.shiftsList = [...this.shiftService.getShifts()];
    this.cdr.markForCheck();
  }

  /**
   * Adds a new restaurant shift.
   */
  addNewShift(): void {
    if (this.addShiftForm.invalid) {
      this.addShiftForm.markAllAsTouched();
      return;
    }

    const val = this.addShiftForm.value;
    if (val.startTime >= val.endTime) {
      void this.showToast('L\'heure de début doit être antérieure à l\'heure de fin.', 'warning');
      return;
    }

    const created = this.shiftService.addShift({
      name: val.name.trim(),
      startTime: val.startTime,
      endTime: val.endTime,
      stepMinutes: Number(val.stepMinutes) || 30,
    });

    this.addShiftForm.reset({
      name: '',
      startTime: '16:00',
      endTime: '19:00',
      stepMinutes: 30,
    });

    this.loadShifts();
    this.shiftsUpdated.emit(this.shiftsList);
    void this.showToast(`Shift "${created.name}" ajouté avec succès.`, 'success');
  }

  startEditing(shift: RestaurantServiceShift): void {
    this.editingShiftId = shift.id;
    this.editForm.setValue({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      stepMinutes: shift.stepMinutes || 30,
    });
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.editingShiftId = null;
    this.cdr.markForCheck();
  }

  saveEdit(id: string): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const val = this.editForm.value;
    if (val.startTime >= val.endTime) {
      void this.showToast('L\'heure de début doit être antérieure à l\'heure de fin.', 'warning');
      return;
    }

    this.shiftService.updateShift(id, {
      name: val.name.trim(),
      startTime: val.startTime,
      endTime: val.endTime,
      stepMinutes: Number(val.stepMinutes) || 30,
    });

    this.editingShiftId = null;
    this.loadShifts();
    this.shiftsUpdated.emit(this.shiftsList);
    void this.showToast('Shift mis à jour avec succès.', 'success');
  }

  deleteShift(shift: RestaurantServiceShift): void {
    if (this.shiftsList.length <= 1) {
      void this.showToast('Vous devez conserver au moins un shift de service.', 'warning');
      return;
    }

    this.shiftService.deleteShift(shift.id);
    this.loadShifts();
    this.shiftsUpdated.emit(this.shiftsList);
    void this.showToast(`Shift "${shift.name}" supprimé.`, 'success');
  }

  resetDefaults(): void {
    this.shiftService.resetToDefaults();
    this.loadShifts();
    this.shiftsUpdated.emit(this.shiftsList);
    void this.showToast('Créneaux réinitialisés aux valeurs par défaut.', 'success');
  }

  close(): void {
    this.modalClose.emit();
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
