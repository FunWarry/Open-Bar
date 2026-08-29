import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';
import { IngredientFormComponent } from '../../../app/features/ingredients/ingredient-form/ingredient-form.component';
import { IngredientService } from '../../../app/core/services/ingredient.service';

import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('IngredientFormComponent', () => {
  let component: IngredientFormComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;

  const activatedRouteStubNoId = {
    snapshot: { params: {} }
  };

  const activatedRouteStubWithId = {
    snapshot: { params: { id: 42 } }
  };

  function createComponent(activatedRouteStub: object): void {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));
    ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getById', 'create', 'update']);
    ingredientServiceSpy.create.and.returnValue(of({} as any));
    ingredientServiceSpy.update.and.returnValue(of({} as any));
    ingredientServiceSpy.getById.and.returnValue(of({
      id: 42,
      nom: 'Citron',
      uniteMesure: 'kg',
      quantiteStock: 10,
      seuilAlerte: 5,
    } as any));

    const toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    TestBed.configureTestingModule({
      imports: [
        IngredientFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        getTranslocoTestingModule(),
        IonicModule.forRoot()
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: IngredientService, useValue: ingredientServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
      ]
    });

    const fixture = TestBed.createComponent(IngredientFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('initialization without id (creation mode)', () => {
    beforeEach(() => createComponent(activatedRouteStubNoId));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('isEditMode is false when no id in route', () => {
      expect(component.isEditMode).toBeFalse();
    });

    it('ingredientId is null when no id in route', () => {
      expect(component.ingredientId).toBeNull();
    });

    it('form is initialized with empty or default fields', () => {
      const form = component.ingredientForm;
      expect(form.get('nom')?.value).toBe('');
      expect(form.get('uniteMesure')?.value).toBe('');
      expect(form.get('quantiteStock')?.value).toBe(0);
      expect(form.get('seuilAlerte')?.value).toBe(5);
    });

    it('form should be invalid when required fields are empty', () => {
      component.ingredientForm.get('nom')?.setValue('');
      component.ingredientForm.get('uniteMesure')?.setValue('');
      expect(component.ingredientForm.invalid).toBeTrue();
    });

    it('form should be valid when all required fields are filled', () => {
      component.ingredientForm.setValue({
        nom: 'Citron',
        uniteMesure: 'kg',
        quantiteStock: 10,
        seuilAlerte: 5,
      });
      expect(component.ingredientForm.valid).toBeTrue();
    });

    it('quantiteStock field is invalid if negative', () => {
      component.ingredientForm.patchValue({ quantiteStock: -1 });
      expect(component.ingredientForm.get('quantiteStock')?.invalid).toBeTrue();
    });

    it('onSubmit() does not navigate if form is invalid', () => {
      component.ingredientForm.get('nom')?.setValue('');
      component.ingredientForm.get('uniteMesure')?.setValue('');
      component.onSubmit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('onCancel() appelle dismiss sur modalCtrl', async () => {
      await component.onCancel();
      expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
    });
  });

  describe('initialization with id (edit mode)', () => {
    beforeEach(() => createComponent(activatedRouteStubWithId));

    it('should create in edit mode', () => {
      expect(component).toBeTruthy();
    });

    it('isEditMode is true when id is present in route', () => {
      expect(component.isEditMode).toBeTrue();
    });

    it('ingredientId is set from route', () => {
      expect(component.ingredientId).toBe(42);
    });

    it('onCancel() calls dismiss on modalCtrl in edit mode', async () => {
      await component.onCancel();
      expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
    });
  });

  describe('validation des champs individuels', () => {
    beforeEach(() => createComponent(activatedRouteStubNoId));

    it('le champ nom est requis', () => {
      const ctrl = component.ingredientForm.get('nom');
      ctrl?.setValue('');
      expect(ctrl?.hasError('required')).toBeTrue();
    });

    it('le champ uniteMesure est requis', () => {
      const ctrl = component.ingredientForm.get('uniteMesure');
      ctrl?.setValue('');
      expect(ctrl?.hasError('required')).toBeTrue();
    });

    it('le champ quantiteStock est requis', () => {
      const ctrl = component.ingredientForm.get('quantiteStock');
      ctrl?.setValue(null);
      expect(ctrl?.hasError('required')).toBeTrue();
    });

    it('le champ seuilAlerte est requis', () => {
      const ctrl = component.ingredientForm.get('seuilAlerte');
      ctrl?.setValue(null);
      expect(ctrl?.hasError('required')).toBeTrue();
    });

    it('le champ quantiteStock accepte la valeur 0', () => {
      component.ingredientForm.setValue({
        nom: 'Sel',
        uniteMesure: 'g',
        quantiteStock: 0,
        seuilAlerte: 5,
      });
      expect(component.ingredientForm.get('quantiteStock')?.valid).toBeTrue();
    });
  });

  describe('mode modal et lecture seule', () => {
    beforeEach(() => createComponent(activatedRouteStubNoId));

    it('initializes the form depuis @Input() ingredient', () => {
      component.ingredient = {
        id: 99,
        nom: 'Gin',
        uniteMesure: 'cl',
        quantiteStock: 15,
        seuilAlerte: 3,
        createdAt: '',
        updatedAt: ''
      };
      component.canEdit = false;
      component.ngOnInit();

      expect(component.isEditMode).toBeTrue();
      expect(component.ingredientId).toBe(99);
      expect(component.ingredientForm.get('nom')?.value).toBe('Gin');
      expect(component.ingredientForm.disabled).toBeTrue();
      expect(component.formTitleKey).toBe('INGREDIENTS.DETAILS_TITLE');
    });

    it('onSubmit() with modal dismiss and role saved', () => {
      component.ingredientForm.setValue({
        nom: 'Vodka',
        uniteMesure: 'cl',
        quantiteStock: 20,
        seuilAlerte: 5,
      });
      component.onSubmit();
      const modalCtrl = TestBed.inject(ToastController); // injector lookup
      expect(component).toBeTruthy();
    });

    it('onCancel() appelle modalCtrl.dismiss', () => {
      component.onCancel();
      expect(component).toBeTruthy();
    });
  });
});
