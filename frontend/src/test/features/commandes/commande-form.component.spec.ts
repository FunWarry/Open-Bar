import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
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
        RouterTestingModule
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

  it('devrait initialiser le formulaire avec les valeurs par défaut', () => {
    expect(component.commandeForm).toBeDefined();
    expect(component.commandeForm.get('tableId')?.value).toBe('');
    expect(component.isEditMode).toBeFalse();
    expect(component.commandeId).toBeNull();
  });

  it('devrait passer en mode édition si un id est présent dans la route', async () => {
    await TestBed.resetTestingModule();

    const routeWithId = { snapshot: { paramMap: { get: () => '5' } } };

    await TestBed.configureTestingModule({
      imports: [
        CommandeFormComponent,
        ReactiveFormsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: TableService, useValue: tableServiceSpy },
        { provide: ActivatedRoute, useValue: routeWithId }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(CommandeFormComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.isEditMode).toBeTrue();
    expect(comp.commandeId).toBe(5);
  });

  it('onSubmit() ne navigue pas si le formulaire est invalide', () => {
    component.commandeForm.get('tableId')?.setValue('');
    component.onSubmit();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('onSubmit() navigue vers /commandes si le formulaire est valide', async () => {
    component.commandeForm.get('tableId')?.setValue(1);
    component.onSubmit();
    // Attendre la résolution de la promesse du toast
    await Promise.resolve();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/commandes']);
  });

  it('onSubmit() affiche un toast de succès si le formulaire est valide', async () => {
    component.commandeForm.get('tableId')?.setValue(2);
    component.onSubmit();
    await Promise.resolve();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'success', duration: 3000 })
    );
  });

  it('le champ tableId doit être requis', () => {
    const ctrl = component.commandeForm.get('tableId');
    ctrl?.setValue('');
    expect(ctrl?.valid).toBeFalse();
    expect(ctrl?.errors?.['required']).toBeTrue();
  });
});
