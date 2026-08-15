import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, NgZone, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
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
  checkmarkCircleOutline, closeCircleOutline, peopleOutline, wineOutline,
  nutritionOutline, eggOutline, leafOutline, sparklesOutline, flameOutline,
  waterOutline, beerOutline, fastFoodOutline, searchOutline,
  addOutline, removeOutline, locateOutline,
} from 'ionicons/icons';
import { CocktailService } from '../../core/services/cocktail.service';
import { ZoneService, ZoneBar } from '../../core/services/zone.service';
import { TableDetailModalComponent } from './components/table-detail-modal/table-detail-modal.component';
import { EncaissementModalComponent } from './components/encaissement-modal/encaissement-modal.component';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardServeurService, EtageItem, ZoneItem } from './services/dashboard-serveur.service';
import { safeCompleteRefresher } from '../../core/utils/refresher-utils';
import { fastModalEnterAnimation, fastModalLeaveAnimation } from '../../core/utils/modal-animation.utils';
import { TableView } from './models/table-view.model';
import { TablePosition, ZoneArea } from '../plan-salle/models/table-position.model';
import { PlanSalleService } from '../plan-salle/services/plan-salle.service';

import { Store } from '@ngrx/store';
import { selectCurrentUser } from '../../core/store/auth.selectors';

import { VariantSelectionModalComponent } from './components/variant-selection-modal/variant-selection-modal.component';
import { ItemCustomizationModalComponent } from './components/item-customization-modal/item-customization-modal.component';

// ─── Plan constants — matches plan-salle.component.ts exactly ────────────────
const DEFAULT_TABLE_SIZE = 90;
const PLAN_TABLE_SIZE = 90;
const PLAN_GAP = 60;
const PLAN_MARGIN = 80;
const PLAN_COLS = 5;

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

