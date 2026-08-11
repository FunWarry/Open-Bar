import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, NgZone, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import Konva from 'konva';
import {
  IonContent, IonHeader, IonToolbar,
  IonRefresher, IonRefresherContent,
  IonSearchbar, IonIcon,
  ToastController, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  listOutline, gridOutline, mapOutline, funnelOutline, layersOutline,
  businessOutline, swapVerticalOutline, refreshOutline, restaurantOutline,
  checkmarkCircleOutline, closeCircleOutline, peopleOutline
} from 'ionicons/icons';
import { TableDetailModalComponent } from './components/table-detail-modal/table-detail-modal.component';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardServeurService, EtageItem, ZoneItem } from './services/dashboard-serveur.service';
import { safeCompleteRefresher } from '../../core/utils/refresher-utils';
import { fastModalEnterAnimation, fastModalLeaveAnimation } from '../../core/utils/modal-animation.utils';
import { TableView } from './models/table-view.model';
import { TablePosition } from '../plan-salle/models/table-position.model';
import { PlanSalleService } from '../plan-salle/services/plan-salle.service';

// ─── Plan constants — must match plan-salle.component.ts exactly ───────────────
const PLAN_TABLE_SIZE = 64;
const PLAN_GAP        = 48;
const PLAN_MARGIN     = 80;
const PLAN_COLS       = 5;

import { MobileTableCardComponent } from './components/mobile-table-card/mobile-table-card.component';
import { BottomNavigationComponent, ServeurTab } from './components/bottom-navigation/bottom-navigation.component';
import { ProductCardComponent, ProductItem } from './components/product-card/product-card.component';
import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { CartModel, CartItemModel } from './models/cart.model';

export type DashboardViewMode = 'BY_ZONE' | 'BY_FLOOR' | 'GRID' | 'PLAN';
export type DashboardSortOption = 'NUMBER_ASC' | 'NUMBER_DESC' | 'CAPACITY_ASC' | 'CAPACITY_DESC' | 'STATUS_OCCUPIED' | 'STATUS_FREE';

export interface GroupedTables {
  key: string;
  title: string;
  subTitle?: string;
  tables: TableView[];
  freeCount: number;
  occupiedCount: number;
}

/**
 * Main dashboard component for waiters providing table list supervision,
 * grouped view modes (By Zone, By Floor, Grid, Interactive 2D Plan),
 * dropdown filters (Floor, Zone, Sort), rapid order entry, and STOMP notifications.
 */
