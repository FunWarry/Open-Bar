import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import {
  ModalController,
  ToastController,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
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
  businessOutline,
  searchOutline,
  barcodeOutline,
  reorderTwoOutline,
  sparklesOutline,
  filterOutline
} from 'ionicons/icons';
import { ZoneBar, ZoneService } from '../../../core/services/zone.service';
import { EtageBar, EtageService } from '../../../core/services/etage.service';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';
import { ConfirmDeleteModalComponent } from '../../../core/components/ui/confirm-delete-modal/confirm-delete-modal.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';

/**
 * Modern modal component for managing Zones and categorizing them by Floor level in OpenBar.
 */
@Component({
  selector: 'app-zone-manager',
  templateUrl: './zone-manager.component.html',
  styleUrls: ['./zone-manager.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    InputFieldComponent,
    SearchableSelectComponent,
    TranslocoPipe
  ]
})
export class ZoneManagerComponent implements OnInit {
  activeTab: 'zones' | 'etages' = 'zones';

  zones: ZoneBar[] = [];
  etages: EtageBar[] = [];
  isLoading = false;

  searchQuery = '';
  selectedFloorFilter = 'ALL';

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
      businessOutline,
      searchOutline,
      barcodeOutline,
      reorderTwoOutline,
      sparklesOutline,
      filterOutline
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

  get etageOptions(): SearchableOption[] {
    return this.etages.map((e) => ({
      value: e.code,
      label: `${e.nom} (${e.code})`,
      icon: 'business-outline'
    }));
  }

  get filteredZones(): ZoneBar[] {
    return this.zones.filter((zone) => {
      const matchesSearch =
        !this.searchQuery.trim() ||
        zone.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        this.getEtageLabel(zone.etage).toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesFloor =
        this.selectedFloorFilter === 'ALL' || zone.etage === this.selectedFloorFilter;

      return matchesSearch && matchesFloor;
    });
  }

