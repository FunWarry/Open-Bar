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
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gridOutline,
  locationOutline,
  peopleOutline,
  checkmarkCircle,
  closeOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { TableService } from '../../../core/services/table.service';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';

/**
 * Form component for creating or editing a TableBar entity in OpenBar.
 * Supports custom dynamic Zone management for Managers and Admins.
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
    InputFieldComponent,
    ReactiveFormsModule
  ]
})
export class TableFormComponent implements OnInit {
  tableForm: FormGroup;
  isEditMode = false;
  tableId: number | null = null;
  existingZones: string[] = ['Terrasse', 'Salle', 'Bar', 'Étage', 'VIP'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastCtrl: ToastController,
    private readonly tableService: TableService
  ) {
    addIcons({
      gridOutline,
      locationOutline,
      peopleOutline,
      checkmarkCircle,
      closeOutline,
      arrowBackOutline
    });

    this.tableForm = this.fb.group({
      numero: ['', [Validators.required, Validators.min(1)]],
      zone: ['', [Validators.required]],
      capacite: ['', [Validators.required, Validators.min(1)]]
    });
  }

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

  loadZones(): void {
    this.tableService.getZones().subscribe({
      next: (zones) => {
        if (zones && zones.length > 0) {
          const combined = new Set([...this.existingZones, ...zones]);
          this.existingZones = Array.from(combined);
        }
      },
      error: () => {}
    });
  }

  selectZone(z: string): void {
    this.tableForm.patchValue({ zone: z });
    this.tableForm.get('zone')?.markAsTouched();
  }

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

  onCancel(): void {
    this.router.navigate(['/tables']);
  }
}
