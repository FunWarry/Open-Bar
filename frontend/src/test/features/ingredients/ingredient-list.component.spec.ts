import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { of, throwError, Subject } from 'rxjs';
import { IngredientListComponent } from '../../../app/features/ingredients/ingredient-list/ingredient-list.component';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { Ingredient } from '../../../app/core/models/ingredient.model';
import { CsvExportService, CsvColumn } from '../../../app/core/services/csv-export.service';
import { StockWasteService } from '../../../app/core/services/stock-waste.service';
import { StockMovement } from '../../../app/core/models/stock-waste.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const makeI = (id: number, nom: string, stock = 20, seuil = 5, category = 'other'): Ingredient => ({
  id, nom, uniteMesure: 'cl', quantiteStock: stock, seuilAlerte: seuil, category,
  createdAt: '', updatedAt: '',
});

const mockIngredients: Ingredient[] = [
  makeI(1, 'Rhum', 20, 5, 'dark_liquor'),
  makeI(2, 'Citron', 3, 5, 'fruits'),
  makeI(3, 'Coca Cola', 10, 2, 'juices'),
];

describe('IngredientListComponent', () => {
  let component: IngredientListComponent;
  let fixture: ComponentFixture<IngredientListComponent>;
  let serviceSpy: jasmine.SpyObj<IngredientService>;
  let wsSpy: jasmine.SpyObj<WebSocketService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let storeSpy: jasmine.SpyObj<Store>;
  let csvExportSpy: jasmine.SpyObj<CsvExportService>;
  let stockWasteSpy: jasmine.SpyObj<StockWasteService>;
  let router: Router;
  let wsSubject: Subject<any>;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    wsSubject = new Subject<any>();
    serviceSpy = jasmine.createSpyObj('IngredientService', ['getAll', 'update', 'updateStock', 'delete']);
    serviceSpy.getAll.and.returnValue(of(mockIngredients));
    serviceSpy.update.and.returnValue(of(mockIngredients[0]));
    serviceSpy.updateStock.and.returnValue(of(mockIngredients[0]));
    serviceSpy.delete.and.returnValue(of(undefined as any));

    wsSpy = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsSpy.watch.and.returnValue(wsSubject.asObservable());

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    csvExportSpy = jasmine.createSpyObj('CsvExportService', ['exportTable']);
    stockWasteSpy = jasmine.createSpyObj('StockWasteService', ['getMovements', 'getWasteMovementCsvColumns']);
    stockWasteSpy.getWasteMovementCsvColumns.and.returnValue([]);
    stockWasteSpy.getMovements.and.returnValue(of([]));

    const modalSpy = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role: 'saved', data: {} })),
    };
    const modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalSpy as any));

    await TestBed.configureTestingModule({
      imports: [IngredientListComponent, RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        provideIonicAngular(),
        { provide: Store, useValue: storeSpy },
        { provide: IngredientService, useValue: serviceSpy },
        { provide: WebSocketService, useValue: wsSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: CsvExportService, useValue: csvExportSpy },
        { provide: StockWasteService, useValue: stockWasteSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(IngredientListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => expect(component).toBeTruthy());

  it('charger() peuple ingredients depuis le service', fakeAsync(() => {
    component.charger();
    tick();
    expect(component.ingredients).toHaveSize(3);
  }));

  it('charger() displays a toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('recharge la liste lors d\'une notification WebSocket stock/alerte', fakeAsync(() => {
    spyOn(component, 'charger');
    wsSubject.next({ ingredientId: 1 });
    tick();
    expect(component.charger).toHaveBeenCalled();
  }));

  it('filteredIngredients filters correctly by search and category', () => {
    component.ingredients = mockIngredients;
    component.searchQuery = 'Rhum';
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Rhum');

    component.searchQuery = '';
    component.selectedCategory = 'juices';
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Coca Cola');
  });

  it('getIngredientCategory resolves category directly from ingredient entity', () => {
    expect(component.getIngredientCategory(makeI(1, 'Rhum Blanc', 20, 5, 'light_liquor'))).toBe('light_liquor');
    expect(component.getIngredientCategory(makeI(2, 'Coca Cola', 10, 2, 'juices'))).toBe('juices');
    expect(component.getIngredientCategory(makeI(3, 'Sirop de Canne', 5, 1, 'mixers'))).toBe('mixers');
    expect(component.getIngredientCategory(makeI(4, 'Citron Vert', 3, 1, 'fruits'))).toBe('fruits');
    expect(component.getIngredientCategory(makeI(5, 'Crushed Ice', 100, 10, 'other'))).toBe('other');
    expect(component.getIngredientCategory('mixers')).toBe('mixers');
    expect(component.getIngredientCategory('unknown_cat')).toBe('other');
  });

  it('adjustStock() modifie le stock et appelle le service backend', fakeAsync(() => {
    component.ingredients = [makeI(1, 'Rhum', 20, 5)];
    component.adjustStock(component.ingredients[0], 5);
    tick();
    flushMicrotasks();
    expect(serviceSpy.updateStock).toHaveBeenCalledWith(1, 25);
    expect(component.ingredients[0].quantiteStock).toBe(25);
  }));

  it('adjustStock() ne descend pas sous 0', fakeAsync(() => {
    component.ingredients = [makeI(1, 'Rhum', 2, 5)];
    component.adjustStock(component.ingredients[0], -5);
    tick();
    flushMicrotasks();
    expect(serviceSpy.updateStock).toHaveBeenCalledWith(1, 0);
  }));

  it('onDelete() removes ingredient from list', fakeAsync(() => {
    component.charger(); tick();
    component.onDelete(mockIngredients[0]);
    tick();
    expect(component.ingredients.find(i => i.id === 1)).toBeUndefined();
  }));

  it('isEnAlerte() returns true if stock <= seuilAlerte', () => {
    const item = makeI(1, 'Citron', 3, 5);
    expect(component.isEnAlerte(item)).toBeTrue();
  });

  it('getStockColor() returns danger if stock <= 0, warning if stock <= seuil, success otherwise', () => {
    expect(component.getStockColor(makeI(1, 'Zero', 0, 5))).toBe('danger');
    expect(component.getStockColor(makeI(2, 'Alerte', 3, 5))).toBe('warning');
    expect(component.getStockColor(makeI(3, 'Normal', 20, 5))).toBe('success');
  });

  it('openIngredientModal() ouvre le modal et recharge les ingredients sur role saved', fakeAsync(() => {
    spyOn(component, 'charger');
    component.openIngredientModal(mockIngredients[0]);
    tick();
    expect(component.charger).toHaveBeenCalled();
  }));

  it('onAdd() et onEdit() appellent openIngredientModal()', () => {
    spyOn(component, 'openIngredientModal');
    component.onAdd();
    expect(component.openIngredientModal).toHaveBeenCalled();

    component.onEdit(mockIngredients[0]);
    expect(component.openIngredientModal).toHaveBeenCalledWith(mockIngredients[0]);
  });

  it('trackById returns ingredient id', () => {
    expect(component.trackById(0, mockIngredients[0])).toBe(1);
  });

  it('trie les ingredients selon les options disponibles', () => {
    component.ingredients = [
      makeI(1, 'Vodka', 15, 5),
      makeI(2, 'Angostura', 2, 2),
      makeI(3, 'Menthe', 50, 10),
    ];

    component.sortOption = 'NAME_ASC';
    expect(component.filteredIngredients.map(i => i.nom)).toEqual(['Angostura', 'Menthe', 'Vodka']);

    component.sortOption = 'NAME_DESC';
    expect(component.filteredIngredients.map(i => i.nom)).toEqual(['Vodka', 'Menthe', 'Angostura']);

    component.sortOption = 'STOCK_ASC';
    expect(component.filteredIngredients.map(i => i.nom)).toEqual(['Angostura', 'Vodka', 'Menthe']);

    component.sortOption = 'STOCK_DESC';
    expect(component.filteredIngredients.map(i => i.nom)).toEqual(['Menthe', 'Vodka', 'Angostura']);

    component.sortOption = 'STATUS_ALERT';
    expect(component.filteredIngredients[0].nom).toBe('Angostura'); // en alerte car 2 <= 2

    component.sortOption = 'THRESHOLD_ASC';
    expect(component.filteredIngredients.map(i => i.nom)).toEqual(['Angostura', 'Vodka', 'Menthe']);

    component.sortOption = 'THRESHOLD_DESC';
    expect(component.filteredIngredients.map(i => i.nom)).toEqual(['Menthe', 'Vodka', 'Angostura']);

    component.sortOption = 'CATEGORY';
    expect(component.filteredIngredients).toHaveSize(3);
  });

  it('filtre par statut (NORMAL, ALERT, OUT_OF_STOCK)', () => {
    component.ingredients = [
      makeI(1, 'Vodka', 20, 5),
      makeI(2, 'Angostura', 2, 5),
      makeI(3, 'Menthe', 0, 5),
    ];

    component.setStatusFilter('ALL');
    expect(component.filteredIngredients).toHaveSize(3);

    component.setStatusFilter('NORMAL');
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Vodka');

    component.setStatusFilter('ALERT');
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Angostura');

    component.setStatusFilter('OUT_OF_STOCK');
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Menthe');

    expect(component.normalCount).toBe(1);
    expect(component.alertCount).toBe(1);
    expect(component.outOfStockCount).toBe(1);
  });

  it('filtre par unite de mesure', () => {
    component.ingredients = [
      { id: 1, nom: 'Vodka', uniteMesure: 'cl', quantiteStock: 10, seuilAlerte: 2, createdAt: '', updatedAt: '' },
      { id: 2, nom: 'Citron', uniteMesure: 'unit', quantiteStock: 5, seuilAlerte: 2, createdAt: '', updatedAt: '' },
    ];

    component.onUnitChange({ target: { value: 'unit' } } as unknown as Event);
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Citron');
  });

  it('met a jour la categorie et le viewMode', () => {
    component.onCategoryChange({ target: { value: 'SPIRITS' } } as unknown as Event);
    expect(component.selectedCategory).toBe('SPIRITS');

    component.setViewMode('list');
    expect(component.viewMode).toBe('list');
  });

  it('onSortChange() met a jour sortOption', () => {
    const mockEvent = { target: { value: 'STOCK_DESC' } } as unknown as Event;
    component.onSortChange(mockEvent);
    expect(component.sortOption).toBe('STOCK_DESC');
  });

  it('groupedIngredients groups filtered ingredients by category sections', () => {
    component.ingredients = [
      makeI(1, 'Rhum Blanc', 20, 5, 'light_liquor'),
      makeI(2, 'Coca Cola', 15, 5, 'juices'),
      makeI(3, 'Sirop de Grenadine', 10, 2, 'mixers'),
      makeI(4, 'Citron Vert', 8, 3, 'fruits'),
      makeI(5, 'Pailles Biodegradables', 100, 10, 'other'),
    ];

    const groups = component.groupedIngredients;
    expect(groups).toHaveSize(5);
    expect(groups.map(g => g.categoryKey)).toEqual(['light_liquor', 'juices', 'mixers', 'fruits', 'other']);
    expect(groups[0].items[0].nom).toBe('Rhum Blanc');
    expect(groups[1].items[0].nom).toBe('Coca Cola');
  });

  it('categoryOptions, unitOptions, sortOptions return searchable options and handlers update state', () => {
    component.ingredients = [
      makeI(1, 'Rhum', 20, 5),
      makeI(2, 'Citron', 5, 2),
    ];

    expect(component.categoryOptions.length).toBeGreaterThan(1);
    expect(component.unitOptions.length).toBeGreaterThan(1);
    expect(component.sortOptions.length).toBeGreaterThan(1);

    component.onCategorySelected({ value: 'SPIRITS', label: 'Spiritueux' });
    expect(component.selectedCategory).toBe('SPIRITS');

    component.onUnitSelected({ value: 'cl', label: 'cl' });
    expect(component.selectedUnit).toBe('cl');

    component.onSortSelected({ value: 'STOCK_ASC', label: 'Stock croissant' });
    expect(component.sortOption).toBe('STOCK_ASC');
  });

  it('openWasteModal opens StockWasteModalComponent and reloads data when saved', async () => {
    spyOn(component, 'charger');
    const targetIng = mockIngredients[0];
    await component.openWasteModal(targetIng);
    expect(component.charger).toHaveBeenCalled();
  });

  it('exportInventoryCsv delegates to csvExportService.exportTable with filtered ingredients and formats columns', () => {
    const customIngredients: Ingredient[] = [
      {
        ...makeI(1, 'Rhum', 0, 5),
        prixUnitaire: 25.5
      },
      {
        ...makeI(2, 'Menthe', 3, 5),
        prixUnitaire: 2.0
      },
      {
        ...makeI(3, 'Sucre', 15, 5),
        prixUnitaire: 1.2
      },
      {
        ...makeI(4, 'Eau', 50, 5),
        prixUnitaire: undefined
      }
    ];
    component.ingredients = customIngredients;
    component.searchQuery = '';
    component.exportInventoryCsv();

    expect(csvExportSpy.exportTable).toHaveBeenCalledWith(
      jasmine.any(Array),
      jasmine.any(Array),
      'inventaire_ingredients'
    );

    const callArgs = csvExportSpy.exportTable.calls.mostRecent().args;
    const columns = callArgs[1] as CsvColumn<Ingredient>[];

    const unitCostCol = columns.find(c => c.header === 'Cout_Unitaire_EUR');
    const statusCol = columns.find(c => c.header === 'Statut');

    // Test unitCost formatter
    expect(unitCostCol?.formatter?.(12.34, customIngredients[0])).toBe('12.34');
    expect(unitCostCol?.formatter?.(null, customIngredients[0])).toBe('25.50');
    expect(unitCostCol?.formatter?.(null, customIngredients[3])).toBe('0.00');

    // Test Statut formatter: RUPTURE (stock <= 0)
    expect(statusCol?.formatter?.(null, customIngredients[0])).toBe('RUPTURE');
    // Test Statut formatter: ALERTE (stock <= seuilAlerte)
    expect(statusCol?.formatter?.(null, customIngredients[1])).toBe('ALERTE');
    // Test Statut formatter: NORMAL (stock > seuilAlerte)
    expect(statusCol?.formatter?.(null, customIngredients[2])).toBe('NORMAL');
  });

  it('exportInventoryCsv returns early when filteredIngredients is empty', () => {
    component.ingredients = [];
    component.searchQuery = '';
    csvExportSpy.exportTable.calls.reset();

    component.exportInventoryCsv();

    expect(csvExportSpy.exportTable).not.toHaveBeenCalled();
  });

  it('exportWasteMovementsCsv calls stockWasteService.getMovements and exports table', fakeAsync(() => {
    const mockMovements: StockMovement[] = [
      {
        id: 1,
        ingredientId: 10,
        ingredientNom: 'Rhum',
        quantity: 2,
        unit: 'bouteille',
        reason: 'CASSE',
        notes: 'Broken during service',
        cost: 30,
        recordedAt: '2026-09-14T10:00:00Z',
        reportedById: 1,
        reportedByUsername: 'John'
      }
    ];
    stockWasteSpy.getMovements.and.returnValue(of(mockMovements));
    component.exportWasteMovementsCsv();
    tick();

    expect(csvExportSpy.exportTable).toHaveBeenCalledWith(
      mockMovements,
      jasmine.any(Array),
      'pertes_stock'
    );
  }));

  it('exportWasteMovementsCsv presents warning toast when no movements exist', fakeAsync(() => {
    stockWasteSpy.getMovements.and.returnValue(of([]));
    component.exportWasteMovementsCsv();
    tick();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'warning' })
    );
  }));

  describe('View Modes & Pagination', () => {
    it('initializes with category view mode by default', () => {
      expect(component.viewMode).toBe('category');
    });

    it('switches between category, grid, and list view modes', () => {
      component.setViewMode('grid');
      expect(component.viewMode).toBe('grid');
      expect(component.gridPage).toBe(1);

      component.setViewMode('list');
      expect(component.viewMode).toBe('list');

      component.setViewMode('category');
      expect(component.viewMode).toBe('category');
    });

    it('calculates total pages, slices items, and handles pagination correctly', () => {
      // Create 35 test ingredients
      component.ingredients = Array.from({ length: 35 }, (_, idx) =>
        makeI(idx + 1, `Ingredient ${idx + 1}`, 20, 5)
      );
      component.gridPageSize = 10;
      component.gridPage = 1;

      expect(component.totalGridPages).toBe(4);
      expect(component.gridPaginationStart).toBe(1);
      expect(component.gridPaginationEnd).toBe(10);
      expect(component.paginatedGridIngredients).toHaveSize(10);
      expect(component.paginatedGridIngredients[0].nom).toBe('Ingredient 1');

      // Next page
      component.nextGridPage();
      expect(component.gridPage).toBe(2);
      expect(component.gridPaginationStart).toBe(11);
      expect(component.gridPaginationEnd).toBe(20);

      // Jump to last page
      component.setGridPage(4);
      expect(component.gridPage).toBe(4);
      expect(component.gridPaginationStart).toBe(31);
      expect(component.gridPaginationEnd).toBe(35);
      expect(component.paginatedGridIngredients).toHaveSize(5);

      // Prev page
      component.prevGridPage();
      expect(component.gridPage).toBe(3);

      // Edge bounds check
      component.setGridPage(999);
      expect(component.gridPage).toBe(3); // ignored
      component.setGridPage(-5);
      expect(component.gridPage).toBe(3); // ignored
    });

    it('resets gridPage to 1 when changing filters or page size', () => {
      component.ingredients = Array.from({ length: 30 }, (_, idx) =>
        makeI(idx + 1, `Item ${idx + 1}`, 10, 5)
      );
      component.gridPageSize = 10;
      component.gridPage = 3;

      component.setStatusFilter('ALERT');
      expect(component.gridPage).toBe(1);

      component.gridPage = 3;
      component.onCategorySelected({ value: 'SPIRITS', label: 'Spirits' });
      expect(component.gridPage).toBe(1);

      component.gridPage = 3;
      component.onUnitSelected({ value: 'cl', label: 'cl' });
      expect(component.gridPage).toBe(1);

      component.gridPage = 3;
      component.onSortSelected({ value: 'NAME_DESC', label: 'Name Desc' });
      expect(component.gridPage).toBe(1);

      component.gridPage = 3;
      component.onSearchChange();
      expect(component.gridPage).toBe(1);

      component.gridPage = 3;
      component.setGridPageSize(24);
      expect(component.gridPage).toBe(1);
      expect(component.gridPageSize).toBe(24);
    });

    it('generates page numbers correctly for small and large page sets', () => {
      component.ingredients = Array.from({ length: 30 }, (_, idx) =>
        makeI(idx + 1, `Item ${idx + 1}`, 10, 5)
      );
      component.gridPageSize = 10;
      // total = 3 pages
      expect(component.gridPageNumbers).toEqual([1, 2, 3]);

      // large set: 15 pages
      component.ingredients = Array.from({ length: 150 }, (_, idx) =>
        makeI(idx + 1, `Item ${idx + 1}`, 10, 5)
      );
      component.gridPage = 5;
      const pages = component.gridPageNumbers;
      expect(pages[0]).toBe(1);
      expect(pages[pages.length - 1]).toBe(15);
      expect(pages).toContain(5);
    });
  });
});

