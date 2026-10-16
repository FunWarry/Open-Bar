import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { CommandeFormComponent } from '../../../app/features/commandes/commande-form/commande-form.component';
import { CommandeService } from '../../../app/core/services/commande.service';
import { TableService } from '../../../app/core/services/table.service';

describe('CommandeFormComponent', () => {
  let component: CommandeFormComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;

  const toastMock = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastMock as any));
    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['create', 'update', 'getById']);
    commandeServiceSpy.create.and.returnValue(of({} as any));
    tableServiceSpy = jasmine.createSpyObj('TableService', ['getAll']);
    tableServiceSpy.getAll.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        CommandeFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: TableService, useValue: tableServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(CommandeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.commandeForm).toBeDefined();
    expect(component.commandeForm.get('tableId')?.value).toBe('');
    expect(component.isEditMode).toBeFalse();
    expect(component.commandeId).toBeNull();
  });

  it('should switch to edit mode if an id is present in route', async () => {
    await TestBed.resetTestingModule();

    const routeWithId = { snapshot: { paramMap: { get: () => '5' } } };

    await TestBed.configureTestingModule({
      imports: [
        CommandeFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: TableService, useValue: tableServiceSpy },
        { provide: ActivatedRoute, useValue: routeWithId }
      ]
    }).compileComponents();

    commandeServiceSpy.getById.and.returnValue(of({ id: 5, tableId: 2, items: [] } as any));

    const fixture = TestBed.createComponent(CommandeFormComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.isEditMode).toBeTrue();
    expect(comp.commandeId).toBe(5);
  });

  it('onSubmit() does not navigate if form is invalid', () => {
    component.commandeForm.get('tableId')?.setValue('');
    component.onSubmit();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('onSubmit() navigue vers /commandes si le formulaire est valide', async () => {
    component.commandeForm.get('tableId')?.setValue(1);
    component.onSubmit();
    // Wait for resolution de la promesse du toast
    await Promise.resolve();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/commandes']);
  });

  it('onSubmit() displays success toast if form is valid', async () => {
    component.commandeForm.get('tableId')?.setValue(2);
    component.onSubmit();
    await Promise.resolve();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'success', duration: 3000 })
    );
  });

  it('field tableId should be required', () => {
    const ctrl = component.commandeForm.get('tableId');
    ctrl?.setValue('');
    expect(ctrl?.valid).toBeFalse();
    expect(ctrl?.errors?.['required']).toBeTrue();
  });

  it('onSubmit() displays error toast if creation fails', async () => {
    commandeServiceSpy.create.and.returnValue(throwError(() => new Error('Server error')));
    component.commandeForm.get('tableId')?.setValue(2);
    component.onSubmit();
    await Promise.resolve();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'danger', duration: 3000 })
    );
  });

  it('onCancel() navigates to /commandes', () => {
    component.onCancel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/commandes']);
  });

  it('computes tableOptions correctly from loaded tables', () => {
    component.tables = [
      { id: 10, numero: 5, capacite: 4, zone: 'Terrasse', occupee: false, createdAt: '', updatedAt: '' },
      { id: 20, numero: 8, capacite: 2, zone: 'Bar', occupee: true, createdAt: '', updatedAt: '' },
    ];
    const opts = component.tableOptions();
    expect(opts).toHaveSize(2);
    expect(opts[0].value).toBe(10);
    expect(opts[0].label).toBe('Table #5');
    expect(opts[0].badgeType).toBe('success');
    expect(opts[1].value).toBe(20);
    expect(opts[1].label).toBe('Table #8');
    expect(opts[1].badgeType).toBe('warning');
  });

  it('computes selectedTable correctly when tableId is selected', () => {
    component.tables = [
      { id: 10, numero: 5, capacite: 4, zone: 'Terrasse', occupee: false, createdAt: '', updatedAt: '' },
    ];
    component.commandeForm.get('tableId')?.setValue(10);
    expect(component.selectedTable()?.id).toBe(10);
    expect(component.selectedTable()?.numero).toBe(5);
  });

  it('onSubmit() calls update when in edit mode', async () => {
    component.isEditMode = true;
    component.commandeId = 42;
    commandeServiceSpy.update.and.returnValue(of({} as any));

    component.commandeForm.get('tableId')?.setValue(10);
    component.commandeForm.get('notes')?.setValue('VIP guest');
    component.onSubmit();
    await Promise.resolve();

    expect(commandeServiceSpy.update).toHaveBeenCalledWith(42, {
      tableId: 10,
      notes: 'VIP guest',
    });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/commandes']);
  });
});
