import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { IngredientListComponent } from '../../../app/features/ingredients/ingredient-list/ingredient-list.component';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { Ingredient } from '../../../app/core/models/ingredient.model';

const makeI = (id: number, nom: string, stock = 20, seuil = 5): Ingredient => ({
  id, nom, uniteMesure: 'cl', quantiteStock: stock, seuilAlerte: seuil,
  createdAt: '', updatedAt: '',
});

const mockIngredients: Ingredient[] = [
  makeI(1, 'Rhum', 20, 5),
  makeI(2, 'Citron', 3, 5),
];

describe('IngredientListComponent', () => {
  let component: IngredientListComponent;
  let fixture: ComponentFixture<IngredientListComponent>;
  let serviceSpy: jasmine.SpyObj<IngredientService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let storeSpy: jasmine.SpyObj<Store>;
  let router: Router;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('IngredientService', ['getAll', 'delete']);
    serviceSpy.getAll.and.returnValue(of(mockIngredients));
    serviceSpy.delete.and.returnValue(of(undefined as any));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [IngredientListComponent, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: IngredientService, useValue: serviceSpy },
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
    expect(component.ingredients).toHaveSize(2);
  }));

  it('charger() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('onDelete() retire l\'ingrédient de la liste', fakeAsync(() => {
    component.charger(); tick();
    component.onDelete(mockIngredients[0]);
    tick();
    expect(component.ingredients.find(i => i.id === 1)).toBeUndefined();
  }));

  it('isEnAlerte() retourne true si stock <= seuilAlerte', () => {
    component.ingredients = [makeI(1, 'Citron', 3, 5)];
    expect(component.isEnAlerte(component.ingredients[0])).toBeTrue();
  });

  it('isEnAlerte() retourne false si stock > seuilAlerte', () => {
    component.ingredients = [makeI(1, 'Rhum', 20, 5)];
    expect(component.isEnAlerte(component.ingredients[0])).toBeFalse();
  });

  it('getStockColor() retourne "danger" pour stock <= 0', () => {
    expect(component.getStockColor(0)).toBe('danger');
  });

  it('getStockColor() retourne "warning" pour stock < 10', () => {
    expect(component.getStockColor(5)).toBe('warning');
  });

  it('getStockColor() retourne "success" pour stock >= 10', () => {
    expect(component.getStockColor(10)).toBe('success');
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
