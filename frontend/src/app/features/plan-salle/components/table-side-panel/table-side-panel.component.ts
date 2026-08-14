import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonBadge } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, saveOutline, gitMergeOutline, trashOutline,
  refreshOutline, shapesOutline, resizeOutline, optionsOutline,
  colorPaletteOutline, layersOutline, addOutline, removeOutline,
  squareOutline, ellipseOutline, chevronDownOutline, chevronUpOutline,
  checkmarkOutline,
} from 'ionicons/icons';

import { TableBar } from '../../../../core/models/table.model';
import { TablePosition, ZoneArea, ZoneShapeType } from '../../models/table-position.model';
import { ZoneBar } from '../../../../core/services/zone.service';
import { EtageBar } from '../../../../core/services/etage.service';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';

import { TranslocoModule } from '@jsverse/transloco';

/**
 * Side panel component for inspecting and editing Table and Zone Area properties
 * with real-time live preview, independent 4-corner radii, and interactive polygon vertices.
 */
@Component({
  selector: 'app-table-side-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslocoModule,
    IonButton, IonIcon, IonBadge,
    ActionButtonComponent,
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

  constructor() {
    addIcons({
      closeOutline, saveOutline, gitMergeOutline, trashOutline,
      refreshOutline, shapesOutline, resizeOutline, optionsOutline,
      colorPaletteOutline, layersOutline, addOutline, removeOutline,
      squareOutline, ellipseOutline, chevronDownOutline, chevronUpOutline,
      checkmarkOutline,
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

  private readonly cdr = inject(ChangeDetectorRef);
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

  onDeleteTable() {
    if (this.table && confirm(`Voulez-vous vraiment supprimer la Table #${this.table.numero} ?`)) {
      this.deleteTable.emit(this.table.id);
      this.onClose();
    }
  }

  onDeleteZoneArea() {
    if (this.selectedZoneArea && confirm(`Voulez-vous supprimer la zone "${this.selectedZoneArea.nom}" ?`)) {
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
