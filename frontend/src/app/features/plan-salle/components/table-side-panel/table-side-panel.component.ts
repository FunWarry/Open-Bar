import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, saveOutline, gitMergeOutline, trashOutline,
  refreshOutline, shapesOutline, resizeOutline, optionsOutline,
  colorPaletteOutline, layersOutline, addOutline, removeOutline,
  squareOutline, ellipseOutline, chevronDownOutline, chevronUpOutline,
  checkmarkOutline, restaurantOutline, peopleOutline, locationOutline,
  pencilOutline, checkmarkCircleOutline, qrCodeOutline
} from 'ionicons/icons';

import { TableBar } from '../../../../core/models/table.model';
import { TablePosition, ZoneArea, ZoneShapeType } from '../../models/table-position.model';
import { ZoneBar } from '../../../../core/services/zone.service';
import { EtageBar } from '../../../../core/services/etage.service';
import { ConfirmDeleteModalComponent } from '../../../../core/components/ui/confirm-delete-modal/confirm-delete-modal.component';
import { TableQrModalComponent } from '../../../tables/components/table-qr-modal/table-qr-modal.component';

import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

/**
 * Side panel component for inspecting and editing Table and Zone Area properties
 * with real-time live preview, independent 4-corner radii, and interactive polygon vertices.
 */
@Component({
  selector: 'app-table-side-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonIcon,
  ],
  templateUrl: './table-side-panel.component.html',
  styleUrls: ['./table-side-panel.component.scss'],
})
export class TableSidePanelComponent {
  @Input() table: TableBar | null = null;
  private _position: TablePosition | null = null;

  @Input()
  set position(pos: TablePosition | null) {
    this._position = pos;
    this.cdr.markForCheck();
  }

  get position(): TablePosition | null {
    return this._position;
  }

  @Input() isOpen = false;
  @Input() isEditMode = false;
  @Input() availableZones: ZoneBar[] = [];
  @Input() availableEtages: EtageBar[] = [];

  @Output() closePanel = new EventEmitter<void>();
  @Output() saveTable = new EventEmitter<{ table: Partial<TableBar>; position: Partial<TablePosition> }>();
  @Output() liveUpdateTable = new EventEmitter<{ table: Partial<TableBar>; position: Partial<TablePosition> }>();
  @Output() saveZoneArea = new EventEmitter<ZoneArea>();
  @Output() liveUpdateZone = new EventEmitter<ZoneArea>();
  @Output() startFusion = new EventEmitter<TableBar>();
  @Output() deleteTable = new EventEmitter<number>();
  @Output() deleteZoneArea = new EventEmitter<string>();

