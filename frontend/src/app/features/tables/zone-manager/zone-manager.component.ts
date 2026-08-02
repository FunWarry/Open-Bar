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
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel
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
  layersOutline,
  businessOutline
} from 'ionicons/icons';
import { ZoneBar, ZoneService } from '../../../core/services/zone.service';
import { EtageBar, EtageService } from '../../../core/services/etage.service';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';

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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    InputFieldComponent,
    ReactiveFormsModule,
    TranslocoPipe
  ]
})
export class ZoneManagerComponent implements OnInit {
  activeTab: 'zones' | 'etages' = 'zones';

  zones: ZoneBar[] = [];
  etages: EtageBar[] = [];
  isLoading = false;

  showAddForm = false;
  editingZoneId: number | null = null;
  zoneForm: FormGroup;

  showAddEtageForm = false;
  editingEtageId: number | null = null;
  etageForm: FormGroup;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly toastCtrl: ToastController,
    private readonly zoneService: ZoneService,
    private readonly etageService: EtageService,
    private readonly translocoService: TranslocoService,
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
      layersOutline,
      businessOutline
    });

    this.zoneForm = this.fb.group({
      nom: ['', [Validators.required, Validators.maxLength(50)]],
      etage: ['RDC', [Validators.required]]
    });

    this.etageForm = this.fb.group({
      nom: ['', [Validators.required, Validators.maxLength(100)]],
      code: ['', [Validators.required, Validators.maxLength(50)]],
      ordre: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    forkJoin({
      zones: this.zoneService.getAll(),
      etages: this.etageService.getAll()
    }).subscribe({
      next: (res) => {
        this.zones = res.zones;
        this.etages = res.etages;
        this.isLoading = false;
      },
      error: async () => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate('COMMON.ERROR'),
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  getEtageLabel(code: string): string {
    const found = this.etages.find((e) => e.code === code);
    return found ? found.nom : code;
  }

  onTabChange(event: CustomEvent): void {
    this.activeTab = event.detail.value as 'zones' | 'etages';
  }

  // --- Zone CRUD methods ---

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.editingZoneId = null;
    const defaultEtage = this.etages.length > 0 ? this.etages[0].code : 'RDC';
    this.zoneForm.reset({ etage: defaultEtage });
  }

  onEdit(zone: ZoneBar): void {
    this.editingZoneId = zone.id ?? null;
    this.showAddForm = false;
    this.zoneForm.patchValue({
      nom: zone.nom,
      etage: zone.etage || (this.etages.length > 0 ? this.etages[0].code : 'RDC')
    });
  }

  resetForm(): void {
    this.showAddForm = false;
    this.editingZoneId = null;
    const defaultEtage = this.etages.length > 0 ? this.etages[0].code : 'RDC';
    this.zoneForm.reset({ etage: defaultEtage });
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
        const key = this.editingZoneId !== null ? 'ZONE_MANAGER.ZONE_SAVED' : 'ZONE_MANAGER.ZONE_CREATED';
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate(key),
          duration: 3000,
          color: 'success'
        });
        toast.present();
        this.resetForm();
        this.loadData();
      },
      error: async (err) => {
        const msg = err.error?.message || this.translocoService.translate('COMMON.ERROR');
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
          message: this.translocoService.translate('ZONE_MANAGER.ZONE_DELETED'),
          duration: 3000,
          color: 'success'
        });
        toast.present();
        this.loadData();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate('COMMON.ERROR'),
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  // --- Etage CRUD methods ---

  toggleAddEtageForm(): void {
    this.showAddEtageForm = !this.showAddEtageForm;
    this.editingEtageId = null;
    this.etageForm.reset({ ordre: (this.etages.length + 1) });
  }

  onEditEtage(etage: EtageBar): void {
    this.editingEtageId = etage.id ?? null;
    this.showAddEtageForm = false;
    this.etageForm.patchValue({
      nom: etage.nom,
      code: etage.code,
      ordre: etage.ordre ?? 0
    });
  }

  resetEtageForm(): void {
    this.showAddEtageForm = false;
    this.editingEtageId = null;
    this.etageForm.reset({ ordre: 0 });
  }

  onSaveEtage(): void {
    if (this.etageForm.invalid) return;
    const payload = this.etageForm.value;

    const obs$ =
      this.editingEtageId !== null
        ? this.etageService.update(this.editingEtageId, payload)
        : this.etageService.create(payload);

    obs$.subscribe({
      next: async () => {
        const key = this.editingEtageId !== null ? 'ZONE_MANAGER.ETAGE_SAVED' : 'ZONE_MANAGER.ETAGE_CREATED';
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate(key),
          duration: 3000,
          color: 'success'
        });
        toast.present();
        this.resetEtageForm();
        this.loadData();
      },
      error: async (err) => {
        const msg = err.error?.message || this.translocoService.translate('COMMON.ERROR');
        const toast = await this.toastCtrl.create({
          message: msg,
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  onDeleteEtage(etage: EtageBar): void {
    if (!etage.id) return;
    this.etageService.delete(etage.id).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate('ZONE_MANAGER.ETAGE_DELETED'),
          duration: 3000,
          color: 'success'
        });
        toast.present();
        this.loadData();
      },
      error: async (err) => {
        const msg = err.error?.message || this.translocoService.translate('COMMON.ERROR');
        const toast = await this.toastCtrl.create({
          message: msg,
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
