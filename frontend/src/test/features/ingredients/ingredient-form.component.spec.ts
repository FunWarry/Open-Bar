import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ToastController } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { IngredientFormComponent } from '../../../app/features/ingredients/ingredient-form/ingredient-form.component';

describe('IngredientFormComponent', () => {
  let component: IngredientFormComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let storeSpy: jasmine.SpyObj<Store>;

  const activatedRouteStubNoId = {
    snapshot: { params: {} }
  };

  const activatedRouteStubWithId = {
    snapshot: { params: { id: 42 } }
  };

  function createComponent(activatedRouteStub: object): void {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    storeSpy = jasmine.createSpyObj('Store', ['dispatch', 'select']);

    const toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    TestBed.configureTestingModule({
      imports: [
        IngredientFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        IonicModule.forRoot()
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: Store, useValue: storeSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    });

    const fixture = TestBed.createComponent(IngredientFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('initialisation sans id (mode création)', () => {
    beforeEach(() => createComponent(activatedRouteStubNoId));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('isEditMode est false quand aucun id dans la route', () => {
      expect(component.isEditMode).toBeFalse();
    });

    it('ingredientId est null quand aucun id dans la route', () => {
      expect(component.ingredientId).toBeNull();
    });

    it('le formulaire est initialisé avec des champs vides', () => {
      const form = component.ingredientForm;
      expect(form.get('name')?.value).toBe('');
      expect(form.get('category')?.value).toBe('');
      expect(form.get('stock')?.value).toBe('');
      expect(form.get('unit')?.value).toBe('');
    });

    it('le formulaire est invalide quand tous les champs sont vides', () => {
      expect(component.ingredientForm.invalid).toBeTrue();
    });

    it('le formulaire est valide quand tous les champs requis sont remplis', () => {
      component.ingredientForm.setValue({
        name: 'Citron',
        category: 'Fruit',
        stock: 10,
        unit: 'kg'
      });
      expect(component.ingredientForm.valid).toBeTrue();
    });

    it('le champ stock est invalide si négatif', () => {
      component.ingredientForm.setValue({
        name: 'Citron',
        category: 'Fruit',
        stock: -1,
        unit: 'kg'
      });
      expect(component.ingredientForm.get('stock')?.invalid).toBeTrue();
    });

    it('onSubmit() ne navigue pas si le formulaire est invalide', () => {
      component.onSubmit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('onSubmit() ne dispatche pas si le formulaire est invalide', () => {
      component.onSubmit();
      expect(storeSpy.dispatch).not.toHaveBeenCalled();
    });

    it('onCancel() navigue vers /ingredients', () => {
      component.onCancel();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/ingredients']);
    });
  });

  describe('initialisation avec id (mode édition)', () => {
    beforeEach(() => createComponent(activatedRouteStubWithId));

    it('should create en mode édition', () => {
      expect(component).toBeTruthy();
    });

    it('isEditMode est true quand un id est présent dans la route', () => {
      expect(component.isEditMode).toBeTrue();
    });

    it('ingredientId est valorisé depuis la route', () => {
      expect(component.ingredientId).toBe(42);
    });

    it('onCancel() navigue vers /ingredients en mode édition', () => {
      component.onCancel();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/ingredients']);
    });
  });

  describe('validation des champs individuels', () => {
    beforeEach(() => createComponent(activatedRouteStubNoId));

    it('le champ name est requis', () => {
      const ctrl = component.ingredientForm.get('name');
      ctrl?.setValue('');
      expect(ctrl?.hasError('required')).toBeTrue();
    });

    it('le champ category est requis', () => {
      const ctrl = component.ingredientForm.get('category');
      ctrl?.setValue('');
      expect(ctrl?.hasError('required')).toBeTrue();
    });

    it('le champ stock est requis', () => {
      const ctrl = component.ingredientForm.get('stock');
      ctrl?.setValue('');
      expect(ctrl?.hasError('required')).toBeTrue();
    });

    it('le champ unit est requis', () => {
      const ctrl = component.ingredientForm.get('unit');
      ctrl?.setValue('');
      expect(ctrl?.hasError('required')).toBeTrue();
    });

    it('le champ stock accepte la valeur 0', () => {
      component.ingredientForm.setValue({
        name: 'Sel',
        category: 'Epice',
        stock: 0,
        unit: 'g'
      });
      expect(component.ingredientForm.get('stock')?.valid).toBeTrue();
    });
  });
});