import { CommandeListComponent } from '../commandes/commande-list/commande-list.component';

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
    FormsModule,
    IonContent, IonHeader, IonToolbar,
    IonRefresher, IonRefresherContent,
    IonSearchbar, IonIcon,
    MobileTableCardComponent,
    BottomNavigationComponent,
    ProductCardComponent,
    CartDrawerComponent,
    CommandeListComponent,
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
  selectedZones: string[] = [];
  sortOption: DashboardSortOption = 'NUMBER_ASC';
  displayMode: DashboardViewMode = 'BY_ZONE';

  etagesList: EtageItem[] = [];
  zonesList: ZoneItem[] = [];

  isLoading = false;
  activeTab: ServeurTab = 'tables';
  selectedCategory = 'ALL';
  productSearchQuery = '';
  selectedAllergens: string[] = [];
  canSeeLowStock = false;

  readonly availableAllergens = [
    { key: 'LAIT', label: 'Sans Lait / Lactose', icon: 'nutrition-outline', keywords: ['lait', 'creme', 'crème', 'cream', 'beurre', 'lactose', 'baileys', 'yaourt', 'fromage'] },
    { key: 'GLUTEN', label: 'Sans Gluten', icon: 'leaf-outline', keywords: ['biere', 'bière', 'beer', 'whisky', 'whiskey', 'orge', 'seigle', 'ble', 'blé', 'gluten'] },
    { key: 'OEUF', label: 'Sans Œufs', icon: 'egg-outline', keywords: ['oeuf', 'œuf', 'egg', 'albumine'] },
    { key: 'FRUITS_A_COQUE', label: 'Sans Fruits à coque', icon: 'nutrition-outline', keywords: ['amande', 'almond', 'amaretto', 'noisette', 'hazelnut', 'noix', 'walnut', 'pistache', 'pistachio', 'cashew', 'anacarde'] },
    { key: 'ARACHIDE', label: 'Sans Arachides', icon: 'nutrition-outline', keywords: ['arachide', 'peanut', 'cacahuete', 'cacahuète'] },
    { key: 'SULFITES', label: 'Sans Sulfites', icon: 'wine-outline', keywords: ['vin', 'wine', 'champagne', 'prosecco', 'vermouth', 'sulfite', 'sulfites', 'cidre', 'cider', 'aperol', 'campari'] },
    { key: 'SOJA', label: 'Sans Soja', icon: 'leaf-outline', keywords: ['soja', 'soy', 'tofu'] },
  ];

  cart: CartModel = { tableId: null, items: [] };

  products: ProductItem[] = [
    {
      id: 1,
      nom: 'Mojito Traditional',
      prix: 8.5,
      categorie: 'COCKTAIL',
      stock: 15,
      stockStatus: 'NORMAL',
      description: 'Rhum blanc, Menthe fraîche, Citron vert, Sucre, Eau gazeuse, Glaçons',
      ingredients: ['Rhum blanc', 'Menthe fraîche', 'Citron vert', 'Sucre', 'Eau gazeuse', 'Glaçons'],
      variantes: [
        { nom: 'Verre (33cl)', prix: 8.5 },
        { nom: 'Pitcher (1L)', prix: 24.0 },
      ]
    },
    {
      id: 2,
      nom: 'Pinte Blonde Pression',
      prix: 6.0,
      categorie: 'BEER',
      stock: 40,
      stockStatus: 'NORMAL',
      description: 'Blonde artisanale 5%',
      variantes: [
        { nom: 'Demi (25cl)', prix: 3.5 },
        { nom: 'Pinte (50cl)', prix: 6.0 },
        { nom: 'Pitcher (1.5L)', prix: 16.0 },
      ]
    },
    { id: 3, nom: 'Cocktail Signature OpenBar', prix: 10.0, categorie: 'COCKTAIL', stock: 5, stockStatus: 'FAIBLE', description: 'Gin infusé, tonic premium', ingredients: ['Gin infusé', 'Tonic premium', 'Glaçons', 'Zeste de concombre'] },
    { id: 4, nom: 'Limonade Maison', prix: 4.5, categorie: 'SOFT', stock: 25, stockStatus: 'NORMAL', description: 'Citron pressé & sirop d\'agave', ingredients: ['Citron pressé', 'Sirop d\'agave', 'Eau gazeuse', 'Glaçons'] },
    { id: 5, nom: 'Planche de Nachos & Guacamole', prix: 9.0, categorie: 'SNACK', stock: 8, stockStatus: 'NORMAL', description: 'Cheddar fondu et sauces maison' },
    { id: 6, nom: 'Shot Tequila Special', prix: 4.0, categorie: 'SHOT', stock: 3, stockStatus: 'CRITIQUE', description: 'Tequila reposado' },
  ];

  private stage?: Konva.Stage;
  private zoneLayer?: Konva.Layer;
  private layer?: Konva.Layer;
  zoneAreas: ZoneArea[] = [];
  zoomScale = 1;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly service: DashboardServeurService,
    private readonly planSalleService: PlanSalleService,
    private readonly zoneService: ZoneService,
    private readonly cocktailService: CocktailService,
    private readonly store: Store,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly notificationService: NotificationService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {
    addIcons({
      listOutline, gridOutline, mapOutline, funnelOutline, layersOutline,
      businessOutline, swapVerticalOutline, refreshOutline, restaurantOutline,
      checkmarkCircleOutline, closeCircleOutline, peopleOutline, wineOutline,
      nutritionOutline, eggOutline, leafOutline, sparklesOutline, flameOutline,
      waterOutline, beerOutline, fastFoodOutline, searchOutline,
      addOutline, removeOutline, locateOutline,
    });
  }

  private static readonly FILTER_STORAGE_KEY = 'openbar_serveur_dashboard_filters';

  ngOnInit() {
    this.chargerFiltresSauvegardes();
    this.chargerDonnees();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['tableId']) {
          const tableId = +params['tableId'];
          this.onTableSelectForOrder(tableId);
          this.activeTab = 'commande';
          this.cdr.detectChanges();
        }
        if (params['tab'] === 'suivi' || params['tab'] === 'kanban') {
          this.activeTab = 'suivi';
          this.cdr.detectChanges();
        }
      });

    this.store.select(selectCurrentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.canSeeLowStock = user?.roles?.some(r => r === 'BARMAN' || r === 'MANAGER' || r === 'ADMIN') ?? false;
        this.cdr.detectChanges();
      });

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
      zones:     this.zoneService.getAll().pipe(catchError(() => this.service.getZones())),
      positions: this.planSalleService.getPositions(),
      cocktails: this.cocktailService.getAll(),
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }),
    )
    .subscribe({
      next: ({ tables, etages, zones, positions, cocktails }) => {
        this.etagesList = etages;
        const rawZones = (zones || []) as ZoneBar[];
        this.zonesList = rawZones.map(z => ({ id: z.id ?? 0, nom: z.nom, etage: z.etage }));
        this.synchroniserZonesAvecBackend(rawZones);

        if (cocktails && cocktails.length > 0) {
          this.products = cocktails.map(c => ({
            id: c.id,
            nom: c.nom,
            prix: c.prix,
            categorie: c.categorie,
            description: c.ingredients && c.ingredients.length > 0
              ? c.ingredients.map(i => i.ingredientNom).join(' · ')
              : (c.description || ''),
            image: c.imageUrl,
            stockStatus: c.disponible ? 'NORMAL' : 'CRITIQUE',
            ingredients: c.ingredients,
          }));
        }

        this.positionsMap.clear();
        positions.forEach(p => this.positionsMap.set(p.tableId, p));

        this.tables = tables.map((t, idx) => {
          const pos = this.positionsMap.get(t.id);
          const zoneObj = this.zonesList.find(z => z.nom.toLowerCase() === (t.zone || '').toLowerCase());
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
      const selectedNorm = this.normalizeFloorCode(this.selectedEtage);
      result = result.filter(t => {
        const pos = this.positionsMap.get(t.id);
        return this.resolveTableFloor(t, pos) === selectedNorm;
      });
    }

    // Zone filter
    if (this.selectedZones.length > 0) {
      const lowerSelected = new Set(this.selectedZones.map(z => z.toLowerCase()));
      result = result.filter(t => t.zone && lowerSelected.has(t.zone.toLowerCase()));
    } else if (this.selectedZone !== 'ALL' && this.selectedZone !== 'MULTI') {
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
      if (!saved) return;
      const parsed = JSON.parse(saved);
      this.appliquerFiltresSauvegardes(parsed);
    } catch {
      // Fallback cleanly on error
    }
  }

  private appliquerFiltresSauvegardes(parsed: Record<string, any>) {
    if (parsed['searchTerm'] !== undefined) this.searchTerm = parsed['searchTerm'];
    if (parsed['selectedStatus']) this.selectedStatus = parsed['selectedStatus'];
    if (parsed['selectedEtage']) this.selectedEtage = parsed['selectedEtage'];
    if (parsed['selectedZone']) this.selectedZone = parsed['selectedZone'];
    if (Array.isArray(parsed['selectedZones'])) {
      this.selectedZones = parsed['selectedZones'];
    } else if (parsed['selectedZone'] && parsed['selectedZone'] !== 'ALL') {
      this.selectedZones = [parsed['selectedZone']];
    }
    if (parsed['sortOption']) this.sortOption = parsed['sortOption'];
    if (parsed['displayMode']) this.displayMode = parsed['displayMode'];
  }

  private sauvegarderFiltres() {
    try {
      const config = {
        searchTerm: this.searchTerm,
        selectedStatus: this.selectedStatus,
        selectedEtage: this.selectedEtage,
        selectedZone: this.selectedZone,
        selectedZones: this.selectedZones,
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
        const pos = this.positionsMap.get(table.id);
        const key = this.resolveTableFloor(table, pos);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(table);
      }
      return Array.from(map.entries()).map(([etageCode, tables]) => {
        const etageObj = this.etagesList.find(e => this.normalizeFloorCode(e.code) === etageCode);
        let title = etageCode;
        if (etageObj?.nom) {
          title = etageObj.nom;
        } else if (etageCode === 'RDC') {
          title = 'Rez-de-chaussée';
        }
        return {
          key: etageCode,
          title,
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
      const zoneObj = this.zonesList.find(z => z.nom.toLowerCase() === zoneName.toLowerCase());
      const etageObj = zoneObj ? this.etagesList.find(e => this.normalizeFloorCode(e.code) === this.normalizeFloorCode(zoneObj.etage)) : undefined;
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
    const selectedNorm = this.normalizeFloorCode(this.selectedEtage);
    return this.zonesList.filter(z => this.normalizeFloorCode(z.etage) === selectedNorm);
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
    this.selectedZones = val === 'ALL' ? [] : [val];
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
    this.filtrer();
    this.cdr.detectChanges();
    if (mode === 'PLAN') {
      setTimeout(() => this.initOrUpdateKonva(), 80);
    }
  }

  onEtageSelectChangeDirect(code: string) {
    this.selectedEtage = code;
    this.selectedZones = [];
    this.selectedZone = 'ALL';
    this.filtrer();
  }

  onZoneSelectChangeDirect(zoneNom: string) {
    if (zoneNom === 'ALL') {
      this.clearZoneFilter();
    } else {
      this.toggleZone(zoneNom);
    }
  }

  /** Toggles a zone in the multi-select zone filter. */
  toggleZone(zoneNom: string) {
    const idx = this.selectedZones.indexOf(zoneNom);
    if (idx >= 0) {
      this.selectedZones.splice(idx, 1);
    } else {
      this.selectedZones.push(zoneNom);
    }
    this.updateSelectedZoneState();
    this.filtrer();
  }

  private updateSelectedZoneState() {
    if (this.selectedZones.length === 1) {
      this.selectedZone = this.selectedZones[0];
    } else if (this.selectedZones.length === 0) {
      this.selectedZone = 'ALL';
    } else {
      this.selectedZone = 'MULTI';
    }
  }

  /** Clears all zone selection (shows All Zones). */
  clearZoneFilter() {
    this.selectedZones = [];
    this.selectedZone = 'ALL';
    this.filtrer();
  }

  isZoneSelected(zoneNom: string): boolean {
    return this.selectedZones.includes(zoneNom);
  }

  // ─── KONVA 2D FLOOR PLAN RENDERER ──────────────────────────────────────────

  private normalizeFloorCode(raw?: string): string {
    if (!raw) return 'RDC';
    const val = raw.trim().toUpperCase();
    if (val === 'RDC' || val.includes('REZ')) return 'RDC';
    if (val === 'ETAGE_1' || val.includes('1ER') || val.includes('1ÉTAGE') || val.includes('1ETAGE')) return 'ETAGE_1';
    if (val === 'ETAGE_2' || val.includes('2ÈME') || val.includes('2EME') || val.includes('ROOFTOP')) return 'ETAGE_2';
    return val;
  }

  private resolveTableFloor(t: TableView, pos?: TablePosition): string {
    const zoneName = pos?.zone || t.zone;
    if (zoneName) {
      const z = this.zonesList.find(zItem => zItem.nom.toLowerCase() === zoneName.toLowerCase());
      if (z?.etage) return this.normalizeFloorCode(z.etage);
    }
    if (t.etage) return this.normalizeFloorCode(t.etage);
    if (pos?.floor) return this.normalizeFloorCode(pos.floor);
    return 'RDC';
  }

  private synchroniserZonesAvecBackend(backendZones: ZoneBar[]) {
    this.zoneAreas = [];
    backendZones.forEach((backendZone, idx) => {
      const zoneEtageNormalized = this.normalizeFloorCode(backendZone.etage);
      let parsedPoints: number[] | undefined;
      let parsedRadii: [number, number, number, number] | undefined;

      if (backendZone.pointsJson) {
        try {
          parsedPoints = JSON.parse(backendZone.pointsJson);
        } catch {
          parsedPoints = undefined;
        }
      }
      if (backendZone.cornerRadiiJson) {
        try {
          parsedRadii = JSON.parse(backendZone.cornerRadiiJson);
        } catch {
          parsedRadii = undefined;
        }
      }

      this.zoneAreas.push({
        id: `za-${backendZone.id}`,
        nom: backendZone.nom,
        etage: zoneEtageNormalized,
        x: backendZone.planX ?? (140 + (idx % 3) * 380),
        y: backendZone.planY ?? (140 + Math.floor(idx / 3) * 280),
        width: backendZone.planWidth ?? 400,
        height: backendZone.planHeight ?? 280,
        shapeType: backendZone.shapeType ?? 'rect',
        points: parsedPoints,
        cornerRadii: parsedRadii ?? [16, 16, 16, 16],
        couleur: backendZone.couleur ?? '#6c7fe8',
      });
    });
  }

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

  private initOrUpdateKonva() {
    const container = this.konvaContainerRef?.nativeElement;
    if (!container) return;

    const width = container.offsetWidth || 800;
    const height = Math.max(520, container.offsetHeight || 550);

    if (this.stage && this.stage.container() !== container) {
      this.stage.destroy();
      this.stage = null as any;
    }

    if (!this.stage) {
      this.ngZone.runOutsideAngular(() => {
        this.stage = new Konva.Stage({
          container,
          width,
          height,
          draggable: true,
        });

        this.zoneLayer = new Konva.Layer();
        this.layer = new Konva.Layer();
        this.stage.add(this.zoneLayer, this.layer);

        this.stage.on('dragmove', () => this.syncGridPosition());

        this.stage.on('wheel', (e) => {
          e.evt.preventDefault();
          const scaleBy = 1.05;
          const oldScale = this.stage!.scaleX();
          const pointer = this.stage!.getPointerPosition();
          if (!pointer) return;

          const mousePointTo = {
            x: (pointer.x - this.stage!.x()) / oldScale,
            y: (pointer.y - this.stage!.y()) / oldScale,
          };

          const direction = e.evt.deltaY > 0 ? -1 : 1;
          const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
          const clampedScale = Math.max(0.3, Math.min(2.5, newScale));

          this.stage!.scale({ x: clampedScale, y: clampedScale });
          const newPos = {
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
          };
          this.stage!.position(newPos);
          this.stage!.batchDraw();
          this.syncGridPosition();
        });
      });
    } else {
      this.stage.width(width);
      this.stage.height(height);
    }

    this.renderKonvaPlan();
  }

  private renderKonvaPlan() {
    if (!this.layer || !this.zoneLayer) return;

    this.ngZone.runOutsideAngular(() => {
      this.dessinerZones();
      this.dessinerTables();
    });
  }

  private dessinerZones() {
    if (!this.zoneLayer) return;
    this.zoneLayer.destroyChildren();

    const selectedFloorNorm = this.selectedEtage === 'ALL' ? 'RDC' : this.normalizeFloorCode(this.selectedEtage);
    const zonesToDraw = this.zoneAreas.filter(z => {
      const matchesFloor = this.normalizeFloorCode(z.etage) === selectedFloorNorm;
      const matchesZone = this.selectedZones.length === 0 || this.selectedZones.some(sz => sz.toLowerCase() === z.nom.toLowerCase());
      return matchesFloor && matchesZone;
    });

    zonesToDraw.forEach(zone => {
      const color = zone.couleur || '#6c7fe8';
      const zoneFill = color.startsWith('#')
        ? `rgba(${Number.parseInt(color.slice(1, 3), 16)}, ${Number.parseInt(color.slice(3, 5), 16)}, ${Number.parseInt(color.slice(5, 7), 16)}, 0.08)`
        : 'rgba(108, 127, 232, 0.08)';

      const group = new Konva.Group({
        x: zone.x,
        y: zone.y,
        name: `zone-group-${zone.id}`,
      });

      let shapeNode: Konva.Shape;
      if (zone.shapeType === 'polygon' && zone.points && zone.points.length >= 6) {
        const pathData = this.buildPolygonPathData(zone.points, zone.cornerRadii);
        shapeNode = new Konva.Path({
          data: pathData,
          fill: zoneFill,
          stroke: color,
          strokeWidth: 1.5,
          dash: [6, 6],
          name: 'zone-shape',
        });
      } else {
        const radii = zone.cornerRadii || [16, 16, 16, 16];
        shapeNode = new Konva.Rect({
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

      const label = new Konva.Text({
        text: `📍 ${zone.nom.toUpperCase()}`,
        fontSize: 12,
        fontStyle: 'bold',
        fill: color,
        x: zone.labelX ?? defaultX,
        y: zone.labelY ?? defaultY,
        name: 'zone-label',
      });

      group.add(shapeNode, label);
      this.zoneLayer!.add(group);
    });

    this.zoneLayer.batchDraw();
  }

  private getTableColors(table: TableView, waitTime: number): { mainColor: string; fillColor: string } {
    if ((table as any).reservee === true) {
      return { mainColor: '#9b8af2', fillColor: 'rgba(155, 138, 242, 0.16)' };
    }
    if (table.occupee) {
      if (waitTime > 20) {
        return { mainColor: '#e5604f', fillColor: 'rgba(229, 96, 79, 0.16)' };
      }
      return { mainColor: '#f0a33b', fillColor: 'rgba(240, 163, 59, 0.16)' };
    }
    return { mainColor: '#2fbf6b', fillColor: 'rgba(47, 191, 107, 0.16)' };
  }

  private calculateLabelOffsets(hasCap: boolean, hasWaitTime: boolean): { titleY: number; capY: number; badgeY: number } {
    if (hasCap && hasWaitTime) return { titleY: -22, capY: -6, badgeY: 12 };
    if (hasCap) return { titleY: -14, capY: 4, badgeY: 12 };
    if (hasWaitTime) return { titleY: -14, capY: 0, badgeY: 4 };
    return { titleY: -8, capY: 0, badgeY: 0 };
  }

  private createTableShape(shapeType: string, width: number, height: number, mainColor: string, fillColor: string): Konva.Shape {
    if (shapeType === 'circle') {
      return new Konva.Ellipse({
        radiusX: width / 2,
        radiusY: height / 2,
        fill: fillColor,
        stroke: mainColor,
        strokeWidth: 2,
        name: 'forme',
      });
    }
    return new Konva.Rect({
      width,
      height,
      offsetX: width / 2,
      offsetY: height / 2,
      cornerRadius: 8,
      fill: fillColor,
      stroke: mainColor,
      strokeWidth: 2,
      name: 'forme',
    });
  }

  private createTableLabelGroup(
    table: TableView,
    width: number,
    rotation: number,
    waitTime: number,
    mainColor: string
  ): Konva.Group {
    const labelGroup = new Konva.Group({
      rotation: -rotation,
      name: 'label-group',
    });

    const hasWaitTime = table.occupee && waitTime > 0;
    const hasCap = !!table.capacite;
    const { titleY, capY, badgeY } = this.calculateLabelOffsets(hasCap, hasWaitTime);

    const titleText = new Konva.Text({
      text: `T${table.nom ? table.nom.replace(/^Table\s*/i, '') : table.id}`,
      fontSize: 13,
      fontStyle: 'bold',
      fill: '#ffffff',
      align: 'center',
      width,
      x: -width / 2,
      y: titleY,
      name: 'label-title',
      listening: false,
    });
    labelGroup.add(titleText);

    if (hasCap) {
      const subText = new Konva.Text({
        text: `${table.capacite} pers`,
        fontSize: 11,
        fontStyle: 'normal',
        fill: '#a4add0',
        align: 'center',
        width,
        x: -width / 2,
        y: capY,
        name: 'label-sub',
        listening: false,
      });
      labelGroup.add(subText);
    }

    if (hasWaitTime) {
      const badgeWidth = 38;
      const badgeHeight = 15;
      const badgeBg = new Konva.Rect({
        x: -badgeWidth / 2,
        y: badgeY,
        width: badgeWidth,
        height: badgeHeight,
        cornerRadius: 7,
        fill: 'rgba(0, 0, 0, 0.75)',
        stroke: mainColor,
        strokeWidth: 1,
      });
      const badgeTxt = new Konva.Text({
        text: `${waitTime}m`,
        fontSize: 9,
        fontStyle: 'bold',
        fill: '#ffffff',
        x: -badgeWidth / 2,
        y: badgeY + 2.5,
        width: badgeWidth,
        align: 'center',
      });
      labelGroup.add(badgeBg, badgeTxt);
    }

    return labelGroup;
  }

  private dessinerTables() {
    if (!this.layer) return;
    this.layer.destroyChildren();

    const selectedFloorNorm = this.selectedEtage === 'ALL' ? 'RDC' : this.normalizeFloorCode(this.selectedEtage);
    const tablesToDraw = this.filteredTables.filter(t => {
      const pos = this.positionsMap.get(t.id);
      const tableFloor = this.resolveTableFloor(t, pos);
      return tableFloor === selectedFloorNorm;
    });

    tablesToDraw.forEach(table => {
      const pos = this.positionsMap.get(table.id);
      const W = pos?.width || DEFAULT_TABLE_SIZE;
      const H = pos?.height || DEFAULT_TABLE_SIZE;
      const posX = pos?.x ?? (table.planX ?? PLAN_MARGIN);
      const posY = pos?.y ?? (table.planY ?? PLAN_MARGIN);
      const rotation = pos?.rotation ?? (table.planRotation ?? 0);
      const shapeType = pos?.shape ?? (table.planForme === 'ROND' ? 'circle' : 'rect');
      const waitTime = this.getWaitTimeMinutes(table);

      const { mainColor, fillColor } = this.getTableColors(table, waitTime);

      const group = new Konva.Group({
        x: posX,
        y: posY,
        rotation,
        name: `table-group-${table.id}`,
      });

      const shapeNode = this.createTableShape(shapeType, W, H, mainColor, fillColor);
      const labelGroup = this.createTableLabelGroup(table, W, rotation, waitTime, mainColor);

      group.add(shapeNode, labelGroup);

      group.on('mouseenter', () => {
        const el = this.konvaContainerRef?.nativeElement;
        if (el) el.style.cursor = 'pointer';
        group.to({ scaleX: 1.05, scaleY: 1.05, duration: 0.1 });
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

    this.layer!.batchDraw();
  }

  // ─── Zoom & View Navigation Controls ─────────────────────────────────────

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
    const oldScale = this.stage?.scaleX() || 1;
    const mousePointTo = {
      x: (center.x - (this.stage?.x() || 0)) / oldScale,
      y: (center.y - (this.stage?.y() || 0)) / oldScale,
    };

    const newScale = Math.max(0.3, Math.min(2.5, oldScale * factor));
    this.stage?.scale({ x: newScale, y: newScale });
    const newPos = {
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    };
    this.stage?.position(newPos);
    this.stage?.batchDraw();
    this.syncGridPosition();
    this.cdr.detectChanges();
  }

  private syncGridPosition() {
    const container = this.konvaContainerRef?.nativeElement;
    if (!container || !this.stage) return;

    const posX = this.stage.x();
    const posY = this.stage.y();
    const scale = this.stage.scaleX();

    const scaledGridSize = 50 * scale;
    container.style.backgroundPosition = `${posX}px ${posY}px`;
    container.style.backgroundSize = `${scaledGridSize}px ${scaledGridSize}px`;
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
    } else if (data?.action === 'encaisser') {
      this.ouvrirEncaissement(data.table || table);
    }
  }

  /**
   * Opens the full table encaissement and payment modal.
   *
   * @param table Target table to settle.
   */
  async ouvrirEncaissement(table: TableView) {
    const modal = await this.modalCtrl.create({
      component: EncaissementModalComponent,
      componentProps: { table },
      cssClass: 'encaissement-modal-container',
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.action === 'settled') {
      this.chargerTables();
    }
  }

  naviguerKanban() {
    this.activeTab = 'suivi';
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
    const query = this.productSearchQuery.toLowerCase().trim();
    return this.products.filter(p => {
      const matchesSearch = !query ||
        p.nom.toLowerCase().includes(query) ||
        (p.description?.toLowerCase()?.includes(query) ?? false);

      const matchesCategory = this.selectedCategory === 'ALL' || p.categorie === this.selectedCategory;

      let matchesAllergens = true;
      if (this.selectedAllergens.length > 0) {
        const itemAllergens = this.getProductAllergens(p);
        matchesAllergens = !this.selectedAllergens.some(a => itemAllergens.includes(a));
      }

      return matchesSearch && matchesCategory && matchesAllergens;
    });
  }

  getProductAllergens(product: ProductItem): string[] {
    const textToSearch = [
      product.nom,
      product.description || '',
      ...(product.ingredients ? product.ingredients.map((i: any) => i.ingredientNom) : [])
    ].join(' ').toLowerCase();

    return this.availableAllergens
      .filter(allergen => allergen.keywords.some(kw => textToSearch.includes(kw)))
      .map(allergen => allergen.key);
  }

  toggleAllergenFilter(allergenKey: string): void {
    const idx = this.selectedAllergens.indexOf(allergenKey);
    if (idx >= 0) {
      this.selectedAllergens.splice(idx, 1);
    } else {
      this.selectedAllergens.push(allergenKey);
    }
  }

  clearAllergenFilters(): void {
    this.selectedAllergens = [];
  }

  getCategoryDotColor(category: string): string {
    switch (category) {
      case 'ALCOOLISE': return '#10b981';
      case 'SANS_ALCOOL': return '#06b6d4';
      case 'SHOT': return '#84cc16';
      case 'APERITIF': return '#f97316';
      case 'DIGESTIF': return '#ef4444';
      case 'SPECIAL': return '#eab308';
      case 'COCKTAIL': return '#ff8800';
      case 'BEER': return '#ffd900';
      case 'SOFT': return '#00aaff';
      case 'SNACK': return '#3b82f6';
      default: return '#6366f1';
    }
  }

  getCategoryPillStyle(category: string, isActive = false): Record<string, string> {
    const color = this.getCategoryDotColor(category);
    if (isActive) {
      return {
        'background-color': color,
        'border-color': color,
        'color': '#ffffff',
        'box-shadow': `0 4px 14px ${color}66`
      };
    }
    return {};
  }

  get cartTotalCount(): number {
    return this.cart.items.reduce((sum, item) => sum + item.quantite, 0);
  }

  onTabSelected(tab: ServeurTab) {
    this.activeTab = tab;
  }

  onCategorySelect(cat: string) {
    this.selectedCategory = cat;
  }

  async onAddToCart(product: ProductItem) {
    if (product.variantes && product.variantes.length > 0) {
      const modal = await this.modalCtrl.create({
        component: VariantSelectionModalComponent,
        componentProps: { product },
      });
      await modal.present();
      const { data, role } = await modal.onWillDismiss();
      if (role === 'confirm' && data?.selectedVariant) {
        this.pushItemToCart(product, data.selectedVariant.nom, data.selectedVariant.prix);
      }
      return;
    }
    this.pushItemToCart(product, undefined, product.prix);
  }

  async onCustomizeProduct(product: ProductItem) {
    let varianteNom: string | undefined;
    let prix = product.prix;

    if (product.variantes && product.variantes.length > 0) {
      const vModal = await this.modalCtrl.create({
        component: VariantSelectionModalComponent,
        componentProps: { product },
      });
      await vModal.present();
      const { data: vData, role: vRole } = await vModal.onWillDismiss();
      if (vRole !== 'confirm' || !vData?.selectedVariant) return;
      varianteNom = vData.selectedVariant.nom;
      prix = vData.selectedVariant.prix;
    }

    const cModal = await this.modalCtrl.create({
      component: ItemCustomizationModalComponent,
      componentProps: { product, variantNom: varianteNom },
    });
    await cModal.present();
    const { data: cData, role: cRole } = await cModal.onWillDismiss();
    if (cRole === 'confirm' && cData) {
      this.pushItemToCart(product, varianteNom, prix, cData.commentaire, cData.exclusions);
    }
  }

  async onEditCartItemCustomization(cartItem: CartItemModel) {
    const product = this.products.find(p => p.id === cartItem.boissonId) || {
      id: cartItem.boissonId,
      nom: cartItem.nom,
      prix: cartItem.prix,
      categorie: cartItem.typeBoisson || 'COCKTAIL',
    };

    const modal = await this.modalCtrl.create({
      component: ItemCustomizationModalComponent,
      componentProps: {
        product,
        variantNom: cartItem.varianteNom,
        initialCommentaire: cartItem.commentaire,
        initialExclusions: cartItem.exclusions || [],
      },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      cartItem.commentaire = data.commentaire;
      cartItem.exclusions = data.exclusions;
      this.cart = { ...this.cart };
      this.cdr.detectChanges();
    }
  }

  private pushItemToCart(product: ProductItem, varianteNom?: string, prix?: number, commentaire?: string, exclusions?: string[]) {
    const itemPrice = prix ?? product.prix;
    const existing = this.cart.items.find(i =>
      i.boissonId === product.id &&
      i.varianteNom === varianteNom &&
      i.commentaire === commentaire &&
      JSON.stringify(i.exclusions || []) === JSON.stringify(exclusions || [])
    );

    if (existing) {
      existing.quantite++;
    } else {
      this.cart.items.push({
        boissonId: product.id,
        nom: product.nom,
        prix: itemPrice,
        quantite: 1,
        typeBoisson: product.categorie,
        varianteNom,
        commentaire,
        exclusions,
      });
    }
    this.cart = { ...this.cart };
    this.cdr.detectChanges();
  }

  onCartQuantityChanged(event: { item: CartItemModel; newQty: number }) {
    event.item.quantite = event.newQty;
    this.cart = { ...this.cart };
  }

  onCartItemRemoved(item: CartItemModel) {
    this.cart.items = this.cart.items.filter(i =>
      !(i.boissonId === item.boissonId && i.varianteNom === item.varianteNom && i.commentaire === item.commentaire)
    );
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
