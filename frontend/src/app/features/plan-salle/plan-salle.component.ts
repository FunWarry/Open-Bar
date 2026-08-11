import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, NgZone, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin, EMPTY } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import Konva from 'konva';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonBadge, IonSpinner, ToastController, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pencilOutline, saveOutline, closeOutline, refreshOutline, alertCircleOutline } from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';

import { TableService } from '../../core/services/table.service';
import { NotificationService } from '../../core/services/notification.service';
import { PlanSalleService } from './services/plan-salle.service';
import { selectIsAdmin } from '../../core/store/auth.selectors';
import { TableBar } from '../../core/models/table.model';
import { TablePosition } from './models/table-position.model';
import { TableSidePanelComponent } from './components/table-side-panel/table-side-panel.component';
import { FusionModalComponent } from './components/fusion-modal/fusion-modal.component';

// OpenBar Figma Design System Color Tokens for Table Statuses
const COLOR_LIBRE = '#2fbf6b';
const COLOR_OCCUPEE = '#e5604f';
const COLOR_PAYMENT = '#f4a52a';
const COLOR_RESERVEE = '#9b8af2';
const TABLE_SIZE = 72;
const GAP = 44;
const MARGIN = 70;
const COLS = 5;

/**
 * Interactive Floor Plan Component powered by Konva.js canvas rendering.
 * Provides real-time table status supervision, floor/zone filters, 2D drag & drop editing,
 * and contextual side panel actions.
 */