  get filteredEtages(): EtageBar[] {
    return this.etages
      .filter((etage) => {
        return (
          !this.searchQuery.trim() ||
          etage.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          etage.code.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  }

  getZonesForEtage(etageCode: string): ZoneBar[] {
    return this.zones.filter((z) => z.etage === etageCode);
  }

  getEtageLabel(code: string): string {
    const found = this.etages.find((e) => e.code === code);
    return found ? found.nom : code;
  }

  onTabChange(event: CustomEvent): void {
    this.activeTab = event.detail.value as 'zones' | 'etages';
    this.searchQuery = '';
  }

  setFloorFilter(floorCode: string): void {
    this.selectedFloorFilter = floorCode;
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
    this.showAddForm = true;
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

    const isEdit = this.editingZoneId !== null;

    obs$.subscribe({
      next: () => {
        const key = isEdit ? 'ZONE_MANAGER.ZONE_SAVED' : 'ZONE_MANAGER.ZONE_CREATED';
        this.resetForm();
        this.loadData();
        this.toastCtrl.create({
          message: this.translocoService.translate(key),
          duration: 3000,
          color: 'success'
        }).then((t) => t.present());
      },
      error: (err) => {
        const msg = err.error?.message || this.translocoService.translate('COMMON.ERROR');
        this.toastCtrl.create({
          message: msg,
          duration: 3000,
          color: 'danger'
        }).then((t) => t.present());
      }
    });
  }

  async onDelete(zone: ZoneBar): Promise<void> {
    if (!zone.id) return;

    const modal = await this.modalCtrl.create({
      component: ConfirmDeleteModalComponent,
      cssClass: 'auto-height-modal confirm-delete-dialog',
      componentProps: {
        title: this.translocoService.translate('ZONE_MANAGER.DELETE_ZONE_CONFIRM_TITLE'),
        itemName: zone.nom,
        warningMessage: this.translocoService.translate('ZONE_MANAGER.DELETE_ZONE_CONFIRM_MSG', { name: zone.nom }),
        metaTags: [
          { icon: 'location-outline', text: zone.nom },
          { icon: 'business-outline', text: this.getEtageLabel(zone.etage) }
        ],
        detailsSummary: [
          { label: this.translocoService.translate('ZONE_MANAGER.ZONE_NAME'), value: zone.nom },
          { label: this.translocoService.translate('ZONE_MANAGER.CATEGORY_ETAGE'), value: this.getEtageLabel(zone.etage) }
        ],
        confirmBtnText: this.translocoService.translate('ZONE_MANAGER.CONFIRM_DELETE_ZONE_BTN')
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.confirmed) {
      this.zoneService.delete(zone.id).subscribe({
        next: () => {
          this.toastCtrl.create({
            message: this.translocoService.translate('ZONE_MANAGER.ZONE_DELETED'),
            duration: 3000,
            color: 'success'
          }).then((t) => t.present());
          this.loadData();
        },
        error: () => {
          this.toastCtrl.create({
            message: this.translocoService.translate('COMMON.ERROR'),
            duration: 3000,
            color: 'danger'
          }).then((t) => t.present());
        }
      });
    }
  }

  // --- Etage CRUD methods ---

  toggleAddEtageForm(): void {
    this.showAddEtageForm = !this.showAddEtageForm;
    this.editingEtageId = null;
    this.etageForm.reset({ ordre: this.etages.length + 1 });
  }

  onEditEtage(etage: EtageBar): void {
    this.editingEtageId = etage.id ?? null;
    this.showAddEtageForm = true;
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

    const isEdit = this.editingEtageId !== null;

    obs$.subscribe({
      next: () => {
        const key = isEdit ? 'ZONE_MANAGER.ETAGE_SAVED' : 'ZONE_MANAGER.ETAGE_CREATED';
        this.resetEtageForm();
        this.loadData();
        this.toastCtrl.create({
          message: this.translocoService.translate(key),
          duration: 3000,
          color: 'success'
        }).then((t) => t.present());
      },
      error: (err) => {
        const msg = err.error?.message || this.translocoService.translate('COMMON.ERROR');
        this.toastCtrl.create({
          message: msg,
          duration: 3000,
          color: 'danger'
        }).then((t) => t.present());
      }
    });
  }

  async onDeleteEtage(etage: EtageBar): Promise<void> {
    if (!etage.id) return;

    const zonesCount = this.getZonesForEtage(etage.code).length;

    const modal = await this.modalCtrl.create({
      component: ConfirmDeleteModalComponent,
      cssClass: 'auto-height-modal confirm-delete-dialog',
      componentProps: {
        title: this.translocoService.translate('ZONE_MANAGER.DELETE_ETAGE_CONFIRM_TITLE'),
        itemName: etage.nom,
        warningMessage: this.translocoService.translate('ZONE_MANAGER.DELETE_ETAGE_CONFIRM_MSG', { name: etage.nom }),
        metaTags: [
          { icon: 'business-outline', text: etage.nom },
          { icon: 'barcode-outline', text: etage.code },
          { icon: 'location-outline', text: `${zonesCount} zone(s)` }
        ],
        detailsSummary: [
          { label: this.translocoService.translate('ZONE_MANAGER.ETAGE_NAME'), value: etage.nom },
          { label: this.translocoService.translate('ZONE_MANAGER.ETAGE_CODE'), value: etage.code },
          { label: this.translocoService.translate('ZONE_MANAGER.ETAGE_ORDER'), value: String(etage.ordre ?? 0) },
          { label: this.translocoService.translate('ZONE_MANAGER.ASSOCIATED_ZONES'), value: String(zonesCount) }
        ],
        confirmBtnText: this.translocoService.translate('ZONE_MANAGER.CONFIRM_DELETE_ETAGE_BTN')
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.confirmed) {
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
  }

  onClose(): void {
    this.modalCtrl.dismiss();
  }
}
