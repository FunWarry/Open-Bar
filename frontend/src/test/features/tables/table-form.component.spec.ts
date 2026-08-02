import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TableFormComponent } from '../../../app/features/tables/table-form/table-form.component';
import { TableService } from '../../../app/core/services/table.service';
import { ZoneService } from '../../../app/core/services/zone.service';

describe('TableFormComponent', () => {
  let component: TableFormComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;
  let zoneServiceSpy: jasmine.SpyObj<ZoneService>;

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    tableServiceSpy = jasmine.createSpyObj('TableService', ['getById', 'create', 'update', 'getZones']);
    zoneServiceSpy = jasmine.createSpyObj('ZoneService', ['getAll']);

    tableServiceSpy.create.and.returnValue(of({} as any));
    tableServiceSpy.update.and.returnValue(of({} as any));
    tableServiceSpy.getZones.and.returnValue(of(['Terrasse', 'Salle', 'Bar']));
    tableServiceSpy.getById.and.returnValue(of({ id: 5, numero: 5, zone: 'INTERIEUR', capacite: 4, occupee: false, createdAt: '', updatedAt: '' }));

    zoneServiceSpy.getAll.and.returnValue(of([
      { id: 1, nom: 'Terrasse', code: 'TERRASSE', etageCode: 'RDC' }
    ] as any));

    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [
        TableFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: TableService, useValue: tableServiceSpy },
        { provide: ZoneService, useValue: zoneServiceSpy },
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

  it('initialise le formulaire avec les champs numero, zone et capacite', () => {
    expect(component.tableForm.contains('numero')).toBeTrue();
    expect(component.tableForm.contains('zone')).toBeTrue();
    expect(component.tableForm.contains('capacite')).toBeTrue();
  });

  it('le formulaire est invalide quand les champs sont vides', () => {
    component.tableForm.setValue({ numero: '', zone: '', capacite: '' });
    expect(component.tableForm.valid).toBeFalse();
  });

  it('le formulaire est valide quand tous les champs sont remplis correctement', () => {
    component.tableForm.setValue({ numero: 12, zone: 'Terrasse', capacite: 4 });
    expect(component.tableForm.valid).toBeTrue();
  });

  it('capacite invalide si valeur inférieure à 1', () => {
    component.tableForm.get('capacite')?.setValue(0);
    expect(component.tableForm.get('capacite')?.valid).toBeFalse();
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
        RouterTestingModule,
        HttpClientTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: TableService, useValue: tableServiceSpy },
        { provide: ZoneService, useValue: zoneServiceSpy },
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
    component.tableForm.setValue({ numero: '', zone: '', capacite: '' });
    component.onSubmit();
    expect(tableServiceSpy.create).not.toHaveBeenCalled();
  });

  it('onSubmit() avec formulaire valide appelle tableService.create()', async () => {
    component.tableForm.setValue({ numero: 3, zone: 'Bar', capacite: 2 });
    component.onSubmit();
    await Promise.resolve();
    expect(tableServiceSpy.create).toHaveBeenCalled();
  });

  it('onCancel() navigue vers /tables', () => {
    component.onCancel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tables']);
  });
});