@Component({
  selector: 'app-plan-salle',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonBadge, IonSpinner,
    TableSidePanelComponent,
  ],
  templateUrl: './plan-salle.component.html',
  styleUrls: ['./plan-salle.component.scss'],
})
export class PlanSalleComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('konvaContainer') containerRef!: ElementRef<HTMLDivElement>;

  /** List of all bar tables loaded from the backend API. */
  tables: TableBar[] = [];

  /** Currently filtered tables based on selected floor. */
  filteredTables: TableBar[] = [];

  /** Available floors in the establishment. */
  floors = ['RDC', '1er Étage', 'Terrasse', 'VIP'];

  /** Active floor filter, or null for all floors. */
  selectedFloor: string | null = null;

  /** Whether the component is currently fetching data. */
  isLoading = false;

  /** Whether the admin edit mode is active. */
  isEditMode = false;

  /** Whether the authenticated user has ADMIN privileges. */
  isAdmin = false;

  /** Track if any table positions have been modified but not yet saved. */
  hasUnsavedChanges = false;

  /** Currently selected table for side panel inspection. */
  selectedTable: TableBar | null = null;

  /** Controls side panel visibility. */
  isSidePanelOpen = false;

  /** Source table during table merge / transfer operations. */
  fusionSourceTable: TableBar | null = null;

  /** Flag indicating active table merge mode. */
  isFusionMode = false;

  private stage!: Konva.Stage;
  private layer!: Konva.Layer;
  private readonly positions = new Map<number, TablePosition>();
  private readonly tableShapes = new Map<number, Konva.Group>();
  private readonly destroy$ = new Subject<void>();
  private readonly charger$ = new Subject<void>();

  constructor(
    private readonly tableService: TableService,
    private readonly planSalleService: PlanSalleService,
    private readonly notifService: NotificationService,
    private readonly store: Store,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
  ) {
    addIcons({ pencilOutline, saveOutline, closeOutline, refreshOutline, alertCircleOutline });
  }

  ngOnInit() {
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
      .subscribe(({ tables, positions }) => {
        this.tables = tables;
        this.positions.clear();
        positions.forEach(p => this.positions.set(p.tableId, p));
        this.hasUnsavedChanges = false;
        this.isLoading = false;
        this.applyFloorFilter();
        this.cdr.detectChanges();
        this.ngZone.runOutsideAngular(() => this.dessinerTables());
      });

    this.charger();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.charger$.complete();
    this.stage?.destroy();
  }

  /** Filters tables displayed on the floor plan based on floor selection. */
  selectFloor(floor: string | null) {
    this.selectedFloor = floor;
    this.applyFloorFilter();
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => this.dessinerTables());
  }

  private applyFloorFilter() {
    if (!this.selectedFloor) {
      this.filteredTables = [...this.tables];
    } else {
      this.filteredTables = this.tables.filter(t => {
        const pos = this.positions.get(t.id);
        return pos?.floor === this.selectedFloor || t.emplacement === this.selectedFloor;
      });
    }
  }

  // ─── Konva Rendering Engine ──────────────────────────────────────────────────

  private initKonva() {
    const el = this.containerRef?.nativeElement;
    if (!el) return;
    this.stage = new Konva.Stage({
      container: el,
      width: el.offsetWidth || 900,
      height: el.offsetHeight || 650,
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
  }

  private dessinerTables() {
    if (!this.layer) return;
    this.layer.destroyChildren();
    this.tableShapes.clear();

    this.filteredTables.forEach((table, idx) => {
      const pos = this.positions.get(table.id) ?? this.positionDefaut(idx, table.id);
      const group = this.creerGroupeTable(table, pos);
      this.tableShapes.set(table.id, group);
      this.layer.add(group);
    });

    this.layer.batchDraw();
  }

  private creerGroupeTable(table: TableBar, pos: TablePosition): Konva.Group {
    const group = new Konva.Group({
      x: pos.x,
      y: pos.y,
      rotation: pos.rotation,
      draggable: this.isEditMode,
    });

    const couleur = this.couleurTable(table);
    const S = TABLE_SIZE;

    // Table body shape
    const forme = pos.shape === 'circle'
      ? new Konva.Circle({ radius: S / 2, fill: couleur, stroke: '#ffffff44', strokeWidth: 2, shadowBlur: 10, shadowColor: couleur })
      : new Konva.Rect({ width: S, height: S, offsetX: S / 2, offsetY: S / 2, fill: couleur, stroke: '#ffffff44', strokeWidth: 2, cornerRadius: 12, shadowBlur: 10, shadowColor: couleur });

    // Table Label (Number + Capacity)
    const label = new Konva.Text({
      text: `#${table.numero}\n${table.capacite}p`,
      fontSize: 14,
      fontStyle: 'bold',
      fill: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      width: S,
      height: S,
      offsetX: S / 2,
      offsetY: S / 2,
    });

    // Add surrounding seats around table
    const seatsGroup = this.creerSieges(table.capacite, S, pos.shape, couleur);

    group.add(seatsGroup, forme, label);

    group.on('click tap', () => {
      this.ngZone.run(() => this.onClickTable(table));
    });

    if (this.isEditMode) {
      group.on('dragend', () => {
        const updated: TablePosition = {
          tableId: table.id,
          x: group.x(),
          y: group.y(),
          rotation: group.rotation(),
          shape: pos.shape,
          floor: pos.floor,
          zone: pos.zone,
        };
        this.positions.set(table.id, updated);
        this.ngZone.run(() => {
          this.hasUnsavedChanges = true;
          this.cdr.detectChanges();
        });
      });
    }

    return group;
  }

  /** Draws small circular seats around the main table shape. */
  private creerSieges(capacite: number, size: number, shape: string, color: string): Konva.Group {
    const seats = new Konva.Group();
    const seatRadius = 6;
    const distance = size / 2 + 10;
    const count = Math.min(capacite, 8);

    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count;
      const sx = distance * Math.cos(angle);
      const sy = distance * Math.sin(angle);

      const seat = new Konva.Circle({
        x: sx,
        y: sy,
        radius: seatRadius,
        fill: color,
        stroke: '#ffffff66',
        strokeWidth: 1.5,
      });
      seats.add(seat);
    }
    return seats;
  }

  private couleurTable(table: TableBar): string {
    if (table.reservee) return COLOR_RESERVEE;
    if (!table.occupee) return COLOR_LIBRE;
    return COLOR_OCCUPEE;
  }

  private positionDefaut(idx: number, tableId: number): TablePosition {
    return {
      tableId,
      x: MARGIN + (idx % COLS) * (TABLE_SIZE + GAP),
      y: MARGIN + Math.floor(idx / COLS) * (TABLE_SIZE + GAP),
      rotation: 0,
      shape: 'rect',
      floor: 'RDC',
    };
  }

  /** Toggles shape between rectangle and circle for a table. */
  toggleForme(tableId: number) {
    const pos = this.positions.get(tableId);
    if (!pos) return;
    pos.shape = pos.shape === 'rect' ? 'circle' : 'rect';
    const table = this.tables.find(t => t.id === tableId);
    if (table) {
      this.ngZone.runOutsideAngular(() => {
        const group = this.creerGroupeTable(table, pos);
        const old = this.tableShapes.get(tableId);
        old?.destroy();
        this.tableShapes.set(tableId, group);
        this.layer.add(group);
        this.layer.batchDraw();
      });
    }
    this.hasUnsavedChanges = true;
  }

  // ─── Actions & Modals ────────────────────────────────────────────────────────

  charger() {
    if (this.isEditMode && this.hasUnsavedChanges) return;
    this.isLoading = true;
    this.cdr.detectChanges();
    this.charger$.next();
  }

  async onClickTable(table: TableBar) {
    if (this.isFusionMode && this.fusionSourceTable && this.fusionSourceTable.id !== table.id) {
      await this.confirmerFusion(this.fusionSourceTable, table);
      return;
    }

    this.selectedTable = table;
    this.isSidePanelOpen = true;
    this.cdr.detectChanges();
  }

  closeSidePanel() {
    this.isSidePanelOpen = false;
    this.selectedTable = null;
    this.cdr.detectChanges();
  }

  onStartFusion(table: TableBar) {
    this.fusionSourceTable = table;
    this.isFusionMode = true;
    this.closeSidePanel();
    this.toastCtrl.create({
      message: `Sélectionnez la table cible pour fusionner avec la Table ${table.numero}`,
      duration: 4000,
      color: 'primary',
    }).then(t => t.present());
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
      this.applyFloorFilter();
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

  onSaveTable(updated: Partial<TableBar>) {
    if (this.selectedTable) {
      Object.assign(this.selectedTable, updated);
      this.hasUnsavedChanges = true;
      this.toastCtrl.create({ message: 'Modifications enregistrées', duration: 2000, color: 'success' })
        .then(t => t.present());
      this.ngZone.runOutsideAngular(() => this.dessinerTables());
    }
  }

  toggleEditMode() {
    if (!this.isAdmin) return;
    this.isEditMode = !this.isEditMode;
    this.tableShapes.forEach(group => group.draggable(this.isEditMode));
    this.layer?.batchDraw();
  }

  sauvegarder() {
    const positions = Array.from(this.positions.values());
    this.planSalleService.sauvegarderPositions(positions)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.hasUnsavedChanges = false;
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
