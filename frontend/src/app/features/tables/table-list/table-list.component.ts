import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonContent, IonIcon, IonButton,
  IonRefresher, IonRefresherContent, IonSpinner, IonSearchbar,
  ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add, eye, create, people, checkmarkCircle, closeCircle, layersOutline,
  businessOutline, swapVerticalOutline, gridOutline, restaurantOutline,
  refreshOutline, checkmarkCircleOutline, closeCircleOutline,
  locationOutline, peopleOutline, eyeOutline, createOutline
} from 'ionicons/icons';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TableService } from '../../../core/services/table.service';
import { ZoneService, ZoneBar } from '../../../core/services/zone.service';
import { EtageService, EtageBar } from '../../../core/services/etage.service';
import { TableBar } from '../../../core/models/table.model';
import { ZoneManagerComponent } from '../zone-manager/zone-manager.component';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

export type SortOption =
  | 'NUMBER_ASC'
  | 'NUMBER_DESC'
  | 'CAPACITY_ASC'
  | 'CAPACITY_DESC'
  | 'STATUS_OCCUPIED'
  | 'STATUS_FREE'
  | 'ZONE_NAME';

export type ViewMode = 'BY_ZONE' | 'BY_FLOOR' | 'GRID';

export interface GroupedTables {
  key: string;
  title: string;
  subTitle?: string;
  tables: TableBar[];
  freeCount: number;
  occupiedCount: number;
}

/**
 * Enhanced Table list management component in OpenBar.
 * Provides real-time supervision, filtering by floor/zone/status, sorting, and grouped view modes.
 */
@Component({
  selector: 'app-table-list',
  templateUrl: './table-list.component.html',
  styleUrls: ['./table-list.component.css'],
  standalone: true,
  imports: [
    IonContent, IonIcon, IonButton,
    IonRefresher, IonRefresherContent, IonSpinner, IonSearchbar,
    AsyncPipe, NgTemplateOutlet, TranslocoPipe
  ],
})
export class TableListComponent implements OnInit, OnDestroy {
  tables: TableBar[] = [];
  zones: ZoneBar[] = [];
  etages: EtageBar[] = [];
  isLoading = false;
  isAdmin$: Observable<boolean>;

