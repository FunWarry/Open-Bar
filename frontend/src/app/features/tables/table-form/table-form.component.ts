import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ToastController,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gridOutline,
  locationOutline,
  peopleOutline,
  checkmarkCircle,
  closeOutline,
  arrowBackOutline,
  warningOutline
} from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { TableService } from '../../../core/services/table.service';
import { ZoneService, ZoneBar } from '../../../core/services/zone.service';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';

/**
 * Form component for creating or editing a TableBar entity in OpenBar.
 *
 * The Zone field is populated dynamically by fetching all configured zones
 * from the API via {@link ZoneService}, replacing the previous hardcoded
 * chip list. A loading spinner is shown while zones are being fetched and
 * an informational message is displayed when no zones are configured yet.
 */
@Component({
  selector: 'app-table-form',
  templateUrl: './table-form.component.html',
  styleUrls: ['./table-form.component.css'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    InputFieldComponent,
    ReactiveFormsModule,
    TranslocoModule
  ]
})
export class TableFormComponent implements OnInit {
  /** Reactive form group for the table creation / edit form. */
  tableForm: FormGroup;

  /** Whether the form is in edit mode (true) or create mode (false). */
  isEditMode = false;

  /** The ID of the table being edited, or null in create mode. */
  tableId: number | null = null;

  /** List of zones fetched from the API. */
  zones: ZoneBar[] = [];

  /** True while zones are being loaded from the server. */
  zonesLoading = true;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastCtrl: ToastController,
    private readonly tableService: TableService,
    private readonly zoneService: ZoneService
  ) {
    addIcons({
      gridOutline,
      locationOutline,
      peopleOutline,
      checkmarkCircle,
      closeOutline,
      arrowBackOutline,
      warningOutline
    });

    this.tableForm = this.fb.group({
      numero: ['', [Validators.required, Validators.min(1)]],
      zone: ['', [Validators.required]],
      capacite: ['', [Validators.required, Validators.min(1)]]
    });
  }

  /** Loads zones from the API and pre-fills the form in edit mode. */
  ngOnInit(): void {
    this.loadZones();
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.tableId = +id;
      this.tableService.getById(this.tableId).subscribe({
        next: (table) =>
          this.tableForm.patchValue({
            numero: table.numero,
            zone: table.zone,
            capacite: table.capacite
          }),
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du chargement',
            duration: 3000,
            color: 'danger'
          });
          toast.present();
        }
      });
    }
  }

  /**
   * Fetches all configured zones from the API and populates the zone dropdown.
   * Resets {@link zonesLoading} once the request completes (success or error).
   */
  loadZones(): void {
    this.zonesLoading = true;
    this.zoneService.getAll().subscribe({
      next: (zones) => {
        this.zones = zones;
        this.zonesLoading = false;
      },
      error: () => {
        this.zones = [];
        this.zonesLoading = false;
      }
    });
  }

  /** Submits the form: calls create or update depending on the mode. */
  onSubmit(): void {
    if (this.tableForm.invalid) return;
    const payload = this.tableForm.value;
    const obs$ = this.isEditMode
      ? this.tableService.update(this.tableId!, payload)
      : this.tableService.create(payload);
    obs$.subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({
          message: this.isEditMode ? 'Table modifiée' : 'Table créée',
          duration: 3000,
          color: 'success'
        });
        toast.present();
        this.router.navigate(['/tables']);
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Erreur lors de la sauvegarde',
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  /** Navigates back to the tables list without saving. */
  onCancel(): void {
    this.router.navigate(['/tables']);
  }
}

