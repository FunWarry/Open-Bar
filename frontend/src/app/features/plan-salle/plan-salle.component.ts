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
  IonFab, IonFabButton, IonBadge, IonSpinner,
  ToastController, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pencilOutline, saveOutline, closeOutline, refreshOutline } from 'ionicons/icons';
import { TableService } from '../../core/services/table.service';
import { NotificationService } from '../../core/services/notification.service';
import { PlanSalleService } from './services/plan-salle.service';
import { TableDetailModalComponent } from '../dashboard-serveur/components/table-detail-modal/table-detail-modal.component';
import { selectIsAdmin } from '../../core/store/auth.selectors';
import { TableBar } from '../../core/models/table.model';
import { TablePosition } from './models/table-position.model';
import { TableView } from '../dashboard-serveur/models/table-view.model';
import { TableSidePanelComponent } from './components/table-side-panel/table-side-panel.component';
import { FusionModalComponent } from './components/fusion-modal/fusion-modal.component';

// Tokens couleur Figma — design system OpenBar
const COULEUR_LIBRE   = '#27ae60';
const COULEUR_OCCUPEE = '#e67e22';
const TAILLE_TABLE       = 64;
const GAP                = 48;
const MARGIN             = 80;
const COLS               = 5;

@Component({
  selector: 'app-plan-salle',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonFab, IonFabButton, IonBadge, IonSpinner,
    TableSidePanelComponent,
  ],
  templateUrl: './plan-salle.component.html',
  styleUrls: ['./plan-salle.component.scss'],
})
export class PlanSalleComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('konvaContainer') containerRef!: ElementRef<HTMLDivElement>;

  tables: TableBar[] = [];
  isLoading = false;
  isEditMode = false;
  isAdmin = false;
  hasUnsavedChanges = false;

  // Side Panel & Fusion
  selectedTable: TableBar | null = null;
  isSidePanelOpen = false;
  fusionSourceTable: TableBar | null = null;
  isFusionMode = false;

  private stage!: Konva.Stage;
  private layer!: Konva.Layer;
  private readonly positions = new Map<number, TablePosition>();
  private readonly tableShapes = new Map<number, Konva.Group>();
  private readonly destroy$ = new Subject<void>();
  private readonly charger$  = new Subject<void>();

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
    addIcons({ pencilOutline, saveOutline, closeOutline, refreshOutline });
  }

  ngOnInit() {
    this.store.select(selectIsAdmin)
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAdmin => { this.isAdmin = isAdmin; this.cdr.detectChanges(); });

    this.notifService.onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        if (notif.type === 'table') this.charger();
      });
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => this.initKonva());

    this.charger$
      .pipe(
        switchMap(() => forkJoin({
          tables:    this.tableService.getAll(),
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

  // ─── Konva ─────────────────────────────────────────────────────────────────

  private initKonva() {
    const el = this.containerRef?.nativeElement;
    if (!el) return;
    this.stage = new Konva.Stage({
      container: el,
      width: el.offsetWidth || 800,
      height: el.offsetHeight || 600,
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
  }

  private dessinerTables() {
    if (!this.layer) return;
    this.layer.destroyChildren();
    this.tableShapes.clear();

    this.tables.forEach((table, idx) => {
      const pos = this.positions.get(table.id) ?? this.positionDefaut(idx, table.id);
      const group = this.creerGroupeTable(table, pos);
      this.tableShapes.set(table.id, group);
      this.layer.add(group);
    });

    this.layer.batchDraw();
  }

  private creerGroupeTable(table: TableBar, pos: TablePosition): Konva.Group {
    const group = new Konva.Group({
      x: pos.x, y: pos.y,
      rotation: pos.rotation,
      draggable: this.isEditMode,
    });

    const couleur = this.couleurTable(table);
    const S = TAILLE_TABLE;

    const forme = pos.shape === 'circle'
      ? new Konva.Circle({ radius: S / 2, fill: couleur, stroke: '#ffffff44', strokeWidth: 2 })
      : new Konva.Rect({ width: S, height: S, offsetX: S / 2, offsetY: S / 2, fill: couleur, stroke: '#ffffff44', strokeWidth: 2, cornerRadius: 10 });

    const label = new Konva.Text({
      text: String(table.numero),
      fontSize: 16, fontStyle: 'bold', fill: '#fff',
      align: 'center', verticalAlign: 'middle',
      width: S, height: S, offsetX: S / 2, offsetY: S / 2,
    });

    group.add(forme, label);

    group.on('click tap', () => {
      this.ngZone.run(() => this.onClickTable(table));
    });

    if (this.isEditMode) {
      group.on('dragend', () => {
        const updated: TablePosition = {
          tableId: table.id, x: group.x(), y: group.y(),
          rotation: group.rotation(), shape: pos.shape,
        };
        this.positions.set(table.id, updated);
        this.ngZone.run(() => { this.hasUnsavedChanges = true; this.cdr.detectChanges(); });
      });
    }

    return group;
  }

  private couleurTable(table: TableBar): string {
    if (!table.occupee) return COULEUR_LIBRE;
    return COULEUR_OCCUPEE;
  }

  private positionDefaut(idx: number, tableId: number): TablePosition {
    return {
      tableId,
      x: MARGIN + (idx % COLS) * (TAILLE_TABLE + GAP),
      y: MARGIN + Math.floor(idx / COLS) * (TAILLE_TABLE + GAP),
      rotation: 0,
      shape: 'rect',
    };
  }

  // ─── Données ───────────────────────────────────────────────────────────────

  charger() {
    if (this.isEditMode && this.hasUnsavedChanges) return;
    this.isLoading = true;
    this.cdr.detectChanges();
    this.charger$.next();
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

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
      message: `Sélectionnez la table avec laquelle fusionner la Table ${table.numero}`,
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
      // Regrouper les capacités et fusionner les 2 tables
      target.capacite += source.capacite;
      this.tables = this.tables.filter(t => t.id !== source.id);
      this.isFusionMode = false;
      this.fusionSourceTable = null;
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
          this.toastCtrl.create({ message: 'Plan sauvegardé', duration: 2000, color: 'success' })
            .then(t => t.present());
        },
        error: () => {
          this.toastCtrl.create({ message: 'Erreur lors de la sauvegarde', duration: 3000, color: 'danger' })
            .then(t => t.present());
        },
      });
  }

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
}
