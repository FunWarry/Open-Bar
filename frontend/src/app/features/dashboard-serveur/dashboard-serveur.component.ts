import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonLabel,
  IonButtons, IonButton, IonIcon,
  ToastController, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { listOutline } from 'ionicons/icons';
import { TableDetailModalComponent } from './components/table-detail-modal/table-detail-modal.component';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardServeurService } from './services/dashboard-serveur.service';
import { TableView } from './models/table-view.model';

import { MobileTableCardComponent } from './components/mobile-table-card/mobile-table-card.component';
import { BottomNavigationComponent, ServeurTab } from './components/bottom-navigation/bottom-navigation.component';
import { ProductCardComponent, ProductItem } from './components/product-card/product-card.component';
import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { CartModel, CartItemModel } from './models/cart.model';
import { FilterChipComponent } from '../../core/components/ui/filter-chip/filter-chip.component';

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
export class DashboardServeurComponent implements OnInit, OnDestroy {
  tables: TableView[] = [];
  filteredTables: TableView[] = [];
  selectedFilter = 'toutes';
  isLoading = false;

  activeTab: ServeurTab = 'tables';
  selectedCategory = 'ALL';

  cart: CartModel = { tableId: null, items: [] };

  products: ProductItem[] = [
    { id: 1, nom: 'Mojito Traditional', prix: 8.5, categorie: 'COCKTAIL', stock: 15, stockStatus: 'NORMAL', description: 'Rhum blanc, menthe fraîche, citron vert' },
    { id: 2, nom: 'Pinte Blonde Pression', prix: 6.0, categorie: 'BEER', stock: 40, stockStatus: 'NORMAL', description: 'Blonde artisanale 5%' },
    { id: 3, nom: 'Cocktail Signature OpenBar', prix: 10.0, categorie: 'COCKTAIL', stock: 5, stockStatus: 'FAIBLE', description: 'Gin infuse, tonic premium' },
    { id: 4, nom: 'Limonade Maison', prix: 4.5, categorie: 'SOFT', stock: 25, stockStatus: 'NORMAL', description: 'Citron pressé & sirop d\'agave' },
    { id: 5, nom: 'Planche de Nachos & Guacamole', prix: 9.0, categorie: 'SNACK', stock: 8, stockStatus: 'NORMAL', description: 'Cheddar fondu et sauces maison' },
    { id: 6, nom: 'Shot Tequila Special', prix: 4.0, categorie: 'SHOT', stock: 3, stockStatus: 'CRITIQUE', description: 'Tequila reposado' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly service: DashboardServeurService,private readonly toastCtrl: ToastController,private readonly modalCtrl: ModalController,private readonly router: Router,private readonly notificationService: NotificationService,
  ) {
    addIcons({ listOutline });
  }

  ngOnInit() {
    this.chargerTables();

    // Rechargement automatique des tables à chaque event WS table ou commande
    this.notificationService.onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        if (notif.type === 'table' || notif.type === 'commande') {
          this.chargerTables();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  chargerTables(refreshEvent?: any) {
    this.isLoading = true;
    this.service.getAllTables()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) refreshEvent.target.complete();
        }),
      )
      .subscribe({
        next: tables => {
          this.tables = tables;
          this.filtrer();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du chargement des tables',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  filtrer() {
    switch (this.selectedFilter) {
      case 'occupees':
        this.filteredTables = this.tables.filter(t => t.occupee);
        break;
      case 'libres':
        this.filteredTables = this.tables.filter(t => !t.occupee);
        break;
      default:
        this.filteredTables = [...this.tables];
    }
  }

  get countOccupees(): number {
    return this.tables.filter(t => t.occupee).length;
  }

  get countLibres(): number {
    return this.tables.filter(t => !t.occupee).length;
  }

  onSegmentChange(event: { detail?: { value?: any } }) {
    this.selectedFilter = String(event.detail?.value || 'toutes');
    this.filtrer();
  }

  async onSelectionner(table: TableView) {
    const modal = await this.modalCtrl.create({
      component: TableDetailModalComponent,
      componentProps: { table },
      breakpoints: [0, 0.5, 0.9],
      initialBreakpoint: 0.9,
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
