import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastController, ModalController } from '@ionic/angular/standalone';
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
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;
  let zoneServiceSpy: jasmine.SpyObj<ZoneService>;

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
  const mockChildModal = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: { confirmed: true } }))
  };

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss', 'getTop']);
    tableServiceSpy = jasmine.createSpyObj('TableService', ['getById', 'create', 'update', 'delete', 'getZones']);
    zoneServiceSpy = jasmine.createSpyObj('ZoneService', ['getAll']);

    tableServiceSpy.create.and.returnValue(of({ id: 10, numero: 3, zone: 'Bar', capacite: 2 } as any));
    tableServiceSpy.update.and.returnValue(of({ id: 5, numero: 5, zone: 'INTERIEUR', capacite: 4 } as any));
    tableServiceSpy.delete.and.returnValue(of(undefined as any));
    tableServiceSpy.getZones.and.returnValue(of(['Terrasse', 'Salle', 'Bar']));
    tableServiceSpy.getById.and.returnValue(of({ id: 5, numero: 5, zone: 'INTERIEUR', capacite: 4, occupee: false, createdAt: '', updatedAt: '' }));

    zoneServiceSpy.getAll.and.returnValue(of([
      { id: 1, nom: 'Terrasse', code: 'TERRASSE', etageCode: 'RDC' }
    ] as any));

    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));
    modalCtrlSpy.getTop.and.returnValue(Promise.resolve({ dismiss: jasmine.createSpy('dismiss') } as any));
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockChildModal as any));

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
        { provide: ModalController, useValue: modalCtrlSpy },
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

  afterEach(() => component.ngOnDestroy());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initializes the form avec les champs numero, zone et capacite', () => {
    expect(component.tableForm.contains('numero')).toBeTrue();
    expect(component.tableForm.contains('zone')).toBeTrue();
    expect(component.tableForm.contains('capacite')).toBeTrue();
  });

  it('form should be invalid quand les champs sont vides', () => {
    component.tableForm.setValue({ numero: '', zone: '', capacite: '' });
    expect(component.tableForm.valid).toBeFalse();
  });

  it('form should be valid quand tous les champs sont remplis correctement', () => {
    component.tableForm.setValue({ numero: 12, zone: 'Terrasse', capacite: 4 });
    expect(component.tableForm.valid).toBeTrue();
  });

  it('capacity invalid if value is less than 1', () => {
    component.tableForm.get('capacite')?.setValue(0);
    expect(component.tableForm.get('capacite')?.valid).toBeFalse();
  });

  it('isEditMode is false by default (no id parameter)', () => {
    expect(component.isEditMode).toBeFalse();
    expect(component.tableId).toBeNull();
  });

  it('isEditMode is true if tableId input or route param is provided', () => {
    component.tableId = 5;
    component.ngOnInit();
    expect(component.isEditMode).toBeTrue();
    expect(component.tableId).toBe(5);
  });

  it('onSubmit() does not trigger anything if form is invalid', () => {
    component.tableForm.setValue({ numero: '', zone: '', capacite: '' });
    component.onSubmit();
    expect(tableServiceSpy.create).not.toHaveBeenCalled();
  });

  it('onSubmit() en mode création appelle tableService.create() et ferme la modale', fakeAsync(() => {
    component.isEditMode = false;
    component.tableForm.setValue({ numero: 3, zone: 'Bar', capacite: 2 });
    component.onSubmit();
    tick();
    expect(tableServiceSpy.create).toHaveBeenCalled();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'saved' }));
  }));

  it('onSubmit() en mode édition appelle tableService.update() et ferme la modale', fakeAsync(() => {
    component.isEditMode = true;
    component.tableId = 5;
    component.tableForm.setValue({ numero: 5, zone: 'INTERIEUR', capacite: 6 });
    component.onSubmit();
    tick();
    expect(tableServiceSpy.update).toHaveBeenCalledWith(5, jasmine.objectContaining({ numero: 5, capacite: 6 }));
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'saved' }));
  }));

  it('onDelete() demande confirmation via modal et supprime la table', fakeAsync(() => {
    component.isEditMode = true;
    component.tableId = 5;

    component.onDelete();
    tick();
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(tableServiceSpy.delete).toHaveBeenCalledWith(5);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'deleted', tableId: 5 }));
  }));

  it('onCancel() ferme la modale', fakeAsync(() => {
    component.onCancel();
    tick();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  }));
});
