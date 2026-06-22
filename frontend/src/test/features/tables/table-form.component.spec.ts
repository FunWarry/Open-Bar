import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Store } from '@ngrx/store';
import { ToastController } from '@ionic/angular/standalone';
import { TableFormComponent } from '../../../app/features/tables/table-form/table-form.component';

describe('TableFormComponent', () => {
  let component: TableFormComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let storeSpy: jasmine.SpyObj<Store>;

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    storeSpy = jasmine.createSpyObj('Store', ['dispatch', 'select']);

    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [
        TableFormComponent,
        ReactiveFormsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: Store, useValue: storeSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: {} } }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(TableFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initialise le formulaire avec les champs number, zone et capacity', () => {
    expect(component.tableForm.contains('number')).toBeTrue();
    expect(component.tableForm.contains('zone')).toBeTrue();
    expect(component.tableForm.contains('capacity')).toBeTrue();
  });

  it('le formulaire est invalide quand les champs sont vides', () => {
    component.tableForm.setValue({ number: '', zone: '', capacity: '' });
    expect(component.tableForm.valid).toBeFalse();
  });

  it('le formulaire est valide quand tous les champs sont remplis correctement', () => {
    component.tableForm.setValue({ number: '12', zone: 'Terrasse', capacity: '4' });
    expect(component.tableForm.valid).toBeTrue();
  });

  it('capacity invalide si valeur inférieure à 1', () => {
    component.tableForm.get('capacity')?.setValue('0');
    expect(component.tableForm.get('capacity')?.valid).toBeFalse();
  });

  it('isEditMode est false par défaut (pas de paramètre id)', () => {
    expect(component.isEditMode).toBeFalse();
    expect(component.tableId).toBeNull();
  });

  it('isEditMode est true si un id est présent dans la route', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        TableFormComponent,
        ReactiveFormsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: Store, useValue: storeSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: 5 } } }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(TableFormComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.isEditMode).toBeTrue();
    expect(comp.tableId).toBe(5);
  });

  it('onSubmit() ne déclenche rien si le formulaire est invalide', () => {
    component.tableForm.setValue({ number: '', zone: '', capacity: '' });
    component.onSubmit();
    expect(storeSpy.dispatch).not.toHaveBeenCalled();
  });

  it('onSubmit() avec formulaire valide ne lève pas d\'erreur', () => {
    component.tableForm.setValue({ number: '3', zone: 'Bar', capacity: '2' });
    expect(() => component.onSubmit()).not.toThrow();
  });

  it('onCancel() navigue vers /tables', () => {
    component.onCancel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tables']);
  });
});
