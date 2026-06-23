import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { IonicModule, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { IngredientDetailComponent } from '../../../app/features/ingredients/ingredient-detail/ingredient-detail.component';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { Ingredient } from '../../../app/core/models/ingredient.model';

const mockIngredient: Ingredient = {
  id: 1, nom: 'Rhum', uniteMesure: 'cl', quantiteStock: 20, seuilAlerte: 5,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T10:00:00Z',
};

describe('IngredientDetailComponent', () => {
  let component: IngredientDetailComponent;
  let serviceSpy: jasmine.SpyObj<IngredientService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let storeSpy: jasmine.SpyObj<Store>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('IngredientService', ['getById']);
    serviceSpy.getById.and.returnValue(of(mockIngredient));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [IngredientDetailComponent, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy },
        { provide: IngredientService, useValue: serviceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(IngredientDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => expect(component).toBeTruthy());

  it('ngOnInit() charge l\'ingrédient depuis le service', fakeAsync(() => {
    component.ngOnInit();
    tick();
    expect(component.ingredient).toEqual(mockIngredient);
  }));

  it('ngOnInit() affiche un toast danger en cas d\'erreur', fakeAsync(async () => {
    serviceSpy.getById.and.returnValue(throwError(() => new Error('err')));
    component.ngOnInit();
    tick();
    await Promise.resolve();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('isEnAlerte() retourne true si stock <= seuilAlerte', () => {
    component.ingredient = { ...mockIngredient, quantiteStock: 3, seuilAlerte: 5 };
    expect(component.isEnAlerte()).toBeTrue();
  });

  it('isEnAlerte() retourne false si stock > seuilAlerte', () => {
    component.ingredient = mockIngredient; // stock=20, seuil=5
    expect(component.isEnAlerte()).toBeFalse();
  });

  it('getStockColor() retourne "danger" pour stock <= 0', () => {
    expect(component.getStockColor(0)).toBe('danger');
    expect(component.getStockColor(-5)).toBe('danger');
  });

  it('getStockColor() retourne "warning" pour stock < 10', () => {
    expect(component.getStockColor(5)).toBe('warning');
  });

  it('getStockColor() retourne "success" pour stock >= 10', () => {
    expect(component.getStockColor(10)).toBe('success');
  });

  it('onBack() navigue vers /ingredients', () => {
    component.onBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/ingredients']);
  });

  it('onEdit() navigue vers /ingredients/:id/edit', () => {
    component.ingredient = mockIngredient;
    component.onEdit();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/ingredients', 1, 'edit']);
  });

  it('isAdmin$ est initialisé depuis le store', (done) => {
    component.isAdmin$.subscribe(val => {
      expect(val).toBe(false);
      done();
    });
  });
});
