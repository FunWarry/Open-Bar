import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';
import { IngredientFormComponent } from '../../../app/features/ingredients/ingredient-form/ingredient-form.component';
import { IngredientService } from '../../../app/core/services/ingredient.service';

import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('IngredientFormComponent', () => {
  let component: IngredientFormComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
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

    it('le formulaire est initialisé avec des champs vides ou par défaut', () => {
      const form = component.ingredientForm;
      expect(form.get('nom')?.value).toBe('');
      expect(form.get('uniteMesure')?.value).toBe('');
      expect(form.get('quantiteStock')?.value).toBe(0);
      expect(form.get('seuilAlerte')?.value).toBe(5);
    });

    it('le formulaire est invalide quand les champs requis sont vides', () => {
      component.ingredientForm.get('nom')?.setValue('');
      component.ingredientForm.get('uniteMesure')?.setValue('');
      expect(component.ingredientForm.invalid).toBeTrue();
    });

    it('le formulaire est valide quand tous les champs requis sont remplis', () => {
      component.ingredientForm.setValue({
        nom: 'Citron',
        uniteMesure: 'kg',
        quantiteStock: 10,
        seuilAlerte: 5,
      });
      expect(component.ingredientForm.valid).toBeTrue();
    });

    it('le champ quantiteStock est invalide si négatif', () => {
      component.ingredientForm.patchValue({ quantiteStock: -1 });
      expect(component.ingredientForm.get('quantiteStock')?.invalid).toBeTrue();
    });

    it('onSubmit() ne navigue pas si le formulaire est invalide', () => {
      component.ingredientForm.get('nom')?.setValue('');
      component.ingredientForm.get('uniteMesure')?.setValue('');
      component.onSubmit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
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
});
