import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ModalController,
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
  closeOutline,
  add,
  close,
  createOutline,
  trashOutline,
  checkmarkCircle,
  locationOutline,
  layersOutline
} from 'ionicons/icons';
import { ZoneBar, ZoneService } from '../../../core/services/zone.service';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';

/**
 * Modal component for managing Zones and categorizing them by Floor level in OpenBar.
 */
@Component({
  selector: 'app-zone-manager',
  templateUrl: './zone-manager.component.html',
  styleUrls: ['./zone-manager.component.css'],
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
    ReactiveFormsModule
  ]
})
export class ZoneManagerComponent implements OnInit {
  zones: ZoneBar[] = [];
  isLoading = false;
  showAddForm = false;
  editingZoneId: number | null = null;
  zoneForm: FormGroup;

  readonly etagesList = [
    { value: 'RDC', label: 'Rez-de-chaussée (RDC)' },
    { value: 'ETAGE_1', label: '1er Étage' },
    { value: 'ETAGE_2', label: '2ème Étage' },
    { value: 'TERRASSE', label: 'Terrasse / Extérieur' },
    { value: 'SOUS_SOL', label: 'Sous-sol / Cave' }
  ];

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly toastCtrl: ToastController,
    private readonly zoneService: ZoneService,
    private readonly fb: FormBuilder
  ) {
    addIcons({
      closeOutline,
      add,
      close,
      createOutline,
      trashOutline,
      checkmarkCircle,
      locationOutline,
      layersOutline
    });

    this.zoneForm = this.fb.group({
      nom: ['', [Validators.required, Validators.maxLength(50)]],
      etage: ['RDC', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadZones();
  }

  loadZones(): void {
    this.isLoading = true;
    this.zoneService.getAll().subscribe({
      next: (res) => {
        this.zones = res;
        this.isLoading = false;
      },
      error: async () => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message: 'Erreur lors du chargement des zones',
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  getEtageLabel(code: string): string {
    const found = this.etagesList.find((e) => e.value === code);
    return found ? found.label : code;
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.editingZoneId = null;
    this.zoneForm.reset({ etage: 'RDC' });
  }

  onEdit(zone: ZoneBar): void {
    this.editingZoneId = zone.id ?? null;
    this.showAddForm = false;
    this.zoneForm.patchValue({
      nom: zone.nom,
      etage: zone.etage || 'RDC'
    });
  }

  resetForm(): void {
    this.showAddForm = false;
    this.editingZoneId = null;
    this.zoneForm.reset({ etage: 'RDC' });
  }

  onSave(): void {
    if (this.zoneForm.invalid) return;
    const payload = this.zoneForm.value;

    const obs$ =
      this.editingZoneId !== null
        ? this.zoneService.update(this.editingZoneId, payload)
        : this.zoneService.create(payload);

    obs$.subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({
          message: this.editingZoneId !== null ? 'Zone enregistrée' : 'Zone créée',
          duration: 3000,
          color: 'success'
        });
        toast.present();
        this.resetForm();
        this.loadZones();
      },
      error: async (err) => {
        const msg = err.error?.message || 'Erreur lors de la sauvegarde';
        const toast = await this.toastCtrl.create({
          message: msg,
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  onDelete(zone: ZoneBar): void {
    if (!zone.id) return;
    this.zoneService.delete(zone.id).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Zone supprimée',
          duration: 3000,
          color: 'success'
        });
        toast.present();
        this.loadZones();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Erreur lors de la suppression',
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  onClose(): void {
    this.modalCtrl.dismiss();
  }
}
