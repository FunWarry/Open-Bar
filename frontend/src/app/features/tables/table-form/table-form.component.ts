import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  ToastController,
  ModalController,
  IonIcon,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gridOutline,
  locationOutline,
  peopleOutline,
  checkmarkCircleOutline,
  closeOutline,
  arrowBackOutline,
  warningOutline,
  trashOutline,
  restaurantOutline,
  addCircleOutline,
  createOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';
import { TableService } from '../../../core/services/table.service';
import { ZoneService, ZoneBar } from '../../../core/services/zone.service';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';
import { TableBar } from '../../../core/models/table.model';
import { ConfirmDeleteModalComponent } from '../../../core/components/ui/confirm-delete-modal/confirm-delete-modal.component';

/**
 * Modal form component for creating or editing a TableBar entity in OpenBar.
 * Supports dynamic zone dropdown, validation, table deletion via unified confirmation modal,
 * and seamless dismiss results for real-time list updates.
 */
@Component({
  selector: 'app-table-form',
  templateUrl: './table-form.component.html',
  styleUrls: ['./table-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    IonSpinner,
    InputFieldComponent,
    SearchableSelectComponent,
    ReactiveFormsModule,
    TranslocoModule
  ]
})
export class TableFormComponent implements OnInit, OnDestroy {
  /** Optional table identifier passed via modal componentProps. */
  @Input() tableId: number | null = null;

  /** Optional preloaded table object passed via modal componentProps. */
  @Input() table: TableBar | null = null;

  /** Reactive form group for the table creation / edit form. */
  tableForm: FormGroup;

  /** Whether the form is in edit mode (true) or create mode (false). */
  isEditMode = false;

  /** List of zones fetched from the API. */
  zones: ZoneBar[] = [];

  /** Options for searchable select. */
  zoneOptions: SearchableOption[] = [];

  /** True while zones are being loaded from the server. */
  zonesLoading = true;