  isZoneDropdownOpen = false;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly modalCtrl = inject(ModalController);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    addIcons({
      'close-outline': closeOutline,
      'save-outline': saveOutline,
      'git-merge-outline': gitMergeOutline,
      'trash-outline': trashOutline,
      'refresh-outline': refreshOutline,
      'shapes-outline': shapesOutline,
      'resize-outline': resizeOutline,
      'options-outline': optionsOutline,
      'color-palette-outline': colorPaletteOutline,
      'layers-outline': layersOutline,
      'add-outline': addOutline,
      'remove-outline': removeOutline,
      'square-outline': squareOutline,
      'ellipse-outline': ellipseOutline,
      'chevron-down-outline': chevronDownOutline,
      'chevron-up-outline': chevronUpOutline,
      'checkmark-outline': checkmarkOutline,
      'restaurant-outline': restaurantOutline,
      'people-outline': peopleOutline,
      'location-outline': locationOutline,
      'pencil-outline': pencilOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'qr-code-outline': qrCodeOutline,
      closeOutline, saveOutline, gitMergeOutline, trashOutline,
      refreshOutline, shapesOutline, resizeOutline, optionsOutline,
      colorPaletteOutline, layersOutline, addOutline, removeOutline,
      squareOutline, ellipseOutline, chevronDownOutline, chevronUpOutline,
      checkmarkOutline, restaurantOutline, peopleOutline, locationOutline,
      pencilOutline, checkmarkCircleOutline, qrCodeOutline
    });
  }

  toggleZoneDropdown(event: Event) {
    event.stopPropagation();
    this.isZoneDropdownOpen = !this.isZoneDropdownOpen;
  }

  selectZoneOption(zoneNom: string) {
    if (this.table) {
      this.table.zone = zoneNom;
      this.onLiveTableChange();
    }
    this.isZoneDropdownOpen = false;
  }

  onClose() {
    this.closePanel.emit();
  }

  async onOpenQrModal() {
    if (!this.table) return;
    const modal = await this.modalCtrl.create({
      component: TableQrModalComponent,
      componentProps: { table: this.table },
      cssClass: 'table-qr-modal-dialog'
    });
    await modal.present();
  }

  onStartFusion() {
    if (this.table) {
      this.startFusion.emit(this.table);
    }
  }

  onChangeTableShape(shape: 'rect' | 'circle') {
    if (this.position) {
      this.position.shape = shape;
      this.onLiveTableChange();
    }
  }

  onToggleShape() {
    if (this.position) {
      this.position.shape = this.position.shape === 'rect' ? 'circle' : 'rect';
      this.onLiveTableChange();
    }
  }

  availableColors = [
    { label: 'Indigo', hex: '#6c7fe8' },
    { label: 'Vert', hex: '#2fbf6b' },
    { label: 'Orange', hex: '#f4a52a' },
    { label: 'Rouge', hex: '#e5604f' },
    { label: 'Violet', hex: '#9b8af2' },
  ];

  onChangeZoneShape(shape: ZoneShapeType) {
    if (this.selectedZoneArea) {
      this.selectedZoneArea.shapeType = shape;
      if (shape === 'polygon' && (!this.selectedZoneArea.points || this.selectedZoneArea.points.length < 6)) {
        const w = this.selectedZoneArea.width || 300;
        const h = this.selectedZoneArea.height || 200;
        this.selectedZoneArea.points = [
          0, 0,
          w, 0,
          w, h,
          0, h,
        ];
      }
      this.onLiveZoneChange();
    }
  }

  private _selectedZoneArea: ZoneArea | null = null;
  cornerRadii: [number, number, number, number] = [16, 16, 16, 16];
  polygonVertices: { x: number; y: number }[] = [];

  @Input()
  set selectedZoneArea(zone: ZoneArea | null) {
    this._selectedZoneArea = zone;
    if (zone) {
      zone.cornerRadii ??= [16, 16, 16, 16];
      this.cornerRadii = [...zone.cornerRadii] as [number, number, number, number];
      this.syncPolygonVertices();
    } else {
      this.polygonVertices = [];
    }
  }

  get selectedZoneArea(): ZoneArea | null {
    return this._selectedZoneArea;
  }

  syncPolygonVertices() {
    if (!this._selectedZoneArea?.points) {
      this.polygonVertices = [];
      return;
    }
    const pts = this._selectedZoneArea.points;
    const list: { x: number; y: number }[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      list.push({ x: pts[i], y: pts[i + 1] });
    }
    this.polygonVertices = list;
    this.cdr.markForCheck();
  }

  getVertexRadius(index: number): number {
    if (!this._selectedZoneArea) return 16;
    this._selectedZoneArea.cornerRadii ??= [16, 16, 16, 16];
    return this._selectedZoneArea.cornerRadii[index] ?? 16;
  }

  setVertexRadius(index: number, value: number) {
    if (this._selectedZoneArea) {
      this._selectedZoneArea.cornerRadii ??= [16, 16, 16, 16];
      const val = Math.max(0, Math.min(100, Number(value) || 0));
      this._selectedZoneArea.cornerRadii[index] = val;
      this.onLiveZoneChange();
    }
  }

  setCornerRadius(index: 0 | 1 | 2 | 3, value: number) {
    if (this._selectedZoneArea) {
      const val = Math.max(0, Math.min(100, Number(value) || 0));
      this.cornerRadii[index] = val;
      this._selectedZoneArea.cornerRadii = [...this.cornerRadii];
      this.onLiveZoneChange();
    }
  }

  addPolygonVertex() {
    if (this._selectedZoneArea) {
      if (!this._selectedZoneArea.points) {
        const w = this._selectedZoneArea.width || 300;
        const h = this._selectedZoneArea.height || 200;
        this._selectedZoneArea.points = [0, 0, w, 0, w, h, 0, h];
      }
      const pts = this._selectedZoneArea.points;
      const lastX = pts.at(-2) ?? 0;
      const lastY = pts.at(-1) ?? 0;
      pts.push(lastX + 40, lastY + 40);
      this.syncPolygonVertices();
      this.onLiveZoneChange();
    }
  }

  removePolygonVertex(index: number) {
    if (this._selectedZoneArea?.points && this._selectedZoneArea.points.length > 6) {
      this._selectedZoneArea.points.splice(index * 2, 2);
      this.syncPolygonVertices();
      this.onLiveZoneChange();
    }
  }

  updatePolygonVertex(index: number, x: number, y: number) {
    if (this._selectedZoneArea?.points && index * 2 + 1 < this._selectedZoneArea.points.length) {
      this._selectedZoneArea.points[index * 2] = Number(x) || 0;
      this._selectedZoneArea.points[index * 2 + 1] = Number(y) || 0;
      this.onLiveZoneChange();
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  onRotate90() {
    if (this.position) {
      this.position.rotation = (this.position.rotation + 90) % 360;
      this.onLiveTableChange();
    }
  }

  onLiveZoneChange() {
    if (this.selectedZoneArea) {
      this.liveUpdateZone.emit(this.selectedZoneArea);
    }
  }

  onLiveTableChange() {
    if (this.table && this.position) {
      this.liveUpdateTable.emit({
        table: {
          numero: this.table.numero,
          capacite: this.table.capacite,
          zone: this.table.zone,
        },
        position: {
          width: this.position.width,
          height: this.position.height,
          rotation: this.position.rotation,
          shape: this.position.shape,
          zone: this.table.zone,
        },
      });
    }
  }

  async onDeleteTable() {
    if (!this.table) return;

    const isOccupied = this.table.occupee;
    const modal = await this.modalCtrl.create({
      component: ConfirmDeleteModalComponent,
      cssClass: 'auto-height-modal confirm-delete-dialog',
      componentProps: {
        title: this.transloco.translate('TABLES.DELETE_CONFIRM_TITLE', { number: this.table.numero }),
        itemName: `Table #${this.table.numero}`,
        warningMessage: this.transloco.translate('TABLES.DELETE_CONFIRM_MSG', { number: this.table.numero }),
        metaTags: [
          { icon: 'restaurant-outline', text: `Table #${this.table.numero}` },
          { icon: 'location-outline', text: this.table.zone || '-' },
          { icon: 'people-outline', text: this.transloco.translate('TABLE_SIDE_PANEL.SEATS_FORMAT', { count: this.table.capacite }) },
          { text: isOccupied ? this.transloco.translate('TABLES.OCCUPIED') : this.transloco.translate('TABLES.FREE') }
        ],
        detailsSummary: [
          { label: this.transloco.translate('TABLES.NUMBER'), value: `#${this.table.numero}` },
          { label: this.transloco.translate('TABLES.ZONE'), value: this.table.zone || '-' },
          { label: this.transloco.translate('TABLES.CAPACITY'), value: this.transloco.translate('TABLE_SIDE_PANEL.SEATS_FORMAT', { count: this.table.capacite }) },
          { label: this.transloco.translate('TABLES.STATUS'), value: isOccupied ? this.transloco.translate('TABLES.OCCUPIED') : this.transloco.translate('TABLES.FREE') }
        ],
        cannotDeleteReason: isOccupied ? this.transloco.translate('TABLES.DELETE_ACTIVE_ORDERS_ERROR') : null,
        confirmBtnText: this.transloco.translate('TABLES.DELETE_BTN')
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.confirmed) {
      this.deleteTable.emit(this.table.id);
      this.onClose();
    }
  }

  async onDeleteZoneArea() {
    if (!this.selectedZoneArea) return;

    const modal = await this.modalCtrl.create({
      component: ConfirmDeleteModalComponent,
      cssClass: 'auto-height-modal confirm-delete-dialog',
      componentProps: {
        title: this.transloco.translate('TABLE_SIDE_PANEL.DELETE_ZONE_TITLE'),
        itemName: `Zone "${this.selectedZoneArea.nom}"`,
        warningMessage: this.transloco.translate('TABLE_SIDE_PANEL.DELETE_ZONE_WARNING'),
        metaTags: [
          { icon: 'layers-outline', text: this.selectedZoneArea.nom },
          { text: this.selectedZoneArea.shapeType === 'polygon' ? this.transloco.translate('TABLE_SIDE_PANEL.SHAPE_POLYGON') : this.transloco.translate('TABLE_SIDE_PANEL.SHAPE_RECT') }
        ],
        detailsSummary: [
          { label: this.transloco.translate('TABLE_SIDE_PANEL.ZONE_NAME_LABEL'), value: this.selectedZoneArea.nom },
          { label: this.transloco.translate('TABLES.FILTERS.FLOOR_LABEL'), value: this.selectedZoneArea.etage || 'RDC' }
        ],
        confirmBtnText: this.transloco.translate('TABLE_SIDE_PANEL.DELETE_ZONE_BTN')
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.confirmed) {
      this.deleteZoneArea.emit(this.selectedZoneArea.id);
      this.onClose();
    }
  }

  onSaveZoneArea() {
    if (this.selectedZoneArea) {
      this.saveZoneArea.emit(this.selectedZoneArea);
      this.onClose();
    }
  }

  onSave() {
    if (this.table && this.position) {
      this.saveTable.emit({
        table: {
          numero: this.table.numero,
          capacite: this.table.capacite,
          zone: this.table.zone,
        },
        position: {
          width: this.position.width,
          height: this.position.height,
          rotation: this.position.rotation,
          shape: this.position.shape,
          zone: this.table.zone,
        },
      });
      this.onClose();
    }
  }
}
