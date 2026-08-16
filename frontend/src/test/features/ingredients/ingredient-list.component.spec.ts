import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { of, throwError, Subject } from 'rxjs';
import { IngredientListComponent } from '../../../app/features/ingredients/ingredient-list/ingredient-list.component';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { Ingredient } from '../../../app/core/models/ingredient.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const makeI = (id: number, nom: string, stock = 20, seuil = 5): Ingredient => ({
  id, nom, uniteMesure: 'cl', quantiteStock: stock, seuilAlerte: seuil,
  createdAt: '', updatedAt: '',
});

const mockIngredients: Ingredient[] = [
  makeI(1, 'Rhum', 20, 5),
  makeI(2, 'Citron', 3, 5),
  makeI(3, 'Coca Cola', 10, 2),
];

describe('IngredientListComponent', () => {
  let component: IngredientListComponent;
  let fixture: ComponentFixture<IngredientListComponent>;
  let serviceSpy: jasmine.SpyObj<IngredientService>;
  let wsSpy: jasmine.SpyObj<WebSocketService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let storeSpy: jasmine.SpyObj<Store>;
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

    const modalSpy = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role: 'saved', data: {} })),
    };
    const modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalSpy as any));

    await TestBed.configureTestingModule({
      imports: [IngredientListComponent, IonicModule.forRoot(), RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: IngredientService, useValue: serviceSpy },
        { provide: WebSocketService, useValue: wsSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
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

  it('charger() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
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
    component.selectedCategory = 'SOFTS';
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Coca Cola');
  });

  it('getIngredientCategory categorizes ingredients correctly', () => {
    expect(component.getIngredientCategory('Rhum Blanc')).toBe('SPIRITS');
    expect(component.getIngredientCategory('Coca Cola')).toBe('SOFTS');
    expect(component.getIngredientCategory('Sirop de Canne')).toBe('SYRUPS');
    expect(component.getIngredientCategory('Citron Vert')).toBe('FRUITS');
    expect(component.getIngredientCategory('Crushed Ice')).toBe('OTHER');
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

  it('isEnAlerte() retourne true si stock <= seuilAlerte', () => {
    const item = makeI(1, 'Citron', 3, 5);
    expect(component.isEnAlerte(item)).toBeTrue();
  });

  it('getStockColor() retourne danger si stock <= 0, warning si stock <= seuil, success sinon', () => {
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

  it('adjustStock() supporte un ajustement de -10 et +10', fakeAsync(() => {
    const item = makeI(1, 'Rhum', 25, 5);
    component.adjustStock(item, -10);
    tick();
    flushMicrotasks();
    expect(serviceSpy.updateStock).toHaveBeenCalledWith(1, 15);
    expect(item.quantiteStock).toBe(15);

    component.adjustStock(item, 10);
    tick();
    flushMicrotasks();
    expect(serviceSpy.updateStock).toHaveBeenCalledWith(1, 25);
    expect(item.quantiteStock).toBe(25);
  }));
});
