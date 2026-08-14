import {
  Component, OnInit, AfterViewInit, OnDestroy, HostListener,
  ElementRef, ViewChild, NgZone, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin, EMPTY, of } from 'rxjs';
import { takeUntil, switchMap, catchError, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import Konva from 'konva';
import {
  IonContent, IonHeader, IonToolbar, IonIcon,
  IonSpinner, ToastController, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  pencilOutline, saveOutline, closeOutline, refreshOutline, alertCircleOutline,
  addCircleOutline, refreshCircleOutline, shapesOutline, optionsOutline, trashOutline,
  layersOutline, gitMergeOutline, expandOutline, createOutline,
  addOutline, removeOutline, locateOutline, gridOutline, magnetOutline,
} from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';

import { TableService } from '../../core/services/table.service';
import { NotificationService } from '../../core/services/notification.service';
import { EtageService, EtageBar } from '../../core/services/etage.service';
import { ZoneService, ZoneBar } from '../../core/services/zone.service';
import { PlanSalleService } from './services/plan-salle.service';
import { selectIsAdmin } from '../../core/store/auth.selectors';
import { TableBar } from '../../core/models/table.model';
import { TablePosition, ZoneArea } from './models/table-position.model';
import { TableSidePanelComponent } from './components/table-side-panel/table-side-panel.component';
import { FusionModalComponent } from './components/fusion-modal/fusion-modal.component';
import { ZoneManagerComponent } from '../tables/zone-manager/zone-manager.component';

// 1px = 1cm Real-World Floor Scale System (0.01m)
const COLOR_LIBRE = '#2fbf6b';
const COLOR_OCCUPEE = '#e5604f';
const COLOR_PAYMENT = '#f4a52a';
const COLOR_RESERVEE = '#9b8af2';
const DEFAULT_TABLE_SIZE = 90; // 90cm x 90cm standard 4-seater bar table
const GAP = 60; // 60cm gap between tables
const MARGIN = 80; // 80cm margin from floor edge
const COLS = 5;
const MAGNET_SNAP_DISTANCE = 15; // 15cm magnet snap
const GRID_SNAP_SIZE = 50; // 50cm grid snap (0.5m grid tiles)

/**
 * Interactive Floor Plan Component powered by Konva.js canvas rendering.
 * Features:
 * - Single floor view (strict 1 floor level at a time)
 * - Independent 8-anchor non-uniform width & height resizing via Konva.Transformer
 * - Always-horizontal unrotated table text label (#N capacity)
 * - Magnetic snap alignment to 20px grid and adjacent tables
 * - Interactive visual Zone Area rectangle drawing on canvas
 * - Smooth 60FPS Konva rendering outside Angular zone
 */
@Component({
  selector: 'app-plan-salle',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    IonContent, IonHeader, IonToolbar, IonIcon,
    IonSpinner,
    TableSidePanelComponent,
  ],
  templateUrl: './plan-salle.component.html',
  styleUrls: ['./plan-salle.component.scss'],
})
export class PlanSalleComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('konvaContainer') containerRef!: ElementRef<HTMLDivElement>;

  /** All tables fetched from backend. */
  tables: TableBar[] = [];

  /** Currently filtered tables based on active floor and zone. */
  filteredTables: TableBar[] = [];

  /** All floor levels. */
  etages: EtageBar[] = [];

  /** All zones. */
  zones: ZoneBar[] = [];

  /** Filtered sub-zones for active floor. */
  floorZones: ZoneBar[] = [];

  /** Currently selected single floor code (e.g. 'RDC'). Floor plan strictly views 1 floor at a time. */
  selectedFloor = 'RDC';

  /** Currently selected zone filters (empty array = all zones on this floor). */
  selectedZones: string[] = [];

  /** Loading state flag. */
  isLoading = false;

  /** Admin edit mode active flag. */
  isEditMode = false;

  /** Admin role flag. */
  isAdmin = false;

  /** Unsaved position changes indicator. */
  hasUnsavedChanges = false;

  /** Selected table for side-panel inspection or editor handles. */
  selectedTable: TableBar | null = null;

  /** Side panel visibility. */
  isSidePanelOpen = false;

  /** Source table during merge mode. */
  fusionSourceTable: TableBar | null = null;

  /** Table merge mode flag. */
  isFusionMode = false;

  /** Interactive Zone Drawing Mode active flag. */
  isDrawingZone = false;

  /** Drawn zone areas per floor. */
  zoneAreas: ZoneArea[] = [];

  /** Grid Snapping active flag (50cm tiles). Default true. */
  isGridSnapEnabled = true;

  /** Magnetic Edge-to-Edge and Alignment Snapping active flag. Default true. */
  isMagnetSnapEnabled = true;

  private stage!: Konva.Stage;
  private layer!: Konva.Layer;
  private zoneLayer!: Konva.Layer;
  private transformer!: Konva.Transformer;
  private zoneTransformer?: Konva.Transformer;

  private readonly positions = new Map<number, TablePosition>();
  private readonly tableShapes = new Map<number, Konva.Group>();
  private readonly zoneShapes = new Map<string, Konva.Group>();
  private readonly destroy$ = new Subject<void>();
  private readonly charger$ = new Subject<void>();

  constructor(
    private readonly tableService: TableService,
    private readonly planSalleService: PlanSalleService,
    private readonly etageService: EtageService,
    private readonly zoneService: ZoneService,
    private readonly notifService: NotificationService,
    private readonly store: Store,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
  ) {
    addIcons({
      pencilOutline, saveOutline, closeOutline, refreshOutline, alertCircleOutline,
      addCircleOutline, refreshCircleOutline, shapesOutline, optionsOutline, trashOutline,
      layersOutline, gitMergeOutline, expandOutline, createOutline,
      addOutline, removeOutline, locateOutline, gridOutline, magnetOutline,
    });
  }

  ngOnInit() {
    this.chargerZonesLocales();

    this.store.select(selectIsAdmin)
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAdmin => {
        this.isAdmin = isAdmin;
        this.cdr.detectChanges();
      });

    this.notifService.onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        if (notif.type === 'table' || notif.type === 'commande') {
          this.charger();
        }
      });
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => this.initKonva());

    this.charger$
      .pipe(
        switchMap(() => forkJoin({
          tables: this.tableService.getAll(),
          positions: this.planSalleService.getPositions(),
          etages: this.etageService.getAll().pipe(catchError(() => EMPTY)),
          zones: this.zoneService.getAll().pipe(catchError(() => EMPTY)),
        }).pipe(
          catchError(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
            this.toastCtrl.create({ message: 'Erreur lors du chargement du plan', duration: 3000, color: 'danger' })
              .then(t => t.present());
            return EMPTY;
          }),
        )),
        takeUntil(this.destroy$),
      )
      .subscribe(({ tables, positions, etages, zones }) => {
        this.tables = tables;
        this.positions.clear();
        positions.forEach(p => {
          const rawForme = (p.shape as string) || '';
          const isCircle = rawForme.toUpperCase() === 'RONDE' || rawForme.toUpperCase() === 'CIRCLE' || rawForme.toUpperCase() === 'CIRCULAIRE' || rawForme.toUpperCase() === 'ROND';
          p.shape = isCircle ? 'circle' : 'rect';
          this.positions.set(p.tableId, p);
        });

        this.tables.forEach(t => {
          if (!this.positions.has(t.id)) {
            this.positions.set(t.id, this.positionDefaut(t));
          }
        });

        if (etages && etages.length > 0) {
          this.etages = etages;
          if (!this.etages.some(e => e.code === this.selectedFloor)) {
            this.selectedFloor = this.etages[0].code;
          }
        } else {
          this.etages = [
            { code: 'RDC', nom: 'Rez-de-chaussée' },
            { code: 'ETAGE_1', nom: '1er Étage' },
            { code: 'TERRASSE', nom: 'Terrasse' },
            { code: 'VIP', nom: 'VIP' },
          ];
        }

        if (zones) {
          this.zones = zones;
          this.synchroniserZonesAvecBackend();
        }

        this.hasUnsavedChanges = false;
        this.isLoading = false;
        this.updateFloorZones();
        this.applyFilters();
        this.cdr.detectChanges();
        this.ngZone.runOutsideAngular(() => {
          this.dessinerZones();
          this.dessinerTables();
        });
      });

    this.charger();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.charger$.complete();
    this.stage?.destroy();
  }

  @HostListener('window:resize')
  onResize() {
    if (!this.containerRef?.nativeElement || !this.stage) return;
    const el = this.containerRef.nativeElement;
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      this.stage.width(el.offsetWidth);
      this.stage.height(el.offsetHeight);
      this.layer?.batchDraw();
      this.zoneLayer?.batchDraw();
    }
  }

  /** Switches active floor view (strictly 1 floor at a time). */
  selectFloor(floorCode: string) {
    this.selectedFloor = floorCode;
    this.selectedZones = [];
    this.selectedTable = null;
    this.detachTransformer();
    this.updateFloorZones();
    this.applyFilters();
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => {
      this.dessinerZones();
      this.dessinerTables();
    });
  }

  /** Toggles a zone in the multi-select zone filter on current floor. */
  toggleZone(zoneNom: string) {
    const idx = this.selectedZones.indexOf(zoneNom);
    if (idx >= 0) {
      this.selectedZones.splice(idx, 1);
    } else {
      this.selectedZones.push(zoneNom);
    }
    this.selectedTable = null;
    this.detachTransformer();
    this.applyFilters();
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => {
      this.dessinerZones();
      this.dessinerTables();
    });
  }

  /** Clears all zone selection (shows All Zones). */
  clearZoneFilter() {
    this.selectedZones = [];
    this.selectedTable = null;
    this.detachTransformer();
    this.applyFilters();
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => {
      this.dessinerZones();
      this.dessinerTables();
    });
  }

  isZoneSelected(zoneNom: string): boolean {
    return this.selectedZones.includes(zoneNom);
  }

  private normalizeFloorCode(raw?: string): string {
    if (!raw) return 'RDC';
    const val = raw.trim().toUpperCase();
    if (val === 'RDC' || val.includes('REZ')) return 'RDC';
    if (val === 'ETAGE_1' || val.includes('1ER') || val.includes('1ÉTAGE') || val.includes('1ETAGE')) return 'ETAGE_1';
    if (val === 'ETAGE_2' || val.includes('2ÈME') || val.includes('2EME') || val.includes('ROOFTOP')) return 'ETAGE_2';
    return val;
  }

  private resolveTableFloor(t: TableBar, pos?: TablePosition): string {
    const zoneName = pos?.zone || t.zone;
    if (zoneName) {
      const z = this.zones.find(zItem => zItem.nom.toLowerCase() === zoneName.toLowerCase());
      if (z?.etage) return this.normalizeFloorCode(z.etage);
    }
    if (t.etage) return this.normalizeFloorCode(t.etage);
    if (pos?.floor) return this.normalizeFloorCode(pos.floor);
    return 'RDC';
  }

  private updateFloorZones() {
    const selected = this.normalizeFloorCode(this.selectedFloor);
    this.floorZones = this.zones.filter(z => this.normalizeFloorCode(z.etage) === selected);
  }

  private applyFilters() {
    const selected = this.normalizeFloorCode(this.selectedFloor);
    this.filteredTables = this.tables.filter(t => {
      const pos = this.positions.get(t.id);
      const tableFloor = this.resolveTableFloor(t, pos);
      const matchesFloor = tableFloor === selected;
      const tableZone = pos?.zone || t.zone;
      const matchesZone = this.selectedZones.length === 0 || (tableZone ? this.selectedZones.includes(tableZone) : false);
      return matchesFloor && matchesZone;
    });
  }

  // ─── Zoom & View Navigation Controls ─────────────────────────────────────

  zoomScale = 1;

  zoomerIn() {
    if (!this.stage) return;
    const center = {
      x: this.stage.width() / 2,
      y: this.stage.height() / 2,
    };
    this.appliquerZoom(1.2, center);
  }

  zoomerOut() {
    if (!this.stage) return;
    const center = {
      x: this.stage.width() / 2,
      y: this.stage.height() / 2,
    };
    this.appliquerZoom(1 / 1.2, center);
  }

  reinitialiserVue() {
    if (!this.stage) return;
    this.stage.position({ x: 0, y: 0 });
    this.stage.scale({ x: 1, y: 1 });
    this.stage.batchDraw();
    this.zoomScale = 1;
    this.syncGridPosition();
    this.cdr.detectChanges();
  }

  private appliquerZoom(factor: number, center: { x: number; y: number }) {
    const oldScale = this.stage.scaleX();
    const mousePointTo = {
      x: (center.x - this.stage.x()) / oldScale,
      y: (center.y - this.stage.y()) / oldScale,
    };

    const newScale = Math.max(0.3, Math.min(2.5, oldScale * factor));
    this.stage.scale({ x: newScale, y: newScale });
    const newPos = {
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    };
    this.stage.position(newPos);
    this.stage.batchDraw();
    this.syncGridPosition();

    this.zoomScale = Math.round(newScale * 100) / 100;
    this.cdr.detectChanges();
  }

  private syncGridPosition() {
    if (!this.stage || !this.containerRef?.nativeElement) return;
    const x = Math.round(this.stage.x() || 0);
    const y = Math.round(this.stage.y() || 0);
    const scale = this.stage.scaleX() || 1;
    const size = Math.max(1, Math.round(GRID_SNAP_SIZE * scale));
    const posX = Math.round(x % size);
    const posY = Math.round(y % size);
    const container = this.containerRef.nativeElement;
    container.style.backgroundSize = `${size}px ${size}px`;
    container.style.backgroundPosition = `${posX}px ${posY}px`;
  }

  /** Opens Modal for managing Floors & Zones. */
  async ouvrirGestionZonesEtages() {
    const modal = await this.modalCtrl.create({
      component: ZoneManagerComponent,
      cssClass: 'zone-manager-modal-class',
    });
    await modal.present();

    await modal.onWillDismiss();
    this.charger();
  }

  // ─── Konva Rendering & Interactive Controls Engine ──────────────────────────

  @HostListener('window:resize')
  onResizeWindow() {
    if (!this.stage || !this.containerRef?.nativeElement) return;
    const el = this.containerRef.nativeElement;
    const newW = Math.max(el.offsetWidth || 1920, window.innerWidth || 1920, 2560);
    const newH = Math.max(el.offsetHeight || 1080, window.innerHeight || 1080, 1600);
    this.stage.width(newW);
    this.stage.height(newH);
  }

  private initKonva() {
    const el = this.containerRef?.nativeElement;
    if (!el) return;
    const width = Math.max(el.offsetWidth || 1920, window.innerWidth || 1920, 2560);
    const height = Math.max(el.offsetHeight || 1080, window.innerHeight || 1080, 1600);

    this.stage = new Konva.Stage({
      container: el,
      width,
      height,
      draggable: true,
    });

    this.zoneLayer = new Konva.Layer();
    this.layer = new Konva.Layer();

    // Native Konva.Transformer with ALL 8 anchors enabled and non-uniform resizing (keepRatio: false)
    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      keepRatio: false,
      centeredScaling: false,
      enabledAnchors: [
        'top-left', 'top-center', 'top-right',
        'middle-right',
        'bottom-right', 'bottom-center', 'bottom-left',
        'middle-left'
      ],
      anchorSize: 10,
      borderStroke: '#6c7fe8',
      anchorFill: '#6c7fe8',
      anchorStroke: '#ffffff',
      anchorCornerRadius: 3,
      borderDash: [4, 4],
    });

    this.stage.add(this.zoneLayer, this.layer);

    // Mouse wheel zoom centered on cursor pointer (throttled outside Angular for smooth 60fps)
    let zoomTimer: any = null;

    this.stage.on('dragmove', () => this.syncGridPosition());

    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const scaleBy = 1.05;
      const oldScale = this.stage.scaleX();
      const pointer = this.stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - this.stage.x()) / oldScale,
        y: (pointer.y - this.stage.y()) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.3, Math.min(2.5, newScale));

      this.stage.scale({ x: clampedScale, y: clampedScale });
      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };
      this.stage.position(newPos);
      this.stage.batchDraw();
      this.syncGridPosition();

      if (!zoomTimer) {
        zoomTimer = setTimeout(() => {
          this.ngZone.run(() => {
            this.zoomScale = Math.round(clampedScale * 100) / 100;
            this.cdr.detectChanges();
          });
          zoomTimer = null;
        }, 80);
      }
    });
    this.layer.add(this.transformer);

    this.stage.on('click tap', (e) => {
      if (e.target === this.stage) {
        this.ngZone.run(() => {
          this.selectedTable = null;
          this.selectedZoneArea = null;
          this.detachTransformer();
          this.tableShapes.forEach(g => g.draggable(false));
          this.zoneShapes.forEach(g => g.draggable(false));
          this.isSidePanelOpen = false;
          this.cdr.detectChanges();
          this.ngZone.runOutsideAngular(() => this.dessinerZones());
        });
      }
    });
  }

  // ─── Visual Zone Areas Canvas Rendering ─────────────────────────────────────

  selectedZoneArea: ZoneArea | null = null;

  private zoneAreaToPayload(zone: ZoneArea): Partial<ZoneBar> {
    return {
      nom: zone.nom,
      etage: zone.etage,
      planX: Math.round(zone.x),
      planY: Math.round(zone.y),
      planWidth: Math.round(zone.width),
      planHeight: Math.round(zone.height),
      shapeType: zone.shapeType || 'rect',
      pointsJson: zone.points && zone.points.length > 0 ? JSON.stringify(zone.points) : undefined,
      cornerRadiiJson: zone.cornerRadii && zone.cornerRadii.length > 0 ? JSON.stringify(zone.cornerRadii) : undefined,
      couleur: zone.couleur,
    };
  }

  private synchroniserZonesAvecBackend() {
    this.chargerZonesLocales();
    if (!this.zones || this.zones.length === 0) return;

    this.zones.forEach((backendZone, idx) => {
      const existingArea = this.zoneAreas.find(za => za.nom.toLowerCase() === backendZone.nom.toLowerCase() || za.id === `za-${backendZone.id}`);
      const zoneEtageNormalized = this.normalizeFloorCode(backendZone.etage);

      let parsedPoints: number[] | undefined;
      if (backendZone.pointsJson) {
        try { parsedPoints = JSON.parse(backendZone.pointsJson); } catch {}
      }

      let parsedRadii: [number, number, number, number] | undefined;
      if (backendZone.cornerRadiiJson) {
        try { parsedRadii = JSON.parse(backendZone.cornerRadiiJson); } catch {}
      }

      if (!existingArea) {
        this.zoneAreas.push(this.createZoneAreaFromBackend(backendZone, idx, zoneEtageNormalized, parsedPoints, parsedRadii));
      } else {
        this.updateExistingZoneArea(existingArea, backendZone, zoneEtageNormalized, parsedPoints, parsedRadii);
      }
    });

    const backendNames = new Set(this.zones.map(z => z.nom.toLowerCase()));
    this.zoneAreas = this.zoneAreas.filter(za => backendNames.has(za.nom.toLowerCase()));
    this.sauvegarderZonesLocales();
  }

  private createZoneAreaFromBackend(
    backendZone: ZoneBar,
    idx: number,
    etage: string,
    points?: number[],
    radii?: [number, number, number, number]
  ): ZoneArea {
    return {
      id: `za-${backendZone.id}`,
      nom: backendZone.nom,
      etage,
      x: backendZone.planX ?? (140 + (idx % 3) * 380),
      y: backendZone.planY ?? (140 + Math.floor(idx / 3) * 280),
      width: backendZone.planWidth ?? 400,
      height: backendZone.planHeight ?? 280,
      shapeType: backendZone.shapeType ?? 'rect',
      points,
      cornerRadii: radii ?? [16, 16, 16, 16],
      couleur: backendZone.couleur ?? '#6c7fe8',
    };
  }

  private updateExistingZoneArea(
    existingArea: ZoneArea,
    backendZone: ZoneBar,
    etage: string,
    points?: number[],
    radii?: [number, number, number, number]
  ) {
    existingArea.etage = etage;
    if (backendZone.planX != null) existingArea.x = backendZone.planX;
    if (backendZone.planY != null) existingArea.y = backendZone.planY;
    if (backendZone.planWidth != null) existingArea.width = backendZone.planWidth;
    if (backendZone.planHeight != null) existingArea.height = backendZone.planHeight;
    if (backendZone.shapeType) existingArea.shapeType = backendZone.shapeType;
    existingArea.points = points;
    existingArea.cornerRadii = radii;
    if (backendZone.couleur) existingArea.couleur = backendZone.couleur;
  }

  private chargerZonesLocales() {
    try {
      const stored = localStorage.getItem('openbar_zone_areas');
      if (stored) {
        this.zoneAreas = JSON.parse(stored);
      } else {
        this.zoneAreas = [];
      }
    } catch {
      this.zoneAreas = [];
    }
  }

  private sauvegarderZonesLocales() {
    localStorage.setItem('openbar_zone_areas', JSON.stringify(this.zoneAreas));
  }

  /**
   * Generates SVG path data for a polygon with independent per-corner radius arcs.
   */
  buildPolygonPathData(points: number[], cornerRadii: number[] = []): string {
    const numPts = Math.floor(points.length / 2);
    if (numPts < 3) return '';

    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < numPts; i++) {
      pts.push({ x: points[i * 2], y: points[i * 2 + 1] });
    }

    let pathData = '';

    for (let i = 0; i < numPts; i++) {
      const prev = pts[(i - 1 + numPts) % numPts];
      const curr = pts[i];
      const next = pts[(i + 1) % numPts];

      const r = Math.max(0, cornerRadii[i] ?? 0);

      const dPrevX = prev.x - curr.x;
      const dPrevY = prev.y - curr.y;
      const lenPrev = Math.hypot(dPrevX, dPrevY) || 1;

      const dNextX = next.x - curr.x;
      const dNextY = next.y - curr.y;
      const lenNext = Math.hypot(dNextX, dNextY) || 1;

      const actualR = Math.min(r, lenPrev / 2, lenNext / 2);

      if (actualR <= 1) {
        if (i === 0) {
          pathData += `M ${curr.x} ${curr.y}`;
        } else {
          pathData += ` L ${curr.x} ${curr.y}`;
        }
      } else {
        const pStartX = curr.x + (dPrevX / lenPrev) * actualR;
        const pStartY = curr.y + (dPrevY / lenPrev) * actualR;

        const pEndX = curr.x + (dNextX / lenNext) * actualR;
        const pEndY = curr.y + (dNextY / lenNext) * actualR;

        if (i === 0) {
          pathData += `M ${pStartX} ${pStartY} Q ${curr.x} ${curr.y} ${pEndX} ${pEndY}`;
        } else {
          pathData += ` L ${pStartX} ${pStartY} Q ${curr.x} ${curr.y} ${pEndX} ${pEndY}`;
        }
      }
    }

    pathData += ' Z';
    return pathData;
  }

  /** Point-in-polygon ray casting algorithm. */
  private isPointInPolygon(px: number, py: number, points: number[]): boolean {
    let inside = false;
    const numPts = Math.floor(points.length / 2);
    for (let i = 0, j = numPts - 1; i < numPts; j = i++) {
      const xi = points[i * 2], yi = points[i * 2 + 1];
      const xj = points[j * 2], yj = points[j * 2 + 1];
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / ((yj - yi) || 1) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Checks if a point (x, y) is within the bounding box of a zone area, with an optional tolerance margin.
   */
  private isPointInZoneBounds(x: number, y: number, zone: ZoneArea, tolerance = 0): boolean {
    return (
      x >= zone.x - tolerance &&
      x <= zone.x + zone.width + tolerance &&
      y >= zone.y - tolerance &&
      y <= zone.y + zone.height + tolerance
    );
  }

  /**
   * Checks if a point (x, y) is strictly inside a zone shape (polygon or rectangle).
   */
  private isPointInZoneExact(x: number, y: number, zone: ZoneArea): boolean {
    if (zone.shapeType === 'polygon' && zone.points && zone.points.length >= 6) {
      return this.isPointInPolygon(x - zone.x, y - zone.y, zone.points);
    }
    return this.isPointInZoneBounds(x, y, zone);
  }

  /** Detects which zone (if any) contains or is closest/overlapping with the target point (x, y) on the active floor. */
  detectZoneAtPoint(x: number, y: number, floorCode: string): ZoneArea | null {
    const selectedFloorNorm = this.normalizeFloorCode(floorCode);
    const candidateZones = this.zoneAreas.filter(z => this.normalizeFloorCode(z.etage) === selectedFloorNorm);

    // 1. Exact geometric containment (polygon or rectangle)
    const exactMatch = candidateZones.find(zone => this.isPointInZoneExact(x, y, zone));
    if (exactMatch) return exactMatch;

    // 2. Bounding box containment (for polygons with cut-outs)
    const bboxMatch = candidateZones.find(zone => this.isPointInZoneBounds(x, y, zone));
    if (bboxMatch) return bboxMatch;

    // 3. Boundary tolerance margin (+35px around perimeter)
    return candidateZones.find(zone => this.isPointInZoneBounds(x, y, zone, 35)) || null;
  }

  // ─── Zone Group Canvas Rendering ───────────────────────────────────────────

  private dessinerZones() {
    if (!this.zoneLayer) return;

    if (this.zoneTransformer) {
      this.zoneTransformer.destroy();
      this.zoneTransformer = undefined;
    }

    this.zoneShapes.forEach(group => group.destroy());
    this.zoneShapes.clear();

    this.zoneAreas.forEach(zone => {
      if (this.normalizeFloorCode(zone.etage) !== this.normalizeFloorCode(this.selectedFloor)) return;
      if (this.selectedZones.length > 0 && !this.selectedZones.includes(zone.nom)) return;

      const isSelected = this.selectedZoneArea?.id === zone.id;
      const color = zone.couleur || '#6c7fe8';
      const zoneFill = `${color}18`;

      const group = new Konva.Group({
        x: zone.x,
        y: zone.y,
        draggable: this.isEditMode && isSelected,
        name: `zone-group-${zone.id}`,
      });

      const shapeNode = this.creerFormeZone(zone, color, zoneFill);
      const label = this.creerLabelZone(zone, color, isSelected);
      group.add(shapeNode, label);

      if (this.isEditMode && isSelected) {
        if ((zone.shapeType || 'rect') === 'rect') {
          this.ajouterPoigneesRectangle(group, shapeNode, zone, color);
        } else if (zone.shapeType === 'polygon' && zone.points) {
          this.ajouterPoigneesPolygone(group, shapeNode, zone, color);
        }
      }

      this.attacherEvenementsZone(group, zone);

      this.zoneShapes.set(zone.id, group);
      this.zoneLayer.add(group);
    });

    this.zoneLayer.batchDraw();
  }

  private creerFormeZone(zone: ZoneArea, color: string, zoneFill: string): Konva.Shape {
    if (zone.shapeType === 'polygon' && zone.points && zone.points.length >= 6) {
      const pathData = this.buildPolygonPathData(zone.points, zone.cornerRadii);
      return new Konva.Path({
        data: pathData,
        fill: zoneFill,
        stroke: color,
        strokeWidth: 1.5,
        dash: [6, 6],
        name: 'zone-shape',
      });
    }

    const radii = zone.cornerRadii || [16, 16, 16, 16];
    return new Konva.Rect({
      width: zone.width,
      height: zone.height,
      fill: zoneFill,
      stroke: color,
      strokeWidth: 1.5,
      dash: [6, 6],
      cornerRadius: radii,
      name: 'zone-shape',
    });
  }

  private creerLabelZone(zone: ZoneArea, color: string, isSelected: boolean): Konva.Text {
    let defaultX = 14;
    let defaultY = 12;

    if (zone.shapeType === 'polygon' && zone.points && zone.points.length >= 2) {
      let minX = Infinity;
      let minY = Infinity;
      for (let i = 0; i < zone.points.length; i += 2) {
        if (zone.points[i] < minX) minX = zone.points[i];
        if (zone.points[i + 1] < minY) minY = zone.points[i + 1];
      }
      defaultX = minX + 14;
      defaultY = minY + 12;
    }

    const posX = zone.labelX ?? defaultX;
    const posY = zone.labelY ?? defaultY;

    const label = new Konva.Text({
      text: `📍 ${zone.nom.toUpperCase()}`,
      fontSize: 12,
      fontStyle: 'bold',
      fill: color,
      x: posX,
      y: posY,
      draggable: this.isEditMode && isSelected,
      name: 'zone-label',
    });

    if (this.isEditMode && isSelected) {
      label.on('mouseenter', () => {
        if (this.stage) this.stage.container().style.cursor = 'move';
      });

      label.on('mouseleave', () => {
        if (this.stage) this.stage.container().style.cursor = 'default';
      });

      label.on('dragmove', (e) => {
        if (e) e.cancelBubble = true;
        zone.labelX = Math.round(label.x());
        zone.labelY = Math.round(label.y());
        this.zoneLayer?.batchDraw();
      });

      label.on('dragend', (e) => {
        if (e) e.cancelBubble = true;
        this.sauvegarderZonesLocales();
        this.ngZone.run(() => {
          this.hasUnsavedChanges = true;
          this.cdr.detectChanges();
        });
      });
    }

    return label;
  }

  private attacherEvenementsZone(group: Konva.Group, zone: ZoneArea) {
    group.on('mouseenter', () => {
      if (this.stage && this.isEditMode && this.selectedZoneArea?.id === zone.id) {
        this.stage.draggable(false);
      }
    });

    group.on('mouseleave', () => {
      if (this.stage) this.stage.draggable(true);
    });

    group.on('click tap', (e) => {
      if (e) e.cancelBubble = true;
      if (this.isEditMode) {
        this.ngZone.run(() => {
          this.selectedZoneArea = {
            ...zone,
            points: zone.points ? [...zone.points] : undefined,
            cornerRadii: zone.cornerRadii ? [...zone.cornerRadii] : undefined,
          };
          this.selectedTable = null;
          this.detachTransformer();
          this.tableShapes.forEach(t => t.draggable(false));
          this.zoneShapes.forEach((zGroup, id) => {
            zGroup.draggable(id === zone.id);
          });
          this.isSidePanelOpen = true;
          this.cdr.detectChanges();
          this.ngZone.runOutsideAngular(() => this.dessinerZones());
        });
      }
    });

    group.on('dblclick dbltap', (e) => {
      if (e) e.cancelBubble = true;
    });

    group.on('dragend', () => {
      if (!this.isEditMode) return;
      zone.x = Math.round(group.x());
      zone.y = Math.round(group.y());
      this.sauvegarderZonesLocales();
      this.ngZone.run(() => {
        this.hasUnsavedChanges = true;
        if (this.selectedZoneArea?.id === zone.id) {
          this.selectedZoneArea = {
            ...zone,
            points: zone.points ? [...zone.points] : undefined,
            cornerRadii: zone.cornerRadii ? [...zone.cornerRadii] : undefined,
          };
        }
        this.cdr.detectChanges();
      });
    });
  }

  private ajouterPoigneesRectangle(group: Konva.Group, shapeNode: Konva.Shape, zone: ZoneArea, color: string) {
    const radii = zone.cornerRadii || [16, 16, 16, 16];
    const cornerPositions = [
      { index: 0, getPos: () => ({ x: radii[0], y: 0 }) },
      { index: 1, getPos: () => ({ x: zone.width - radii[1], y: 0 }) },
      { index: 2, getPos: () => ({ x: zone.width, y: zone.height - radii[2] }) },
      { index: 3, getPos: () => ({ x: 0, y: zone.height - radii[3] }) },
    ];

    cornerPositions.forEach(({ index, getPos }) => {
      const initPos = getPos();
      const radiusHandle = new Konva.Circle({
        x: initPos.x,
        y: initPos.y,
        radius: 5,
        fill: '#f4a52a',
        stroke: '#ffffff',
        strokeWidth: 2,
        draggable: true,
        name: `corner-handle-${index}`,
        dragBoundFunc: (pos) => {
          const transform = group.getAbsoluteTransform().copy().invert();
          const local = transform.point(pos);
          const maxR = Math.min(zone.width, zone.height) / 2;

          let constrainedLocal = { x: 0, y: 0 };
          if (index === 0) {
            constrainedLocal = { x: Math.max(0, Math.min(maxR, local.x)), y: 0 };
          } else if (index === 1) {
            constrainedLocal = { x: Math.max(zone.width - maxR, Math.min(zone.width, local.x)), y: 0 };
          } else if (index === 2) {
            constrainedLocal = { x: zone.width, y: Math.max(zone.height - maxR, Math.min(zone.height, local.y)) };
          } else if (index === 3) {
            constrainedLocal = { x: 0, y: Math.max(zone.height - maxR, Math.min(zone.height, local.y)) };
          }

          return group.getAbsoluteTransform().point(constrainedLocal);
        },
      });

      radiusHandle.on('dragmove', () => {
        let newR = 16;
        if (index === 0) {
          newR = Math.round(radiusHandle.x());
        } else if (index === 1) {
          newR = Math.round(zone.width - radiusHandle.x());
        } else if (index === 2) {
          newR = Math.round(zone.height - radiusHandle.y());
        } else if (index === 3) {
          newR = Math.round(zone.height - radiusHandle.y());
        }

        zone.cornerRadii ??= [16, 16, 16, 16];
        zone.cornerRadii[index] = Math.max(0, newR);
        (shapeNode as Konva.Rect).cornerRadius(zone.cornerRadii);
        this.zoneLayer?.batchDraw();
        this.ngZone.run(() => {
          if (this.selectedZoneArea?.id === zone.id) {
            this.selectedZoneArea = {
              ...zone,
              cornerRadii: [...zone.cornerRadii!],
            };
          }
          this.cdr.detectChanges();
        });
      });

      radiusHandle.on('dragend', () => {
        this.sauvegarderZonesLocales();
        this.ngZone.run(() => {
          this.hasUnsavedChanges = true;
          if (this.selectedZoneArea?.id === zone.id) {
            this.selectedZoneArea = {
              ...zone,
              cornerRadii: [...zone.cornerRadii!],
            };
          }
          this.cdr.detectChanges();
        });
      });

      group.add(radiusHandle);
    });

    // Add Konva.Transformer box for rectangular zone shape & dimension resizing (attached directly to shapeNode)
    if (this.zoneLayer) {
      this.zoneTransformer = new Konva.Transformer({
        nodes: [shapeNode],
        rotateEnabled: false,
        keepRatio: false,
        borderStroke: color,
        borderDash: [4, 4],
        anchorFill: '#ffffff',
        anchorStroke: color,
        anchorSize: 8,
        boundBoxFunc: (oldBox, newBox) => {
          if (newBox.width < 100 || newBox.height < 80) return oldBox;
          return newBox;
        },
      });

      shapeNode.on('transform', () => {
        const rectNode = shapeNode as Konva.Rect;
        const scaleX = rectNode.scaleX();
        const scaleY = rectNode.scaleY();
        const offsetX = rectNode.x();
        const offsetY = rectNode.y();

        if (offsetX !== 0 || offsetY !== 0) {
          group.x(group.x() + offsetX);
          group.y(group.y() + offsetY);
          zone.x = Math.max(MARGIN, Math.round(group.x()));
          zone.y = Math.max(MARGIN, Math.round(group.y()));
          rectNode.x(0);
          rectNode.y(0);
        }

        rectNode.scaleX(1);
        rectNode.scaleY(1);

        const newW = Math.max(100, Math.round(rectNode.width() * scaleX));
        const newH = Math.max(80, Math.round(rectNode.height() * scaleY));
        zone.width = newW;
        zone.height = newH;
        rectNode.width(newW);
        rectNode.height(newH);

        this.repositionnerPoigneesArrondi(group, zone);
        this.zoneLayer?.batchDraw();
        this.ngZone.run(() => {
          if (this.selectedZoneArea?.id === zone.id) {
            this.selectedZoneArea = { ...zone };
          }
          this.cdr.detectChanges();
        });
      });

      shapeNode.on('transformend', () => {
        this.sauvegarderZonesLocales();
        this.ngZone.run(() => {
          this.hasUnsavedChanges = true;
          if (this.selectedZoneArea?.id === zone.id) {
            this.selectedZoneArea = { ...zone };
          }
          this.cdr.detectChanges();
        });
      });

      this.zoneLayer.add(this.zoneTransformer);
    }
  }

  private repositionnerPoigneesArrondi(group: Konva.Group, zone: ZoneArea) {
    const radii = zone.cornerRadii || [16, 16, 16, 16];
    const maxR = Math.min(zone.width, zone.height) / 2;
    const positions = [
      { index: 0, x: Math.min(radii[0], maxR), y: 0 },
      { index: 1, x: zone.width - Math.min(radii[1], maxR), y: 0 },
      { index: 2, x: zone.width, y: zone.height - Math.min(radii[2], maxR) },
      { index: 3, x: 0, y: zone.height - Math.min(radii[3], maxR) },
    ];

    positions.forEach(({ index, x, y }) => {
      const handle = group.findOne(`.corner-handle-${index}`) as Konva.Circle;
      if (handle) {
        handle.x(x);
        handle.y(y);
      }
    });
  }

  private ajouterPoigneesPolygone(group: Konva.Group, shapeNode: Konva.Shape, zone: ZoneArea, color: string) {
    if (!zone.points) return;
    const numPoints = zone.points.length / 2;
    for (let i = 0; i < numPoints; i++) {
      const ptIdx = i;
      const px = zone.points[ptIdx * 2];
      const py = zone.points[ptIdx * 2 + 1];

      const nextIdx = (ptIdx + 1) % numPoints;
      const nx = zone.points[nextIdx * 2];
      const ny = zone.points[nextIdx * 2 + 1];

      const edgeDx = nx - px;
      const edgeDy = ny - py;
      const edgeLen = Math.hypot(edgeDx, edgeDy) || 1;
      const ux = edgeDx / edgeLen;
      const uy = edgeDy / edgeLen;

      const radii = zone.cornerRadii || [16, 16, 16, 16];
      const currentR = Math.min(radii[ptIdx] ?? 16, edgeLen / 2);

      const handleX = px + ux * currentR;
      const handleY = py + uy * currentR;

      const handle = new Konva.Circle({
        x: px,
        y: py,
        radius: 6,
        fill: color,
        stroke: '#ffffff',
        strokeWidth: 2,
        draggable: true,
        name: `vertex-handle-${ptIdx}`,
        dragBoundFunc: (pos) => {
          const transform = group.getAbsoluteTransform().copy().invert();
          const local = transform.point(pos);
          const clampedX = Math.max(-200, Math.min(1600, local.x));
          const clampedY = Math.max(-200, Math.min(1400, local.y));
          return group.getAbsoluteTransform().point({ x: clampedX, y: clampedY });
        },
      });

      handle.on('dragmove', () => {
        zone.points![ptIdx * 2] = Math.round(handle.x());
        zone.points![ptIdx * 2 + 1] = Math.round(handle.y());
        if (shapeNode instanceof Konva.Path) {
          shapeNode.data(this.buildPolygonPathData(zone.points!, zone.cornerRadii));
        }
        const zoneLabelNode = group.findOne('.zone-label') as Konva.Text;
        if (zoneLabelNode && zone.points) {
          let mX = Infinity;
          let mY = Infinity;
          for (let j = 0; j < zone.points.length; j += 2) {
            if (zone.points[j] < mX) mX = zone.points[j];
            if (zone.points[j + 1] < mY) mY = zone.points[j + 1];
          }
          zoneLabelNode.x(mX + 14);
          zoneLabelNode.y(mY + 12);
        }
        this.zoneLayer?.batchDraw();
        this.ngZone.run(() => {
          if (this.selectedZoneArea?.id === zone.id) {
            this.selectedZoneArea = {
              ...zone,
              points: [...zone.points!],
            };
          }
          this.cdr.detectChanges();
        });
      });

      handle.on('dragend', () => {
        this.sauvegarderZonesLocales();
        this.ngZone.run(() => {
          this.hasUnsavedChanges = true;
          if (this.selectedZoneArea?.id === zone.id) {
            this.selectedZoneArea = {
              ...zone,
              points: [...zone.points!],
            };
          }
          this.cdr.detectChanges();
          this.ngZone.runOutsideAngular(() => this.dessinerZones());
        });
      });

      const polyRadiusHandle = new Konva.Circle({
        x: handleX,
        y: handleY,
        radius: 5,
        fill: '#f4a52a',
        stroke: '#ffffff',
        strokeWidth: 2,
        draggable: true,
        name: `poly-radius-handle-${ptIdx}`,
        dragBoundFunc: (pos) => {
          const transform = group.getAbsoluteTransform().copy().invert();
          const local = transform.point(pos);
          const vX = local.x - px;
          const vY = local.y - py;
          const proj = Math.max(0, Math.min(edgeLen / 2, vX * ux + vY * uy));
          const constrainedLocal = {
            x: px + ux * proj,
            y: py + uy * proj,
          };
          return group.getAbsoluteTransform().point(constrainedLocal);
        },
      });

      polyRadiusHandle.on('dragmove', () => {
        const dx = polyRadiusHandle.x() - px;
        const dy = polyRadiusHandle.y() - py;
        const dist = Math.round(Math.hypot(dx, dy));
        zone.cornerRadii ??= [16, 16, 16, 16];
        zone.cornerRadii[ptIdx] = Math.max(0, dist);
        if (shapeNode instanceof Konva.Path) {
          shapeNode.data(this.buildPolygonPathData(zone.points!, zone.cornerRadii));
        }
        this.zoneLayer?.batchDraw();
        this.ngZone.run(() => {
          if (this.selectedZoneArea?.id === zone.id) {
            this.selectedZoneArea = {
              ...zone,
              cornerRadii: [...zone.cornerRadii!],
            };
          }
          this.cdr.detectChanges();
        });
      });

      polyRadiusHandle.on('dragend', () => {
        this.sauvegarderZonesLocales();
        this.ngZone.run(() => {
          this.hasUnsavedChanges = true;
          if (this.selectedZoneArea?.id === zone.id) {
            this.selectedZoneArea = {
              ...zone,
              cornerRadii: [...zone.cornerRadii!],
            };
          }
          this.cdr.detectChanges();
        });
      });

      group.add(handle, polyRadiusHandle);
    }
  }

  /** Triggers new Zone creation by opening ZoneManagerComponent modal. */
  async creerNouvelleZoneSurPlan() {
    await this.ouvrirGestionZonesEtages();
  }

  // ─── Table Group Canvas Rendering ──────────────────────────────────────────

  private dessinerTables() {
    if (!this.layer) return;
    this.detachTransformer();

    this.tableShapes.forEach(group => group.destroy());
    this.tableShapes.clear();

    this.filteredTables.forEach((table, idx) => {
      const pos = this.positions.get(table.id) ?? this.positionDefaut(idx, table.id);
      const group = this.creerGroupeTable(table, pos);
      this.tableShapes.set(table.id, group);
      this.layer.add(group);

      if (this.selectedTable?.id === table.id && this.isEditMode) {
        this.attachTransformer(group);
      }
    });

    this.layer.batchDraw();
  }

  private couleurTableInfo(table: TableBar): { mainColor: string; fillColor: string } {
    if (table.reservee) {
      return { mainColor: '#9b8af2', fillColor: 'rgba(155, 138, 242, 0.16)' };
    }
    if (!table.occupee) {
      return { mainColor: '#2fbf6b', fillColor: 'rgba(47, 191, 107, 0.16)' };
    }
    // Occupied table status (Orange matching Figma T2, T5, T8)
    return { mainColor: '#f0a33b', fillColor: 'rgba(240, 163, 59, 0.16)' };
  }

  private creerGroupeTable(table: TableBar, pos: TablePosition): Konva.Group {
    const W = pos.width || DEFAULT_TABLE_SIZE;
    const H = pos.height || DEFAULT_TABLE_SIZE;

    const posX = Math.max(MARGIN, pos.x || 120);
    const posY = Math.max(MARGIN, pos.y || 120);

    const isTableSelected = this.selectedTable?.id === table.id;

    const group = new Konva.Group({
      x: posX,
      y: posY,
      rotation: pos.rotation || 0,
      draggable: this.isEditMode && isTableSelected,
      name: 'table-group',
    });

    const colors = this.couleurTableInfo(table);

    // Table main geometric shape (Figma DS: dark semi-transparent tint with vibrant status border; supports rectangles, circles and ovals)
    const forme = pos.shape === 'circle'
      ? new Konva.Ellipse({ radiusX: W / 2, radiusY: H / 2, fill: colors.fillColor, stroke: colors.mainColor, strokeWidth: 2, name: 'forme' })
      : new Konva.Rect({ width: W, height: H, offsetX: W / 2, offsetY: H / 2, fill: colors.fillColor, stroke: colors.mainColor, strokeWidth: 2, cornerRadius: 16, name: 'forme' });

    const numDisplay = table.numero ? `T${table.numero}` : `T${table.id}`;
    const capDisplay = table.capacite ? `${table.capacite} pers` : '';

    // ALWAYS-HORIZONTAL TEXT LABEL GROUP (Counter-rotated against group.rotation so text remains 0° horizontal!)
    const labelGroup = new Konva.Group({
      x: 0,
      y: 0,
      rotation: -(pos.rotation || 0),
      name: 'label-group',
      listening: false,
    });

    const titleText = new Konva.Text({
      text: numDisplay,
      fontSize: 16,
      fontStyle: 'bold',
      fill: colors.mainColor,
      align: 'center',
      width: W,
      x: -W / 2,
      y: capDisplay ? -14 : -8,
      name: 'label-title',
      listening: false,
    });
    labelGroup.add(titleText);

    if (capDisplay) {
      const subText = new Konva.Text({
        text: capDisplay,
        fontSize: 11,
        fontStyle: 'normal',
        fill: '#a4add0',
        align: 'center',
        width: W,
        x: -W / 2,
        y: 6,
        name: 'label-sub',
        listening: false,
      });
      labelGroup.add(subText);
    }

    group.add(forme, labelGroup);

    group.on('mouseenter', () => {
      if (this.stage && this.isEditMode && this.selectedTable?.id === table.id) {
        this.stage.draggable(false);
      }
    });

    group.on('mouseleave', () => {
      if (this.stage) this.stage.draggable(true);
    });

    group.on('click tap', (e) => {
      if (e) e.cancelBubble = true;
      if (!this.isEditMode) return;
      this.ngZone.run(() => this.onClickTable(table, group));
    });

    let startW = pos.width || DEFAULT_TABLE_SIZE;
    let startH = pos.height || DEFAULT_TABLE_SIZE;

    group.on('transformstart', () => {
      if (!this.isEditMode) return;
      const stored = this.positions.get(table.id);
      startW = stored?.width || pos.width || DEFAULT_TABLE_SIZE;
      startH = stored?.height || pos.height || DEFAULT_TABLE_SIZE;
    });

    group.on('dragmove', () => {
      if (!this.isEditMode) return;
      this.snapToGridAndTables(group, table.id);
      pos.x = Math.round(group.x());
      pos.y = Math.round(group.y());
      this.ngZone.run(() => {
        this.hasUnsavedChanges = true;
        this.cdr.detectChanges();
      });
    });

    group.on('dragend', () => {
      if (!this.isEditMode) return;
      const dropX = group.x();
      const dropY = group.y();

      const detectedZone = this.detectZoneAtPoint(dropX, dropY, this.selectedFloor);
      let newZoneName = pos.zone || table.zone;
      if (detectedZone && detectedZone.nom.trim().toLowerCase() !== (table.zone || '').trim().toLowerCase()) {
        newZoneName = detectedZone.nom;
        table.zone = detectedZone.nom;
        pos.zone = detectedZone.nom;
        const targetTableId = table.id;
        this.ngZone.run(() => {
          if (this.selectedTable?.id === targetTableId) {
            this.selectedTable = { ...this.selectedTable, zone: detectedZone.nom };
          }
          this.toastCtrl.create({
            message: `Table #${table.numero} réaffectée à la zone "${detectedZone.nom}"`,
            duration: 2500,
            color: 'info',
          }).then(t => t.present());
        });
      }

      pos.x = dropX;
      pos.y = dropY;
      pos.rotation = Math.round(group.rotation());
      pos.zone = newZoneName;

      const updated: TablePosition = {
        tableId: table.id,
        x: dropX,
        y: dropY,
        width: pos.width || DEFAULT_TABLE_SIZE,
        height: pos.height || DEFAULT_TABLE_SIZE,
        rotation: Math.round(group.rotation()),
        shape: pos.shape,
        floor: pos.floor || this.selectedFloor,
        zone: newZoneName,
      };
      this.positions.set(table.id, updated);
      this.ngZone.run(() => {
        this.hasUnsavedChanges = true;
        if (this.selectedTable?.id === table.id) {
          this.selectedTable = { ...table };
        }
        this.applyFilters();
        this.cdr.detectChanges();
      });
    });

    // Handle Transformer Resizing (8 Anchors non-uniform) & Free Rotation
    group.on('transform', () => {
      if (!this.isEditMode) return;
      const scaleX = group.scaleX();
      const scaleY = group.scaleY();

      const currentW = Math.max(40, Math.round(startW * scaleX));
      const currentH = Math.max(40, Math.round(startH * scaleY));

      // Counter-scale label group so text is never distorted during drag
      const labelGroupNode = group.findOne('.label-group') as Konva.Group;
      if (labelGroupNode) {
        labelGroupNode.scaleX(1 / (scaleX || 1));
        labelGroupNode.scaleY(1 / (scaleY || 1));
        labelGroupNode.rotation(-(group.rotation() || 0));
      }

      // Live update in-memory position & dimensions (supports oval/ellipse tables)
      pos.x = Math.round(group.x());
      pos.y = Math.round(group.y());
      pos.width = currentW;
      pos.height = currentH;
      pos.rotation = Math.round(group.rotation());

      this.positions.set(table.id, { ...pos });

      this.ngZone.run(() => {
        this.hasUnsavedChanges = true;
        if (this.selectedTable?.id === table.id) {
          this.selectedTable = { ...table };
        }
        this.cdr.detectChanges();
      });
    });

    group.on('transformend', () => {
      if (!this.isEditMode) return;
      const scaleX = group.scaleX();
      const scaleY = group.scaleY();

      const newW = Math.max(40, Math.round(startW * scaleX));
      const newH = Math.max(40, Math.round(startH * scaleY));

      // Reset group scale back to 1
      group.scaleX(1);
      group.scaleY(1);

      // Update inner shape to actual un-scaled pixel dimensions
      if (pos.shape === 'circle') {
        const ellipse = group.findOne('.forme');
        if (ellipse instanceof Konva.Ellipse) {
          ellipse.radiusX(newW / 2);
          ellipse.radiusY(newH / 2);
        }
      } else {
        const rect = group.findOne('.forme');
        if (rect instanceof Konva.Rect) {
          rect.width(newW);
          rect.height(newH);
          rect.offsetX(newW / 2);
          rect.offsetY(newH / 2);
        }
      }

      // Reset label group scale & update text widths
      const labelGroupNode = group.findOne('.label-group') as Konva.Group;
      if (labelGroupNode) {
        labelGroupNode.scaleX(1);
        labelGroupNode.scaleY(1);
        labelGroupNode.rotation(-(group.rotation() || 0));
        const tNode = labelGroupNode.findOne('.label-title') as Konva.Text;
        if (tNode) {
          tNode.width(newW);
          tNode.x(-newW / 2);
          tNode.y(table.capacite ? -14 : -8);
        }
        const sNode = labelGroupNode.findOne('.label-sub') as Konva.Text;
        if (sNode) {
          sNode.width(newW);
          sNode.x(-newW / 2);
          sNode.y(6);
        }
      }

      startW = newW;
      startH = newH;

      pos.x = Math.round(group.x());
      pos.y = Math.round(group.y());
      pos.width = newW;
      pos.height = newH;
      pos.rotation = Math.round(group.rotation());

      const updated: TablePosition = {
        tableId: table.id,
        x: Math.round(group.x()),
        y: Math.round(group.y()),
        width: newW,
        height: newH,
        rotation: Math.round(group.rotation()),
        shape: pos.shape,
        floor: pos.floor || this.selectedFloor,
        zone: pos.zone,
      };

      this.positions.set(table.id, updated);
      this.transformer?.forceUpdate();
      this.layer?.batchDraw();
      this.ngZone.run(() => {
        this.hasUnsavedChanges = true;
        if (this.selectedTable?.id === table.id) {
          this.selectedTable = { ...table };
        }
        this.cdr.detectChanges();
      });
    });

    return group;
  }

  toggleGridSnap() {
    this.isGridSnapEnabled = !this.isGridSnapEnabled;
    this.cdr.detectChanges();
    this.toastCtrl.create({
      message: this.isGridSnapEnabled ? 'Alignement Grille (50 cm) activé' : 'Alignement Grille désactivé (déplacement libre)',
      duration: 1500,
      color: 'info',
    }).then(t => t.present());
  }

  toggleMagnetSnap() {
    this.isMagnetSnapEnabled = !this.isMagnetSnapEnabled;
    this.cdr.detectChanges();
    this.toastCtrl.create({
      message: this.isMagnetSnapEnabled ? 'Aimantation bord à bord activée' : 'Aimantation bord à bord désactivée',
      duration: 1500,
      color: 'info',
    }).then(t => t.present());
  }

  /** Magnet snapping to grid and adjacent tables. */
  private snapToGridAndTables(targetGroup: Konva.Group, currentTableId: number) {
    let gx = targetGroup.x();
    let gy = targetGroup.y();

    // 1. Alignement sur Grille (50 cm / 50 px)
    if (this.isGridSnapEnabled) {
      gx = Math.round(gx / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;
      gy = Math.round(gy / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;
    }

    // 2. Aimantation automatique bord à bord avec les tables voisines
    if (this.isMagnetSnapEnabled) {
      const currentPos = this.positions.get(currentTableId);
      const curW = currentPos?.width || DEFAULT_TABLE_SIZE;
      const curH = currentPos?.height || DEFAULT_TABLE_SIZE;

      let bestDistX = MAGNET_SNAP_DISTANCE;
      let bestSnapX = gx;

      let bestDistY = MAGNET_SNAP_DISTANCE;
      let bestSnapY = gy;

      this.filteredTables.forEach(otherTable => {
        if (otherTable.id === currentTableId) return;
        const otherPos = this.positions.get(otherTable.id);
        if (!otherPos) return;

        const otherW = otherPos.width || DEFAULT_TABLE_SIZE;
        const otherH = otherPos.height || DEFAULT_TABLE_SIZE;
        const otherX = otherPos.x;
        const otherY = otherPos.y;

        // Candidats d'alignement horizontal (X) :
        // - Coller à droite: bord gauche de la table = bord droit de la voisine
        // - Coller à gauche: bord droit de la table = bord gauche de la voisine
        // - Aligner centres
        // - Aligner bords gauches
        // - Aligner bords droits
        const xCandidates = [
          otherX + (otherW + curW) / 2,
          otherX - (otherW + curW) / 2,
          otherX,
          otherX - (otherW - curW) / 2,
          otherX + (otherW - curW) / 2,
        ];

        xCandidates.forEach(candX => {
          const dist = Math.abs(gx - candX);
          if (dist < bestDistX) {
            bestDistX = dist;
            bestSnapX = candX;
          }
        });

        // Candidats d'alignement vertical (Y) :
        // - Coller en bas: bord haut de la table = bord bas de la voisine
        // - Coller en haut: bord bas de la table = bord haut de la voisine
        // - Aligner centres
        // - Aligner hauts
        // - Aligner bas
        const yCandidates = [
          otherY + (otherH + curH) / 2,
          otherY - (otherH + curH) / 2,
          otherY,
          otherY - (otherH - curH) / 2,
          otherY + (otherH - curH) / 2,
        ];

        yCandidates.forEach(candY => {
          const dist = Math.abs(gy - candY);
          if (dist < bestDistY) {
            bestDistY = dist;
            bestSnapY = candY;
          }
        });
      });

      gx = bestSnapX;
      gy = bestSnapY;
    }

    targetGroup.position({ x: Math.round(gx), y: Math.round(gy) });
  }

  private attachTransformer(group: Konva.Group) {
    if (!this.transformer) return;
    this.transformer.nodes([group]);
    this.transformer.moveToTop();
    this.layer?.batchDraw();
  }

  private detachTransformer() {
    if (!this.transformer) return;
    this.transformer.nodes([]);
    this.tableShapes.forEach(g => g.draggable(false));
    this.layer?.batchDraw();
  }

  private couleurTable(table: TableBar): string {
    if (table.reservee) return COLOR_RESERVEE;
    if (!table.occupee) return COLOR_LIBRE;
    return COLOR_OCCUPEE;
  }

  private positionDefaut(tableOrIdx: TableBar | number, idParam?: number): TablePosition {
    const tableId = typeof tableOrIdx === 'object' ? tableOrIdx.id : (idParam ?? Date.now());
    const idx = typeof tableOrIdx === 'number' ? tableOrIdx : this.tables.findIndex(t => t.id === tableId);
    const validIdx = idx >= 0 ? idx : this.positions.size;
    const tObj = typeof tableOrIdx === 'object' ? tableOrIdx : this.tables.find(t => t.id === tableId);

    return {
      tableId,
      x: MARGIN + (validIdx % COLS) * (DEFAULT_TABLE_SIZE + GAP),
      y: MARGIN + Math.floor(validIdx / COLS) * (DEFAULT_TABLE_SIZE + GAP),
      width: DEFAULT_TABLE_SIZE,
      height: DEFAULT_TABLE_SIZE,
      rotation: 0,
      shape: 'rect',
      floor: tObj?.etage || this.selectedFloor,
      zone: tObj?.zone,
    };
  }

  // ─── Actions & Modals ────────────────────────────────────────────────────────

  charger() {
    if (this.hasUnsavedChanges) return;
    this.isLoading = true;
    this.cdr.detectChanges();
    this.charger$.next();
  }

  async onClickTable(table: TableBar, group?: Konva.Group) {
    if (this.isFusionMode && this.fusionSourceTable && this.fusionSourceTable.id !== table.id) {
      await this.confirmerFusion(this.fusionSourceTable, table);
      return;
    }

    if (!this.isEditMode) {
      return;
    }

    this.selectedTable = table;
    this.selectedZoneArea = null;

    const targetGroup = group || this.tableShapes.get(table.id);
    if (targetGroup) {
      this.attachTransformer(targetGroup);
    }
    this.tableShapes.forEach((g, id) => {
      g.draggable(id === table.id);
    });
    this.zoneShapes.forEach(z => z.draggable(false));

    this.isSidePanelOpen = true;
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => this.dessinerZones());
  }

  closeSidePanel() {
    this.isSidePanelOpen = false;
    this.selectedTable = null;
    this.selectedZoneArea = null;
    this.detachTransformer();
    this.tableShapes.forEach(g => g.draggable(false));
    this.zoneShapes.forEach(g => g.draggable(false));
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => this.dessinerZones());
  }

  onLiveUpdateZone(updatedZone: ZoneArea) {
    const idx = this.zoneAreas.findIndex(z => z.id === updatedZone.id);
    if (idx !== -1) {
      this.zoneAreas[idx] = updatedZone;
    }
    this.sauvegarderZonesLocales();
    this.hasUnsavedChanges = true;
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.dessinerZones());
    });
  }

  private updateSelectedTableGroupNode(pos: TablePosition) {
    if (!this.selectedTable) return;
    const group = this.tableShapes.get(this.selectedTable.id);
    if (!group) {
      this.dessinerTables();
      return;
    }

    const W = pos.width || DEFAULT_TABLE_SIZE;
    const H = pos.height || DEFAULT_TABLE_SIZE;

    this.updateTableShapeNode(group, pos.shape, W, H, this.selectedTable);
    this.updateTableLabelNode(group, W, pos.rotation);
    group.rotation(pos.rotation || 0);
    this.transformer?.forceUpdate();
    this.layer?.batchDraw();
  }

  /**
   * Updates or recreates the Konva shape node (Ellipse or Rect) within a table group.
   * Supports rectangles, squares, perfect circles (W == H), and ovals/ellipses (W != H).
   */
  private updateTableShapeNode(group: Konva.Group, shape: string, W: number, H: number, table: TableBar): boolean {
    const existingShape = group.findOne('.forme');
    const colors = this.couleurTableInfo(table);

    if (shape === 'circle') {
      if (existingShape instanceof Konva.Ellipse) {
        existingShape.radiusX(W / 2);
        existingShape.radiusY(H / 2);
        existingShape.fill(colors.fillColor);
        existingShape.stroke(colors.mainColor);
      } else {
        existingShape?.destroy();
        const newEllipse = new Konva.Ellipse({
          radiusX: W / 2,
          radiusY: H / 2,
          fill: colors.fillColor,
          stroke: colors.mainColor,
          strokeWidth: 2,
          name: 'forme',
        });
        group.add(newEllipse);
        newEllipse.moveToBottom();
      }
    } else if (existingShape instanceof Konva.Rect) {
      existingShape.width(W);
      existingShape.height(H);
      existingShape.offsetX(W / 2);
      existingShape.offsetY(H / 2);
      existingShape.fill(colors.fillColor);
      existingShape.stroke(colors.mainColor);
    } else {
      existingShape?.destroy();
      const newRect = new Konva.Rect({
        width: W,
        height: H,
        offsetX: W / 2,
        offsetY: H / 2,
        fill: colors.fillColor,
        stroke: colors.mainColor,
        strokeWidth: 2,
        cornerRadius: 16,
        name: 'forme',
      });
      group.add(newRect);
      newRect.moveToBottom();
    }
    return true;
  }

  private updateTableLabelNode(group: Konva.Group, W: number, rotation?: number) {
    const labelGroupNode = group.findOne('.label-group') as Konva.Group;
    if (!labelGroupNode || !this.selectedTable) return;

    labelGroupNode.rotation(-(rotation || 0));

    const numDisplay = this.selectedTable.numero ? `T${this.selectedTable.numero}` : `T${this.selectedTable.id}`;
    const capDisplay = this.selectedTable.capacite ? `${this.selectedTable.capacite} pers` : '';
    const colors = this.couleurTableInfo(this.selectedTable);

    const tNode = labelGroupNode.findOne('.label-title') as Konva.Text;
    if (tNode) {
      tNode.text(numDisplay);
      tNode.fill(colors.mainColor);
      tNode.width(W);
      tNode.x(-W / 2);
      tNode.y(capDisplay ? -14 : -8);
    }

    let sNode = labelGroupNode.findOne('.label-sub') as Konva.Text;
    if (sNode) {
      sNode.text(capDisplay);
      sNode.width(W);
      sNode.x(-W / 2);
      sNode.y(6);
    } else if (capDisplay) {
      sNode = new Konva.Text({
        text: capDisplay,
        fontSize: 11,
        fontStyle: 'normal',
        fill: '#a4add0',
        align: 'center',
        width: W,
        x: -W / 2,
        y: 6,
        name: 'label-sub',
        listening: false,
      });
      labelGroupNode.add(sNode);
    }
  }

  onLiveUpdateTable(event: { table: Partial<TableBar>; position: Partial<TablePosition> }) {
    if (!this.selectedTable) return;
    Object.assign(this.selectedTable, event.table);
    let pos = this.positions.get(this.selectedTable.id);
    if (!pos) {
      pos = this.positionDefaut(this.selectedTable);
      this.positions.set(this.selectedTable.id, pos);
    }
    Object.assign(pos, event.position);
    this.hasUnsavedChanges = true;
    this.applyFilters();
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => this.updateSelectedTableGroupNode(pos));
  }

  onSaveZoneArea(zone: ZoneArea) {
    this.sauvegarderZonesLocales();
    const payload = this.zoneAreaToPayload(zone);
    const targetZone = this.zones.find(z => z.nom.toLowerCase() === zone.nom.toLowerCase() || (z.id && `za-${z.id}` === zone.id));

    const save$ = (targetZone?.id)
      ? this.zoneService.update(targetZone.id, payload)
      : this.zoneService.create(payload);

    save$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (savedZone) => {
        if (targetZone) {
          Object.assign(targetZone, savedZone);
        } else {
          this.zones.push(savedZone);
        }
        this.sauvegarderZonesLocales();
        this.hasUnsavedChanges = false;
        this.selectedZoneArea = null;
        this.isSidePanelOpen = false;
        this.cdr.detectChanges();
        this.ngZone.runOutsideAngular(() => this.dessinerZones());

        this.toastCtrl.create({ message: `Zone "${zone.nom}" enregistrée avec succès`, duration: 2000, color: 'success' })
          .then(t => t.present());
      },
      error: () => {
        this.toastCtrl.create({ message: `Erreur lors de l'enregistrement de la zone "${zone.nom}"`, duration: 3000, color: 'danger' })
          .then(t => t.present());
      },
    });
  }

  onDeleteZoneArea(zoneId: string) {
    const targetZone = this.zones.find(z => (z.id && `za-${z.id}` === zoneId) || z.nom.toLowerCase() === this.selectedZoneArea?.nom.toLowerCase());
    const delete$ = (targetZone?.id)
      ? this.zoneService.delete(targetZone.id)
      : of(void 0);

    delete$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.zoneAreas = this.zoneAreas.filter(z => z.id !== zoneId);
        if (targetZone) {
          this.zones = this.zones.filter(z => z.id !== targetZone.id);
        }
        this.sauvegarderZonesLocales();
        this.hasUnsavedChanges = true;
        this.selectedZoneArea = null;
        this.isSidePanelOpen = false;
        this.detachTransformer();
        this.cdr.detectChanges();
        this.ngZone.runOutsideAngular(() => this.dessinerZones());

        this.toastCtrl.create({ message: 'Zone supprimée du plan', duration: 2000, color: 'warning' })
          .then(t => t.present());
      },
      error: () => {
        this.toastCtrl.create({ message: 'Erreur lors de la suppression de la zone', duration: 3000, color: 'danger' })
          .then(t => t.present());
      },
    });
  }

  ajouterNouvelleTable() {
    const nextNum = Math.max(0, ...this.tables.map(t => t.numero)) + 1;
    const defaultZone = this.selectedZones.length > 0 ? this.selectedZones[0] : 'INTERIEUR';
    const newTable: TableBar = {
      id: Date.now(),
      numero: nextNum,
      capacite: 4,
      zone: defaultZone,
      etage: this.selectedFloor,
      occupee: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newPos: TablePosition = {
      tableId: newTable.id,
      x: MARGIN + ((this.filteredTables.length) % COLS) * (DEFAULT_TABLE_SIZE + GAP),
      y: MARGIN + Math.floor((this.filteredTables.length) / COLS) * (DEFAULT_TABLE_SIZE + GAP),
      width: DEFAULT_TABLE_SIZE,
      height: DEFAULT_TABLE_SIZE,
      rotation: 0,
      shape: 'rect',
      floor: this.selectedFloor,
      zone: this.selectedZones.length > 0 ? this.selectedZones[0] : undefined,
    };

    this.tables.push(newTable);
    this.positions.set(newTable.id, newPos);
    this.selectedTable = newTable;
    this.hasUnsavedChanges = true;
    this.applyFilters();
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => this.dessinerTables());

    this.toastCtrl.create({
      message: `Nouvelle Table #${nextNum} ajoutée au plan (${this.selectedFloor})`,
      duration: 2500,
      color: 'success',
    }).then(t => t.present());
  }

  pivoterTableSelectionnee() {
    if (!this.selectedTable) return;
    const pos = this.positions.get(this.selectedTable.id);
    if (!pos) return;

    pos.rotation = (pos.rotation + 90) % 360;
    this.hasUnsavedChanges = true;
    this.ngZone.runOutsideAngular(() => this.dessinerTables());
    this.cdr.detectChanges();
  }

  toggleFormeTableSelectionnee() {
    if (!this.selectedTable) return;
    const pos = this.positions.get(this.selectedTable.id);
    if (!pos) return;

    pos.shape = pos.shape === 'rect' ? 'circle' : 'rect';
    this.hasUnsavedChanges = true;
    this.ngZone.runOutsideAngular(() => this.dessinerTables());
    this.cdr.detectChanges();
  }

  toggleForme(tableId: number) {
    const pos = this.positions.get(tableId);
    if (!pos) return;
    pos.shape = pos.shape === 'rect' ? 'circle' : 'rect';
    this.hasUnsavedChanges = true;
    this.ngZone.runOutsideAngular(() => this.dessinerTables());
  }

  onStartFusion(table: TableBar) {
    this.fusionSourceTable = table;
    this.isFusionMode = true;
    this.closeSidePanel();
    this.toastCtrl.create({
      message: `Mode Fusion : Cliquez sur la table destination pour fusionner avec la Table #${table.numero}`,
      duration: 5000,
      color: 'primary',
    }).then(t => t.present());
  }

  annulerFusion() {
    this.isFusionMode = false;
    this.fusionSourceTable = null;
    this.cdr.detectChanges();
  }

  async confirmerFusion(source: TableBar, target: TableBar) {
    const modal = await this.modalCtrl.create({
      component: FusionModalComponent,
      componentProps: { sourceTable: source, targetTable: target },
      cssClass: 'fusion-modal-class',
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.confirmed) {
      target.capacite += source.capacite;
      this.tables = this.tables.filter(t => t.id !== source.id);
      this.isFusionMode = false;
      this.fusionSourceTable = null;
      this.applyFilters();
      this.toastCtrl.create({
        message: `Tables ${source.numero} et ${target.numero} fusionnées avec succès !`,
        duration: 3000,
        color: 'success',
      }).then(t => t.present());
      this.ngZone.runOutsideAngular(() => this.dessinerTables());
    } else {
      this.isFusionMode = false;
      this.fusionSourceTable = null;
    }
  }

  getSelectedTablePosition(): TablePosition | null {
    if (!this.selectedTable) return null;
    return this.positions.get(this.selectedTable.id) || null;
  }

  onSaveTableAndPosition(event: { table: Partial<TableBar>; position: Partial<TablePosition> }) {
    if (!this.selectedTable) return;

    Object.assign(this.selectedTable, event.table);
    const existingTable = this.tables.find(t => t.id === this.selectedTable!.id);
    if (existingTable) {
      Object.assign(existingTable, event.table);
    }
    let pos = this.positions.get(this.selectedTable.id);
    if (!pos) {
      pos = this.positionDefaut(this.selectedTable);
      this.positions.set(this.selectedTable.id, pos);
    }
    Object.assign(pos, event.position);

    this.applyFilters();
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => this.dessinerTables());

    const tableToSave = this.selectedTable;
    const isNew = tableToSave.id > 1000000000;

    const tableSave$ = isNew
      ? this.tableService.create({
          numero: tableToSave.numero,
          capacite: tableToSave.capacite,
          zone: tableToSave.zone,
        }).pipe(
          tap(created => {
            const oldId = tableToSave.id;
            tableToSave.id = created.id;
            const currentPos = this.positions.get(oldId);
            if (currentPos) {
              currentPos.tableId = created.id;
              this.positions.delete(oldId);
              this.positions.set(created.id, currentPos);
            }
          })
        )
      : this.tableService.update(tableToSave.id, {
          numero: tableToSave.numero,
          capacite: tableToSave.capacite,
          zone: tableToSave.zone,
        });

    tableSave$.pipe(
      switchMap(() => {
        const positions = Array.from(this.positions.values());
        return this.planSalleService.sauvegarderPositions(positions);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.hasUnsavedChanges = false;
        this.selectedTable = null;
        this.isSidePanelOpen = false;
        this.detachTransformer();
        this.tableShapes.forEach(t => t.draggable(false));
        this.applyFilters();
        this.cdr.detectChanges();
        this.ngZone.runOutsideAngular(() => this.dessinerTables());
        this.toastCtrl.create({ message: `Table #${tableToSave.numero} enregistrée avec succès`, duration: 2000, color: 'success' })
          .then(t => t.present());
      },
      error: () => {
        this.toastCtrl.create({ message: 'Erreur lors de l\'enregistrement', duration: 3000, color: 'danger' })
          .then(t => t.present());
      }
    });
  }

  onDeleteTable(tableId: number) {
    this.tables = this.tables.filter(t => t.id !== tableId);
    this.positions.delete(tableId);
    this.selectedTable = null;
    this.isSidePanelOpen = false;
    this.detachTransformer();
    this.applyFilters();
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => this.dessinerTables());

    const delete$ = tableId <= 1000000000
      ? this.tableService.delete(tableId)
      : of(void 0);

    delete$.pipe(
      switchMap(() => {
        const positions = Array.from(this.positions.values());
        return this.planSalleService.sauvegarderPositions(positions);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.hasUnsavedChanges = false;
        this.cdr.detectChanges();
        this.toastCtrl.create({ message: 'Table supprimée du plan', duration: 2000, color: 'warning' })
          .then(t => t.present());
      },
      error: () => {
        this.toastCtrl.create({ message: 'Table supprimée localement', duration: 2000, color: 'warning' })
          .then(t => t.present());
      }
    });
  }

  onSaveTable(updated: Partial<TableBar>) {
    if (this.selectedTable) {
      Object.assign(this.selectedTable, updated);
      const tableToSave = this.selectedTable;
      const isNew = tableToSave.id > 1000000000;

      const tableSave$ = isNew
        ? this.tableService.create({
            numero: tableToSave.numero,
            capacite: tableToSave.capacite,
            zone: tableToSave.zone,
          }).pipe(
            tap(created => {
              const oldId = tableToSave.id;
              tableToSave.id = created.id;
              const currentPos = this.positions.get(oldId);
              if (currentPos) {
                currentPos.tableId = created.id;
                this.positions.delete(oldId);
                this.positions.set(created.id, currentPos);
              }
            })
          )
        : this.tableService.update(tableToSave.id, {
            numero: tableToSave.numero,
            capacite: tableToSave.capacite,
            zone: tableToSave.zone,
          });

      tableSave$.pipe(
        switchMap(() => {
          const positions = Array.from(this.positions.values());
          return this.planSalleService.sauvegarderPositions(positions);
        }),
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.hasUnsavedChanges = false;
          this.toastCtrl.create({ message: 'Modifications enregistrées', duration: 2000, color: 'success' })
            .then(t => t.present());
          this.ngZone.runOutsideAngular(() => this.dessinerTables());
        },
        error: () => {
          this.toastCtrl.create({ message: 'Erreur lors de l\'enregistrement', duration: 3000, color: 'danger' })
            .then(t => t.present());
        }
      });
    }
  }

  toggleEditMode() {
    if (!this.isAdmin) return;
    this.isEditMode = !this.isEditMode;
    if (!this.isEditMode) {
      this.detachTransformer();
      this.selectedTable = null;
      this.selectedZoneArea = null;
      this.isSidePanelOpen = false;
    }
    this.tableShapes.forEach((group, id) => {
      group.draggable(this.isEditMode && this.selectedTable?.id === id);
    });
    this.zoneShapes.forEach((group, id) => {
      group.draggable(this.isEditMode && this.selectedZoneArea?.id === id);
    });
    this.layer?.batchDraw();
    this.zoneLayer?.batchDraw();
    this.dessinerZones();
    this.cdr.detectChanges();
  }

  sauvegarder() {
    const newTables = this.tables.filter(t => t.id > 1000000000);
    const saveNewTables$ = newTables.length > 0
      ? forkJoin(newTables.map(t => this.tableService.create({
          numero: t.numero,
          capacite: t.capacite,
          zone: t.zone,
        }).pipe(
          tap(created => {
            const oldId = t.id;
            t.id = created.id;
            const currentPos = this.positions.get(oldId);
            if (currentPos) {
              currentPos.tableId = created.id;
              this.positions.delete(oldId);
              this.positions.set(created.id, currentPos);
            }
          })
        )))
      : of([]);

    const existingTables = this.tables.filter(t => t.id <= 1000000000);
    const saveExistingTables$ = existingTables.length > 0
      ? forkJoin(existingTables.map(t => this.tableService.update(t.id, {
          numero: t.numero,
          capacite: t.capacite,
          zone: t.zone,
        })))
      : of([]);

    const saveZones$ = this.zoneAreas.length > 0
      ? forkJoin(this.zoneAreas.map(za => {
          const payload = this.zoneAreaToPayload(za);
          const targetZone = this.zones.find(z => z.nom.toLowerCase() === za.nom.toLowerCase() || (z.id && `za-${z.id}` === za.id));
          if (targetZone?.id) {
            return this.zoneService.update(targetZone.id, payload).pipe(
              tap(updated => Object.assign(targetZone, updated))
            );
          }
          return this.zoneService.create(payload).pipe(
            tap(created => this.zones.push(created))
          );
        }))
      : of([]);

    forkJoin([saveNewTables$, saveExistingTables$, saveZones$]).pipe(
      switchMap(() => {
        const positions = Array.from(this.positions.values());
        return this.planSalleService.sauvegarderPositions(positions);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.sauvegarderZonesLocales();
        this.hasUnsavedChanges = false;
        this.cdr.detectChanges();
        this.toastCtrl.create({ message: 'Plan de salle sauvegardé', duration: 2000, color: 'success' })
          .then(t => t.present());
      },
      error: () => {
        this.toastCtrl.create({ message: 'Erreur lors de la sauvegarde du plan', duration: 3000, color: 'danger' })
          .then(t => t.present());
      },
    });
  }
}
