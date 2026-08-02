import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
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
    serviceSpy = jasmine.createSpyObj('IngredientService', ['getAll', 'update', 'delete']);
    serviceSpy.getAll.and.returnValue(of(mockIngredients));
    serviceSpy.update.and.returnValue(of(mockIngredients[0]));
    serviceSpy.delete.and.returnValue(of(undefined as any));

    wsSpy = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsSpy.watch.and.returnValue(wsSubject.asObservable());

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [IngredientListComponent, IonicModule.forRoot(), RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: IngredientService, useValue: serviceSpy },
        { provide: WebSocketService, useValue: wsSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
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

  it('filteredIngredients filtre correctement par recherche et par catégorie', () => {
    component.ingredients = mockIngredients;
    component.searchQuery = 'Rhum';
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Rhum');

    component.searchQuery = '';
    component.selectedCategory = 'SOFTS';
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Coca Cola');
  });

  it('getIngredientCategory catégorise correctement les ingrédients', () => {
    expect(component.getIngredientCategory('Rhum Blanc')).toBe('SPIRITS');
    expect(component.getIngredientCategory('Coca Cola')).toBe('SOFTS');
    expect(component.getIngredientCategory('Sirop de Canne')).toBe('SYRUPS');
    expect(component.getIngredientCategory('Citron Vert')).toBe('FRUITS');
    expect(component.getIngredientCategory('Glace Pilée')).toBe('OTHER');
  });

  it('adjustStock() modifie le stock et appelle le service backend', fakeAsync(() => {
    component.ingredients = [makeI(1, 'Rhum', 20, 5)];
    component.adjustStock(component.ingredients[0], 5);
    tick();
    flushMicrotasks();
    expect(serviceSpy.update).toHaveBeenCalledWith(1, jasmine.objectContaining({ quantiteStock: 25 }));
    expect(component.ingredients[0].quantiteStock).toBe(25);
  }));

  it('adjustStock() ne descend pas sous 0', fakeAsync(() => {
    component.ingredients = [makeI(1, 'Rhum', 2, 5)];
    component.adjustStock(component.ingredients[0], -5);
    tick();
    flushMicrotasks();
    expect(serviceSpy.update).toHaveBeenCalledWith(1, jasmine.objectContaining({ quantiteStock: 0 }));
  }));

  it('onDelete() retire l\'ingrédient de la liste', fakeAsync(() => {
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

  it('onAdd() navigue vers /ingredients/new', () => {
    spyOn(router, 'navigate');
    component.onAdd();
    expect(router.navigate).toHaveBeenCalledWith(['/ingredients/new']);
  });

  it('onView() navigue vers /ingredients/:id', () => {
    spyOn(router, 'navigate');
    component.onView(mockIngredients[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/ingredients', 1]);
  });

  it('onEdit() navigue vers /ingredients/:id/edit', () => {
    spyOn(router, 'navigate');
    component.onEdit(mockIngredients[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/ingredients', 1, 'edit']);
  });

  it('trackById retourne l\'id de l\'ingrédient', () => {
    expect(component.trackById(0, mockIngredients[0])).toBe(1);
  });
});
