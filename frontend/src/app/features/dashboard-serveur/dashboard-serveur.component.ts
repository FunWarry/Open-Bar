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
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonLabel,
  IonButtons, IonButton, IonIcon,
  ToastController, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { listOutline, gridOutline, mapOutline, funnelOutline, layersOutline, refreshOutline } from 'ionicons/icons';
import { TableDetailModalComponent } from './components/table-detail-modal/table-detail-modal.component';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardServeurService, EtageItem, ZoneItem } from './services/dashboard-serveur.service';
import { safeCompleteRefresher } from '../../core/utils/refresher-utils';
import { TableView } from './models/table-view.model';
import { TablePosition } from '../plan-salle/models/table-position.model';

import { MobileTableCardComponent } from './components/mobile-table-card/mobile-table-card.component';
import { BottomNavigationComponent, ServeurTab } from './components/bottom-navigation/bottom-navigation.component';
import { ProductCardComponent, ProductItem } from './components/product-card/product-card.component';
import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { CartModel, CartItemModel } from './models/cart.model';
import { FilterChipComponent } from '../../core/components/ui/filter-chip/filter-chip.component';

/**
 * Main dashboard component for waiters providing table list overview,
 * 2D interactive floor plan visualization (Konva.js), zone/floor filtering,
 * rapid order entry, and real-time STOMP notification synchronization.
 */