  /** True while saving or deleting. */
  isSubmitting = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
    private readonly transloco: TranslocoService,
    private readonly tableService: TableService,
    private readonly zoneService: ZoneService
  ) {
    addIcons({
      'grid-outline': gridOutline,
      'location-outline': locationOutline,
      'people-outline': peopleOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'close-outline': closeOutline,
      'arrow-back-outline': arrowBackOutline,
      'warning-outline': warningOutline,
      'trash-outline': trashOutline,
      'restaurant-outline': restaurantOutline,
      'add-circle-outline': addCircleOutline,
      'create-outline': createOutline,
      gridOutline,
      locationOutline,
      peopleOutline,
      checkmarkCircleOutline,
      closeOutline,
      arrowBackOutline,
      warningOutline,
      trashOutline,
      restaurantOutline,
      addCircleOutline,
      createOutline
    });

    this.tableForm = this.fb.group({
      numero: ['', [Validators.required, Validators.min(1)]],
      zone: ['', [Validators.required]],
      capacite: [4, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadZones();

    const idFromRoute = this.route?.snapshot?.params?.['id'];
    const targetId = this.tableId ?? (idFromRoute ? +idFromRoute : (this.table?.id ?? null));

    if (targetId) {
      this.isEditMode = true;
      this.tableId = targetId;

      if (this.table) {
        this.populateForm(this.table);
      } else {
        this.tableService.getById(targetId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (t) => {
              this.table = t;
              this.populateForm(t);
            },
            error: async () => {
              const toast = await this.toastCtrl.create({
                message: this.transloco.translate('ERRORS.SERVER'),
                duration: 3000,
                color: 'danger'
              });
              toast.present();
            }
          });
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private populateForm(table: TableBar): void {
    this.tableForm.patchValue({
      numero: table.numero,
      zone: table.zone,
      capacite: table.capacite
    });
  }

  /**
   * Fetches all configured zones from the API and populates the zone options.
   */
  loadZones(): void {
    this.zonesLoading = true;
    this.zoneService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (zones) => {
          this.zones = zones;
          this.zoneOptions = zones.map(z => ({
            value: z.nom,
            label: z.nom + (z.etage ? ` (${z.etage})` : '')
          }));
          this.zonesLoading = false;

          // If in create mode and zone is empty, set default if available
          if (!this.isEditMode && !this.tableForm.get('zone')?.value && zones.length > 0) {
            this.tableForm.patchValue({ zone: zones[0].nom });
          }
        },
        error: () => {
          this.zones = [];
          this.zoneOptions = [];
          this.zonesLoading = false;
        }
      });
  }

  onZoneSelected(opt: SearchableOption | null): void {
    this.tableForm.patchValue({ zone: opt ? opt.value : '' });
  }

  /** Submits the form: calls create or update depending on the mode. */
  onSubmit(): void {
    if (this.tableForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formValue = this.tableForm.value;
    const payload: Partial<TableBar> = {
      numero: Number(formValue.numero),
      zone: String(formValue.zone),
      capacite: Number(formValue.capacite)
    };

    const obs$ = this.isEditMode
      ? this.tableService.update(this.tableId!, payload)
      : this.tableService.create(payload);

    obs$
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: async (savedTable) => {
          const successMsg = this.isEditMode
            ? this.transloco.translate('TABLES.UPDATED_SUCCESS')
            : this.transloco.translate('TABLES.CREATED_SUCCESS');

          const toast = await this.toastCtrl.create({
            message: successMsg,
            duration: 2500,
            color: 'success'
          });
          toast.present();

          try {
            const topModal = await this.modalCtrl.getTop();
            if (topModal) {
              await this.modalCtrl.dismiss({ action: 'saved', table: savedTable });
              return;
            }
          } catch {
            // Fallback to route
          }
          this.router.navigate(['/tables']);
        },
        error: async (err) => {
          const errMsg = err?.error?.message || this.transloco.translate('TABLES.SAVE_ERROR');
          const toast = await this.toastCtrl.create({
            message: errMsg,
            duration: 3500,
            color: 'danger'
          });
          toast.present();
        }
      });
  }

  /** Deletes the table in edit mode via unified ConfirmDeleteModalComponent. */
  async onDelete(): Promise<void> {
    if (!this.isEditMode || !this.tableId) return;

    const tableNumber = this.tableForm.get('numero')?.value || this.table?.numero || this.tableId;
    const tableZone = this.tableForm.get('zone')?.value || this.table?.zone || '-';
    const tableCap = this.tableForm.get('capacite')?.value || this.table?.capacite || 4;

    const modal = await this.modalCtrl.create({
      component: ConfirmDeleteModalComponent,
      cssClass: 'confirm-delete-modal-dialog',
      componentProps: {
        title: this.transloco.translate('TABLES.DELETE_CONFIRM_TITLE', { number: tableNumber }),
        itemName: `Table ${tableNumber}`,
        warningMessage: this.transloco.translate('TABLES.DELETE_CONFIRM_MSG', { number: tableNumber }),
        metaTags: [
          { icon: 'restaurant-outline', text: `Table ${tableNumber}` },
          { icon: 'location-outline', text: tableZone },
          { icon: 'people-outline', text: `${tableCap} places` }
        ],
        detailsSummary: [
          { label: this.transloco.translate('TABLES.NUMBER'), value: `#${tableNumber}` },
          { label: this.transloco.translate('TABLES.ZONE'), value: tableZone },
          { label: this.transloco.translate('TABLES.CAPACITY'), value: `${tableCap} personnes` }
        ],
        confirmBtnText: this.transloco.translate('TABLES.DELETE_BTN')
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.confirmed) {
      this.executeDeletion(this.tableId);
    }
  }

  private executeDeletion(tableId: number): void {
    this.isSubmitting = true;
    this.tableService.delete(tableId)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('TABLES.DELETE_SUCCESS'),
            duration: 2500,
            color: 'success'
          });
          toast.present();

          try {
            const topModal = await this.modalCtrl.getTop();
            if (topModal) {
              await this.modalCtrl.dismiss({ action: 'deleted', tableId });
              return;
            }
          } catch {
            // Fallback
          }
          this.router.navigate(['/tables']);
        },
        error: async (err) => {
          const errMsg = err?.error?.message || this.transloco.translate('TABLES.DELETE_ERROR');
          const toast = await this.toastCtrl.create({
            message: errMsg,
            duration: 3500,
            color: 'danger'
          });
          toast.present();
        }
      });
  }

  /** Navigates back or dismisses the modal without saving. */
  async onCancel(): Promise<void> {
    try {
      const topModal = await this.modalCtrl.getTop();
      if (topModal) {
        await this.modalCtrl.dismiss();
        return;
      }
    } catch {
      // Fallback
    }
    this.router.navigate(['/tables']);
  }
}