@Component({
  selector: 'app-dashboard-serveur',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar,
    IonRefresher, IonRefresherContent,
    IonSearchbar, IonIcon,
    MobileTableCardComponent,
    BottomNavigationComponent,
    ProductCardComponent,
    CartDrawerComponent,
  ],
  templateUrl: './dashboard-serveur.component.html',
  styleUrls: ['./dashboard-serveur.component.scss'],
})
export class DashboardServeurComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('konvaFloorPlanContainer') konvaContainerRef!: ElementRef<HTMLDivElement>;

  tables: TableView[] = [];
  filteredTables: TableView[] = [];
  positionsMap = new Map<number, TablePosition>();

  searchTerm = '';
  selectedStatus: 'ALL' | 'FREE' | 'OCCUPIED' = 'ALL';
  selectedEtage = 'ALL';
  selectedZone = 'ALL';
  sortOption: DashboardSortOption = 'NUMBER_ASC';
  displayMode: DashboardViewMode = 'BY_ZONE';

  etagesList: EtageItem[] = [];
  zonesList: ZoneItem[] = [];

  isLoading = false;
  activeTab: ServeurTab = 'tables';
  selectedCategory = 'ALL';

  cart: CartModel = { tableId: null, items: [] };

  products: ProductItem[] = [
    { id: 1, nom: 'Mojito Traditional', prix: 8.5, categorie: 'COCKTAIL', stock: 15, stockStatus: 'NORMAL', description: 'Rhum blanc, menthe fraîche, citron vert' },
    { id: 2, nom: 'Pinte Blonde Pression', prix: 6.0, categorie: 'BEER', stock: 40, stockStatus: 'NORMAL', description: 'Blonde artisanale 5%' },
    { id: 3, nom: 'Cocktail Signature OpenBar', prix: 10.0, categorie: 'COCKTAIL', stock: 5, stockStatus: 'FAIBLE', description: 'Gin infusé, tonic premium' },
    { id: 4, nom: 'Limonade Maison', prix: 4.5, categorie: 'SOFT', stock: 25, stockStatus: 'NORMAL', description: 'Citron pressé & sirop d\'agave' },
    { id: 5, nom: 'Planche de Nachos & Guacamole', prix: 9.0, categorie: 'SNACK', stock: 8, stockStatus: 'NORMAL', description: 'Cheddar fondu et sauces maison' },
    { id: 6, nom: 'Shot Tequila Special', prix: 4.0, categorie: 'SHOT', stock: 3, stockStatus: 'CRITIQUE', description: 'Tequila reposado' },
  ];

  private stage?: Konva.Stage;
  private layer?: Konva.Layer;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly service: DashboardServeurService,
    private readonly planSalleService: PlanSalleService,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
    private readonly router: Router,
    private readonly notificationService: NotificationService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {
    addIcons({
      listOutline, gridOutline, mapOutline, funnelOutline, layersOutline,
      businessOutline, swapVerticalOutline, refreshOutline, restaurantOutline,
      checkmarkCircleOutline, closeCircleOutline, peopleOutline
    });
  }

  private static readonly FILTER_STORAGE_KEY = 'openbar_serveur_dashboard_filters';

  ngOnInit() {
    this.chargerFiltresSauvegardes();
    this.chargerDonnees();

    this.notificationService.onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        if (notif.type === 'table' || notif.type === 'commande') {
          this.chargerTables();
        }
      });
  }

  ngAfterViewInit() {
    if (this.displayMode === 'PLAN') {
      setTimeout(() => this.initOrUpdateKonva(), 100);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stage?.destroy();
  }

  chargerDonnees() {
    this.isLoading = true;
    forkJoin({
      tables:    this.service.getAllTables(),
      etages:    this.service.getEtages(),
      zones:     this.service.getZones(),
      // Use PlanSalleService directly — shares the same localStorage fallback
      // as the plan management page so positions are always in sync.
      positions: this.planSalleService.getPositions(),
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }),
    )
    .subscribe({
      next: ({ tables, etages, zones, positions }) => {
        this.etagesList = etages;
        this.zonesList = zones;

        this.positionsMap.clear();
        positions.forEach(p => this.positionsMap.set(p.tableId, p));

        this.tables = tables.map((t, idx) => {
          const pos = this.positionsMap.get(t.id);
          const zoneObj = this.zonesList.find(z => z.nom.toLowerCase() === (t.zone || '').toLowerCase());
          // Default position uses exact same algorithm as plan-salle.component.ts
          const defaultX = PLAN_MARGIN + (idx % PLAN_COLS) * (PLAN_TABLE_SIZE + PLAN_GAP);
          const defaultY = PLAN_MARGIN + Math.floor(idx / PLAN_COLS) * (PLAN_TABLE_SIZE + PLAN_GAP);
          return {
            ...t,
            etage: t.etage || zoneObj?.etage || 'RDC',
            planX: pos?.x ?? defaultX,
            planY: pos?.y ?? defaultY,
            planForme: pos?.shape === 'circle' ? 'ROND' : 'CARRE',
            planRotation: pos?.rotation ?? 0,
          };
        });

        this.filtrer();
      },
      error: () => {
        this.toastCtrl.create({
          message: 'Erreur lors du chargement des tables',
          duration: 3000,
          color: 'danger',
        }).then(t => t.present());
      },
    });
  }

  chargerTables(refreshEvent?: any) {
    this.service.getAllTables()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (refreshEvent) safeCompleteRefresher(refreshEvent);
        }),
      )
      .subscribe({
        next: tables => {
          this.tables = tables.map(t => {
            const pos = this.positionsMap.get(t.id);
            const zoneObj = this.zonesList.find(z => z.nom.toLowerCase() === (t.zone || '').toLowerCase());
            return {
              ...t,
              etage: t.etage || zoneObj?.etage || 'RDC',
              planX: pos?.x,
              planY: pos?.y,
              planForme: pos?.shape === 'circle' ? 'ROND' : 'CARRE',
              planRotation: pos?.rotation || 0,
            };
          });
          this.filtrer();
        },
        error: () => {
          this.toastCtrl.create({
            message: 'Erreur lors du chargement des tables',
            duration: 3000,
            color: 'danger',
          }).then(t => t.present());
        },
      });
  }

  filtrer() {
    this.sauvegarderFiltres();
    let result = [...this.tables];

    // Search term filter
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      result = result.filter(t =>
        t.nom.toLowerCase().includes(q) ||
        String(t.id).includes(q) ||
        (t.zone?.toLowerCase().includes(q) ?? false)
      );
    }

    // Status filter
    if (this.selectedStatus === 'FREE') {
      result = result.filter(t => !t.occupee);
    } else if (this.selectedStatus === 'OCCUPIED') {
      result = result.filter(t => t.occupee);
    }

    // Floor filter
    if (this.selectedEtage !== 'ALL') {
      result = result.filter(t => (t.etage || 'RDC') === this.selectedEtage);
    }

    // Zone filter
    if (this.selectedZone !== 'ALL') {
      result = result.filter(t => t.zone === this.selectedZone);
    }

    // Sorting
    result.sort((a, b) => {
      switch (this.sortOption) {
        case 'NUMBER_ASC':
          return a.id - b.id;
        case 'NUMBER_DESC':
          return b.id - a.id;
        case 'CAPACITY_ASC':
          return a.capacite - b.capacite || a.id - b.id;
        case 'CAPACITY_DESC':
          return b.capacite - a.capacite || a.id - b.id;
        case 'STATUS_OCCUPIED':
          return (b.occupee ? 1 : 0) - (a.occupee ? 1 : 0) || a.id - b.id;
        case 'STATUS_FREE':
          return (a.occupee ? 1 : 0) - (b.occupee ? 1 : 0) || a.id - b.id;
        default:
          return a.id - b.id;
      }
    });

    this.filteredTables = result;

    if (this.displayMode === 'PLAN') {
      this.renderKonvaPlan();
    }
  }

  private chargerFiltresSauvegardes() {
    try {
      const saved = localStorage.getItem(DashboardServeurComponent.FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.searchTerm !== undefined) this.searchTerm = parsed.searchTerm;
        if (parsed.selectedStatus) this.selectedStatus = parsed.selectedStatus;
        if (parsed.selectedEtage) this.selectedEtage = parsed.selectedEtage;
        if (parsed.selectedZone) this.selectedZone = parsed.selectedZone;
        if (parsed.sortOption) this.sortOption = parsed.sortOption;
        if (parsed.displayMode) this.displayMode = parsed.displayMode;
      }
    } catch {
      // Fallback cleanly on error
    }
  }

  private sauvegarderFiltres() {
    try {
      const config = {
        searchTerm: this.searchTerm,
        selectedStatus: this.selectedStatus,
        selectedEtage: this.selectedEtage,
        selectedZone: this.selectedZone,
        sortOption: this.sortOption,
        displayMode: this.displayMode,
      };
      localStorage.setItem(DashboardServeurComponent.FILTER_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Fallback cleanly on storage error
    }
  }

  get groupedTables(): GroupedTables[] {
    if (this.displayMode === 'BY_FLOOR') {
      const map = new Map<string, TableView[]>();
      for (const table of this.filteredTables) {
        const key = table.etage || 'RDC';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(table);
      }
      return Array.from(map.entries()).map(([etageCode, tables]) => {
        const etageObj = this.etagesList.find(e => e.code === etageCode);
        return {
          key: etageCode,
          title: etageObj ? etageObj.nom : etageCode,
          tables,
          freeCount: tables.filter(t => !t.occupee).length,
          occupiedCount: tables.filter(t => t.occupee).length,
        };
      });
    }

    // Default: BY_ZONE
    const map = new Map<string, TableView[]>();
    for (const table of this.filteredTables) {
      const key = table.zone || 'Salle Principale';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(table);
    }
    return Array.from(map.entries()).map(([zoneName, tables]) => {
      const zoneObj = this.zonesList.find(z => z.nom === zoneName);
      const etageObj = zoneObj ? this.etagesList.find(e => e.code === zoneObj.etage) : undefined;
      return {
        key: zoneName,
        title: zoneName,
        subTitle: etageObj ? etageObj.nom : undefined,
        tables,
        freeCount: tables.filter(t => !t.occupee).length,
        occupiedCount: tables.filter(t => t.occupee).length,
      };
    });
  }

  get countOccupees(): number {
    return this.tables.filter(t => t.occupee).length;
  }

  get countLibres(): number {
    return this.tables.filter(t => !t.occupee).length;
  }

  get availableZonesForFilter(): ZoneItem[] {
    if (this.selectedEtage === 'ALL') {
      return this.zonesList;
    }
    return this.zonesList.filter(z => z.etage === this.selectedEtage);
  }

  getWaitTimeMinutes(table: TableView): number {
    if (!table.occupee) return 0;
    return ((table.id * 7) % 25) + 5;
  }

  onSearchChange(event: { detail?: { value?: string | null } }) {
    this.searchTerm = event.detail?.value || '';
    this.filtrer();
  }

  setStatusFilter(status: 'ALL' | 'FREE' | 'OCCUPIED') {
    this.selectedStatus = status;
    this.filtrer();
  }

  onEtageSelectChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedEtage = val;
    this.filtrer();
  }

  onZoneSelectChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedZone = val;
    this.filtrer();
  }

  onSortSelectChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value as DashboardSortOption;
    this.sortOption = val;
    this.filtrer();
  }

  setDisplayMode(mode: DashboardViewMode) {
    this.displayMode = mode;
    this.sauvegarderFiltres();
    if (mode === 'PLAN') {
      setTimeout(() => this.initOrUpdateKonva(), 80);
    }
  }

  // ─── KONVA 2D FLOOR PLAN RENDERER ──────────────────────────────────────────

  private initOrUpdateKonva() {
    const container = this.konvaContainerRef?.nativeElement;
    if (!container) return;

    const width = container.offsetWidth || 800;
    const height = Math.max(520, container.offsetHeight || 550);

    if (!this.stage) {
      this.ngZone.runOutsideAngular(() => {
        this.stage = new Konva.Stage({
          container,
          width,
          height,
        });
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
      });
    } else {
      this.stage.width(width);
      this.stage.height(height);
    }

    this.renderKonvaPlan();
  }

  private renderKonvaPlan() {
    if (!this.layer) return;

    this.ngZone.runOutsideAngular(() => {
      this.layer!.destroyChildren();

      const stageWidth  = this.stage?.width()  || 800;
      const stageHeight = this.stage?.height() || 550;

      // ── 1. Background grid (identical to plan-salle) ────────────────────────
      const gridGroup = new Konva.Group();
      const gridSize = 40;
      for (let x = 0; x < stageWidth; x += gridSize) {
        gridGroup.add(new Konva.Line({
          points: [x, 0, x, stageHeight],
          stroke: 'rgba(255, 255, 255, 0.04)',
          strokeWidth: 1,
        }));
      }
      for (let y = 0; y < stageHeight; y += gridSize) {
        gridGroup.add(new Konva.Line({
          points: [0, y, stageWidth, y],
          stroke: 'rgba(255, 255, 255, 0.04)',
          strokeWidth: 1,
        }));
      }
      this.layer!.add(gridGroup);

      // ── 2. Zone regions — drawn BEFORE tables so they appear behind ─────────
      // Collect bounding boxes per zone from filteredTables' positions
      const zoneColors: Record<string, string> = {
        'Salle Principale': 'rgba(108, 127, 232, 0.08)',
        'Terrasse':         'rgba(47, 191, 107, 0.08)',
        'Mezzanine':        'rgba(244, 165, 42, 0.08)',
      };
      const zoneBorders: Record<string, string> = {
        'Salle Principale': 'rgba(108, 127, 232, 0.25)',
        'Terrasse':         'rgba(47, 191, 107, 0.25)',
        'Mezzanine':        'rgba(244, 165, 42, 0.25)',
      };

      // Group tables by zone and compute bounding box
      const zoneMap = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
      const S = PLAN_TABLE_SIZE;
      const PAD = 20;

      this.filteredTables.forEach(table => {
        const zoneName = table.zone || 'Salle Principale';
        const cx = (table.planX ?? 0);
        const cy = (table.planY ?? 0);
        const existing = zoneMap.get(zoneName);
        if (!existing) {
          zoneMap.set(zoneName, { minX: cx - S / 2 - PAD, minY: cy - S / 2 - PAD, maxX: cx + S / 2 + PAD, maxY: cy + S / 2 + PAD });
        } else {
          existing.minX = Math.min(existing.minX, cx - S / 2 - PAD);
          existing.minY = Math.min(existing.minY, cy - S / 2 - PAD);
          existing.maxX = Math.max(existing.maxX, cx + S / 2 + PAD);
          existing.maxY = Math.max(existing.maxY, cy + S / 2 + PAD);
        }
      });

      zoneMap.forEach((box, zoneName) => {
        const fill   = zoneColors[zoneName]   ?? 'rgba(255, 255, 255, 0.05)';
        const stroke = zoneBorders[zoneName]  ?? 'rgba(255, 255, 255, 0.15)';
        const zoneRect = new Konva.Rect({
          x: box.minX, y: box.minY,
          width:  box.maxX - box.minX,
          height: box.maxY - box.minY,
          fill, stroke, strokeWidth: 1,
          cornerRadius: 12,
          dash: [6, 4],
        });
        const zoneLabel = new Konva.Text({
          text: zoneName,
          x: box.minX + 8,
          y: box.minY + 6,
          fontSize: 10,
          fontStyle: '600',
          fill: stroke,
          letterSpacing: 0.5,
        });
        this.layer!.add(zoneRect);
        this.layer!.add(zoneLabel);
      });

      // ── 3. Tables — same rendering as plan-salle.component.ts ───────────────
      this.filteredTables.forEach(table => {
        const posX    = table.planX ?? PLAN_MARGIN;
        const posY    = table.planY ?? PLAN_MARGIN;
        const waitTime = this.getWaitTimeMinutes(table);

        // Same color logic as plan-salle (COULEUR_LIBRE / COULEUR_OCCUPEE)
        // + red tint for late orders on waiter dashboard
        let fill: string;
        let stroke: string;
        if (!table.occupee) {
          fill = '#27ae60'; stroke = '#1e8449';
        } else if (waitTime > 20) {
          fill = '#e74c3c'; stroke = '#c0392b';
        } else {
          fill = '#e67e22'; stroke = '#d35400';
        }

        const group = new Konva.Group({
          x: posX,
          y: posY,
          rotation: table.planRotation ?? 0,
        });

        const isCircle = table.planForme === 'ROND';
        // Sizes exactly matching plan-salle: S=64, centered at (0,0)
        const shape = isCircle
          ? new Konva.Circle({
              radius: S / 2,
              fill, stroke,
              strokeWidth: 2,
              shadowBlur: 8,
              shadowColor: 'rgba(0,0,0,0.3)',
            })
          : new Konva.Rect({
              width: S, height: S,
              offsetX: S / 2, offsetY: S / 2,
              cornerRadius: 10,
              fill, stroke,
              strokeWidth: 2,
              shadowBlur: 8,
              shadowColor: 'rgba(0,0,0,0.3)',
            });
        group.add(shape);

        // Table number label (matches plan-salle label)
        const labelNumero = new Konva.Text({
          text: `T${table.id}`,
          fontSize: 14,
          fontStyle: 'bold',
          fill: '#ffffff',
          width: S, height: S / 2,
          offsetX: S / 2, offsetY: S / 2,
          align: 'center', verticalAlign: 'middle',
        });
        group.add(labelNumero);

        // Capacity sub-label
        const labelCap = new Konva.Text({
          text: `${table.capacite}p`,
          fontSize: 11,
          fill: 'rgba(255,255,255,0.85)',
          width: S, height: S / 2,
          offsetX: S / 2, offsetY: 0,
          align: 'center', verticalAlign: 'middle',
        });
        group.add(labelCap);

        // Wait-time badge for occupied tables
        if (table.occupee && waitTime > 0) {
          const badgeBg = new Konva.Rect({
            x: -18, y: S / 2 - 4,
            width: 36, height: 14,
            cornerRadius: 7,
            fill: 'rgba(0,0,0,0.65)',
          });
          const badgeTxt = new Konva.Text({
            text: `${waitTime}m`,
            fontSize: 9,
            fontStyle: 'bold',
            fill: '#ffffff',
            x: -18, y: S / 2 - 2,
            width: 36,
            align: 'center',
          });
          group.add(badgeBg, badgeTxt);
        }

        group.on('mouseenter', () => {
          const el = this.konvaContainerRef?.nativeElement;
          if (el) el.style.cursor = 'pointer';
          group.to({ scaleX: 1.08, scaleY: 1.08, duration: 0.1 });
        });
        group.on('mouseleave', () => {
          const el = this.konvaContainerRef?.nativeElement;
          if (el) el.style.cursor = 'default';
          group.to({ scaleX: 1, scaleY: 1, duration: 0.1 });
        });
        group.on('click tap', () => {
          this.ngZone.run(() => this.onSelectionner(table));
        });

        this.layer!.add(group);
      });

      this.layer!.draw();
    });
  }

  async onSelectionner(table: TableView) {
    const modal = await this.modalCtrl.create({
      component: TableDetailModalComponent,
      componentProps: { table },
      cssClass: 'table-detail-modal-container',
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.action === 'liberer') {
      this.onLiberer(data.tableId);
    }
  }

  naviguerKanban() {
    this.router.navigate(['/serveur/suivi-commandes']);
  }

  async onLiberer(tableId: number) {
    this.service.libererTable(tableId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.chargerTables();
          const toast = await this.toastCtrl.create({
            message: 'Table libérée',
            duration: 2000,
            color: 'success',
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Impossible de libérer la table',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  get filteredProducts(): ProductItem[] {
    if (this.selectedCategory === 'ALL') return this.products;
    return this.products.filter(p => p.categorie === this.selectedCategory);
  }

  get cartTotalCount(): number {
    return this.cart.items.reduce((sum, item) => sum + item.quantite, 0);
  }

  onTabSelected(tab: ServeurTab) {
    this.activeTab = tab;
    if (tab === 'suivi') {
      this.naviguerKanban();
    }
  }

  onCategorySelect(cat: string) {
    this.selectedCategory = cat;
  }

  onAddToCart(product: ProductItem) {
    const existing = this.cart.items.find(i => i.boissonId === product.id);
    if (existing) {
      existing.quantite++;
    } else {
      this.cart.items.push({
        boissonId: product.id,
        nom: product.nom,
        prix: product.prix,
        quantite: 1,
        typeBoisson: product.categorie,
      });
    }
    this.cart = { ...this.cart };
  }

  onCartQuantityChanged(event: { item: CartItemModel; newQty: number }) {
    event.item.quantite = event.newQty;
    this.cart = { ...this.cart };
  }

  onCartItemRemoved(item: CartItemModel) {
    this.cart.items = this.cart.items.filter(i => i.boissonId !== item.boissonId);
    this.cart = { ...this.cart };
  }

  onTableSelectForOrder(tableId: number) {
    this.cart.tableId = tableId;
    const found = this.tables.find(t => t.id === tableId);
    if (found) {
      this.cart.tableNumero = found.id;
    }
    this.cart = { ...this.cart };
  }

  onNewOrderForTable(table: TableView) {
    this.onTableSelectForOrder(table.id);
    this.activeTab = 'commande';
  }

  async onSubmitCart() {
    if (!this.cart.tableId || this.cart.items.length === 0) return;

    const toast = await this.toastCtrl.create({
      message: `Commande envoyée pour la Table #${this.cart.tableId}`,
      duration: 2500,
      color: 'success',
    });
    await toast.present();

    this.cart = { tableId: null, items: [] };
  }

  onClearCart() {
    this.cart = { tableId: null, items: [] };
  }

  onRefresh(event: { target?: { complete: () => void } }) {
    this.chargerTables(event);
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }
}