@Component({
  selector: 'app-dashboard-serveur',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonRefresher, IonRefresherContent,
    IonSegment, IonSegmentButton, IonLabel,
    IonButtons, IonButton, IonIcon,
    MobileTableCardComponent,
    BottomNavigationComponent,
    ProductCardComponent,
    CartDrawerComponent,
    FilterChipComponent,
  ],
  templateUrl: './dashboard-serveur.component.html',
  styleUrls: ['./dashboard-serveur.component.scss'],
})
export class DashboardServeurComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('konvaFloorPlanContainer') konvaContainerRef!: ElementRef<HTMLDivElement>;

  tables: TableView[] = [];
  filteredTables: TableView[] = [];
  positionsMap = new Map<number, TablePosition>();

  selectedFilter = 'toutes';
  selectedEtage = 'TOUS';
  selectedZone = 'TOUTES';
  viewMode: 'grid' | 'plan' = 'grid';

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
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
    private readonly router: Router,
    private readonly notificationService: NotificationService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {
    addIcons({ listOutline, gridOutline, mapOutline, funnelOutline, layersOutline, refreshOutline });
  }

  ngOnInit() {
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
    if (this.viewMode === 'plan') {
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
      tables: this.service.getAllTables(),
      etages: this.service.getEtages(),
      zones: this.service.getZones(),
      positions: this.service.getPlanSallePositions(),
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

        // Synchronisation des positions & étage sur les tables
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
    this.filteredTables = this.tables.filter(table => {
      // 1. Filtre statut occupation
      if (this.selectedFilter === 'occupees' && !table.occupee) return false;
      if (this.selectedFilter === 'libres' && table.occupee) return false;

      // 2. Filtre par Étage
      if (this.selectedEtage !== 'TOUS' && (table.etage || 'RDC') !== this.selectedEtage) return false;

      // 3. Filtre par Zone
      if (this.selectedZone !== 'TOUTES' && table.zone !== this.selectedZone) return false;

      return true;
    });

    if (this.viewMode === 'plan') {
      this.renderKonvaPlan();
    }
  }

  get countOccupees(): number {
    return this.tables.filter(t => t.occupee).length;
  }

  get countLibres(): number {
    return this.tables.filter(t => !t.occupee).length;
  }

  get uniqueZoneNames(): string[] {
    const set = new Set<string>();
    this.tables.forEach(t => { if (t.zone) set.add(t.zone); });
    return Array.from(set);
  }

  getWaitTimeMinutes(table: TableView): number {
    if (!table.occupee) return 0;
    return ((table.id * 7) % 25) + 5;
  }

  onSegmentChange(event: { detail?: { value?: any } }) {
    this.selectedFilter = String(event.detail?.value || 'toutes');
    this.filtrer();
  }

  onEtageFilterChange(etageCode: string) {
    this.selectedEtage = etageCode;
    this.filtrer();
  }

  onZoneFilterChange(zoneNom: string) {
    this.selectedZone = zoneNom;
    this.filtrer();
  }

  onViewModeToggle(mode: 'grid' | 'plan') {
    this.viewMode = mode;
    if (mode === 'plan') {
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

      const stageWidth = this.stage?.width() || 800;
      const stageHeight = this.stage?.height() || 550;

      // 1. Grille millimétrée d'arrière-plan
      const gridGroup = new Konva.Group();
      const gridSize = 40;
      for (let x = 0; x < stageWidth; x += gridSize) {
        gridGroup.add(new Konva.Line({ points: [x, 0, x, stageHeight], stroke: 'rgba(255, 255, 255, 0.04)', strokeWidth: 1 }));
      }
      for (let y = 0; y < stageHeight; y += gridSize) {
        gridGroup.add(new Konva.Line({ points: [0, y, stageWidth, y], stroke: 'rgba(255, 255, 255, 0.04)', strokeWidth: 1 }));
      }
      this.layer!.add(gridGroup);

      // 2. Rendu des tables filtrées
      this.filteredTables.forEach((table, index) => {
        // Positionnement automatique en grille si pas de coordonnées explicites
        const posX = table.planX ?? (80 + (index % 5) * 130);
        const posY = table.planY ?? (80 + Math.floor(index / 5) * 110);
        const waitTime = this.getWaitTimeMinutes(table);

        // Couleur selon statut
        let fill = '#27ae60'; // Libre (Vert)
        let stroke = '#1e8449';
        if (table.occupee) {
          if (waitTime > 20) {
            fill = '#e74c3c'; // Danger (Rouge)
            stroke = '#c0392b';
          } else {
            fill = '#e67e22'; // Occupée (Orange)
            stroke = '#d35400';
          }
        }

        const group = new Konva.Group({
          x: posX,
          y: posY,
          rotation: table.planRotation || 0,
        });

        const isCircle = table.planForme === 'ROND';
        const shape = isCircle
          ? new Konva.Circle({ radius: 32, fill, stroke, strokeWidth: 2, shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' })
          : new Konva.Rect({ x: -32, y: -32, width: 64, height: 64, cornerRadius: 10, fill, stroke, strokeWidth: 2, shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' });

        group.add(shape);

        // Libellé Numéro de table
        const textNumero = new Konva.Text({
          text: `T${table.id}`,
          fontSize: 14,
          fontStyle: 'bold',
          fill: '#ffffff',
          x: -25,
          y: -14,
          width: 50,
          align: 'center',
        });
        group.add(textNumero);

        // Libellé Capacité / Couverts
        const textCapacite = new Konva.Text({
          text: `${table.capacite}p`,
          fontSize: 11,
          fill: 'rgba(255, 255, 255, 0.85)',
          x: -25,
          y: 2,
          width: 50,
          align: 'center',
        });
        group.add(textCapacite);

        // Badge Temps d'attente si occupé
        if (table.occupee && waitTime > 0) {
          const waitBadge = new Konva.Rect({
            x: -20,
            y: 18,
            width: 40,
            height: 14,
            cornerRadius: 7,
            fill: 'rgba(0, 0, 0, 0.65)',
          });
          const waitText = new Konva.Text({
            text: `${waitTime}m`,
            fontSize: 9,
            fontStyle: 'bold',
            fill: '#ffffff',
            x: -20,
            y: 20,
            width: 40,
            align: 'center',
          });
          group.add(waitBadge);
          group.add(waitText);
        }

        // Curseur & Interaction au clic
        group.on('mouseenter', () => {
          const containerEl = this.konvaContainerRef?.nativeElement;
          if (containerEl) containerEl.style.cursor = 'pointer';
          group.to({ scaleX: 1.08, scaleY: 1.08, duration: 0.1 });
        });

        group.on('mouseleave', () => {
          const containerEl = this.konvaContainerRef?.nativeElement;
          if (containerEl) containerEl.style.cursor = 'default';
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