  // Filters and controls state
  searchTerm = '';
  selectedEtage = 'ALL';
  selectedZone = 'ALL';
  selectedStatus: 'ALL' | 'FREE' | 'OCCUPIED' = 'ALL';
  sortOption: SortOption = 'NUMBER_ASC';
  viewMode: ViewMode = 'BY_ZONE';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly tableService: TableService,
    private readonly zoneService: ZoneService,
    private readonly etageService: EtageService,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
    private readonly transloco: TranslocoService
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({
      add, eye, create, people, checkmarkCircle, closeCircle, layersOutline,
      businessOutline, swapVerticalOutline, gridOutline, restaurantOutline,
      refreshOutline, checkmarkCircleOutline, closeCircleOutline,
      locationOutline, peopleOutline, eyeOutline, createOutline
    });
  }

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetches tables, zones and floors simultaneously.
   * @param refreshEvent Optional IonRefresher event
   */
  charger(refreshEvent?: any): void {
    this.isLoading = true;
    forkJoin({
      tables: this.tableService.getAll(),
      zones: this.zoneService.getAll(),
      etages: this.etageService.getAll()
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) safeCompleteRefresher(refreshEvent);
        })
      )
      .subscribe({
        next: ({ tables, zones, etages }) => {
          this.tables = tables;
          this.zones = zones;
          this.etages = etages;
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('COMMON.ERROR'),
            duration: 3000,
            color: 'danger'
          });
          toast.present();
        },
      });
  }

  /**
   * Resolves Floor details associated with a Zone name.
   */
  getEtageForZone(zoneName: string): EtageBar | undefined {
    const zone = this.zones.find(z => z.nom?.toLowerCase() === zoneName?.toLowerCase());
    if (!zone) return undefined;
    return this.etages.find(e => e.code === zone.etage);
  }

  /**
   * Returns formatted human-readable floor name for a table zone.
   */
  getEtageLabelForZone(zoneName: string): string {
    const etage = this.getEtageForZone(zoneName);
    return etage ? etage.nom : '';
  }

  /**
   * Returns a compact formatted floor label (e.g. "RDC", "First Floor", "Terrasse")
   * to avoid overflowing card headers.
   */
  getEtageShortLabelForZone(zoneName: string): string {
    const etage = this.getEtageForZone(zoneName);
    if (!etage) return '';
    if (etage.code === 'RDC') return 'RDC';
    return etage.nom.replace(/\s*\(.*\)/, '');
  }

  /**
   * Returns zones available according to selected floor filter.
   */
  get availableZonesForFilter(): ZoneBar[] {
    if (this.selectedEtage === 'ALL') {
      return this.zones;
    }
    return this.zones.filter(z => z.etage === this.selectedEtage);
  }

  /**
   * Computes quick metrics & KPIs for the tables overview.
   */
  get tableStats(): {
    totalCount: number;
    freeCount: number;
    occupiedCount: number;
    occupancyRate: number;
    totalCapacity: number;
    occupiedCapacity: number;
  } {
    const totalCount = this.tables.length;
    const freeCount = this.tables.filter(t => !t.occupee).length;
    const occupiedCount = this.tables.filter(t => t.occupee).length;
    const occupancyRate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;
    const totalCapacity = this.tables.reduce((acc, t) => acc + (t.capacite || 0), 0);
    const occupiedCapacity = this.tables.filter(t => t.occupee).reduce((acc, t) => acc + (t.capacite || 0), 0);

    return {
      totalCount,
      freeCount,
      occupiedCount,
      occupancyRate,
      totalCapacity,
      occupiedCapacity
    };
  }

  /**
   * Returns the filtered and sorted list of tables based on user selections.
   */
  get filteredTables(): TableBar[] {
    let result = [...this.tables];

    // Search filter
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      result = result.filter(t =>
        `table ${t.numero}`.toLowerCase().includes(q) ||
        String(t.numero).includes(q) ||
        (t.zone?.toLowerCase().includes(q) ?? false)
      );
    }

    // Floor filter
    if (this.selectedEtage !== 'ALL') {
      const zonesInFloor = new Set(
        this.zones.filter(z => z.etage === this.selectedEtage).map(z => z.nom.toLowerCase())
      );
      result = result.filter(t => t.zone ? zonesInFloor.has(t.zone.toLowerCase()) : false);
    }

    // Zone filter
    if (this.selectedZone !== 'ALL') {
      result = result.filter(t => t.zone?.toLowerCase() === this.selectedZone.toLowerCase());
    }

    // Status filter
    if (this.selectedStatus === 'FREE') {
      result = result.filter(t => !t.occupee);
    } else if (this.selectedStatus === 'OCCUPIED') {
      result = result.filter(t => t.occupee);
    }

    // Sorting
    result.sort((a, b) => {
      switch (this.sortOption) {
        case 'NUMBER_ASC':
          return a.numero - b.numero;
        case 'NUMBER_DESC':
          return b.numero - a.numero;
        case 'CAPACITY_ASC':
          return a.capacite - b.capacite || a.numero - b.numero;
        case 'CAPACITY_DESC':
          return b.capacite - a.capacite || a.numero - b.numero;
        case 'STATUS_OCCUPIED':
          return (b.occupee ? 1 : 0) - (a.occupee ? 1 : 0) || a.numero - b.numero;
        case 'STATUS_FREE':
          return (a.occupee ? 1 : 0) - (b.occupee ? 1 : 0) || a.numero - b.numero;
        case 'ZONE_NAME':
          return (a.zone ?? '').localeCompare(b.zone ?? '') || a.numero - b.numero;
        default:
          return a.numero - b.numero;
      }
    });

    return result;
  }

  /**
   * Groups filtered tables by Zone name with metadata.
   */
  get groupedByZone(): {
    zoneName: string;
    etageLabel: string;
    tables: TableBar[];
    freeCount: number;
    occupiedCount: number;
  }[] {
    const map = new Map<string, TableBar[]>();
    for (const table of this.filteredTables) {
      const key = table.zone || 'Autre';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(table);
    }

    return Array.from(map.entries()).map(([zoneName, tables]) => ({
      zoneName,
      etageLabel: this.getEtageLabelForZone(zoneName),
      tables,
      freeCount: tables.filter(t => !t.occupee).length,
      occupiedCount: tables.filter(t => t.occupee).length
    }));
  }

  /**
   * Groups filtered tables by Floor code with metadata.
   */
  get groupedByFloor(): {
    etageCode: string;
    etageLabel: string;
    tables: TableBar[];
    freeCount: number;
    occupiedCount: number;
  }[] {
    const map = new Map<string, TableBar[]>();
    for (const table of this.filteredTables) {
      const etage = this.getEtageForZone(table.zone);
      const key = etage ? etage.code : 'AUTRE';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(table);
    }

    return Array.from(map.entries()).map(([etageCode, tables]) => {
      const etageObj = this.etages.find(e => e.code === etageCode);
      return {
        etageCode,
        etageLabel: etageObj ? etageObj.nom : etageCode,
        tables,
        freeCount: tables.filter(t => !t.occupee).length,
        occupiedCount: tables.filter(t => t.occupee).length
      };
    });
  }

  // --- Filter event handlers ---

  onSearchChange(event: any): void {
    this.searchTerm = event.detail.value || '';
  }

  onEtageFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedEtage = select.value;
    // If selected zone is not in new floor, reset zone filter
    if (this.selectedEtage !== 'ALL' && this.selectedZone !== 'ALL') {
      const zoneInFloor = this.zones.some(z => z.nom === this.selectedZone && z.etage === this.selectedEtage);
      if (!zoneInFloor) {
        this.selectedZone = 'ALL';
      }
    }
  }

  onZoneFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedZone = select.value;
  }

  setStatusFilter(status: 'ALL' | 'FREE' | 'OCCUPIED'): void {
    this.selectedStatus = status;
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortOption = select.value as SortOption;
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedEtage = 'ALL';
    this.selectedZone = 'ALL';
    this.selectedStatus = 'ALL';
    this.sortOption = 'NUMBER_ASC';
  }

  /**
   * Fast toggle to occupy or free a table with toast confirmation.
   */
  onToggleStatus(table: TableBar, event?: Event): void {
    if (event) event.stopPropagation();

    const obs$ = table.occupee
      ? this.tableService.liberer(table.id)
      : this.tableService.occuper(table.id);

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        const idx = this.tables.findIndex(t => t.id === updated.id);
        if (idx !== -1) {
          this.tables[idx] = updated;
        }
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('COMMON.ERROR'),
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  async onManageZones(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ZoneManagerComponent,
      cssClass: 'modal-standard'
    });
    await modal.present();
    await modal.onDidDismiss();
    this.charger();
  }

  onAdd(): void { this.router.navigate(['/tables/new']); }
  onView(t: TableBar): void { this.router.navigate(['/tables', t.id]); }
  onEdit(t: TableBar): void { this.router.navigate(['/tables', t.id, 'edit']); }
  onRefresh(event: any): void { this.charger(event); }
  trackById(_: number, t: TableBar): number { return t.id; }
}
