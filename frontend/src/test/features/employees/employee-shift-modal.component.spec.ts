import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeeShiftModalComponent } from '../../../app/features/employees/employee-shift-modal/employee-shift-modal.component';
import { ShiftService } from '../../../app/core/services/shift.service';
import { ModalController, AlertController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { User } from '../../../app/core/models/user.model';
import { EmployeeShift, ShiftPreset } from '../../../app/core/models/shift.model';

describe('EmployeeShiftModalComponent', () => {
  let component: EmployeeShiftModalComponent;
  let fixture: ComponentFixture<EmployeeShiftModalComponent>;
  let mockShiftService: jasmine.SpyObj<ShiftService>;
  let mockModalCtrl: jasmine.SpyObj<ModalController>;
  let mockAlertCtrl: jasmine.SpyObj<AlertController>;

  const sampleUser: User = {
    id: 1,
    username: 'serveur1',
    email: 'serveur1@openbar.fr',
    nom: 'Bernard',
    prenom: 'Lucas',
    roles: ['SERVEUR'],
    enabled: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  };

  const sampleShift: EmployeeShift = {
    id: 10,
    userId: 1,
    dateShift: '2026-08-10',
    typeShift: 'MATIN',
    typePoste: 'SERVEUR',
    heureDebut: '08:00',
    heureFin: '16:00',
    heuresPrevues: 7.5,
    heuresEffectuees: 8,
    heuresSup: 0.5,
    notes: 'Service terrasse'
  };

  const samplePreset: ShiftPreset = {
    id: 1,
    typeShift: 'MATIN',
    nom: 'Service Matin',
    heureDebut: '08:00',
    heureFin: '16:00',
    dureePauseMinutes: 30
  };

  beforeEach(async () => {
    mockShiftService = jasmine.createSpyObj('ShiftService', [
      'getShiftsForWeek',
      'createShift',
      'updateShift',
      'deleteShift',
      'getPresets',
      'updatePreset',
      'getShiftHistory'
    ]);
    mockModalCtrl = jasmine.createSpyObj('ModalController', ['dismiss', 'create']);
    mockAlertCtrl = jasmine.createSpyObj('AlertController', ['create']);

    mockShiftService.getShiftsForWeek.and.returnValue(of([sampleShift]));
    mockShiftService.getPresets.and.returnValue(of([samplePreset]));

    await TestBed.configureTestingModule({
      imports: [
        EmployeeShiftModalComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              SHIFTS: {
                TITLE: 'Shifts',
                NO_SHIFTS: 'No shifts',
                SUMMARY: {
                  PLANNED: 'Planned: {{hours}}h',
                  REAL: 'Actual: {{hours}}h',
                  OVERTIME: 'Heures Sup: {{hours}}h'
                },
                PRESETS: {
                  TITLE: 'Presets',
                  MANAGE_BTN: 'Manage',
                  CLOSE_BTN: 'Fermer',
                  SAVE_PRESET: 'Enregistrer',
                  DEFAULT_NOTICE: 'Notice'
                }
              }
            }
          },
          translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' }
        })
      ],
      providers: [
        provideMockStore({
          initialState: {
            auth: {
              user: {
                id: 99,
                username: 'manager',
                roles: ['MANAGER']
              }
            }
          }
        }),
        { provide: ShiftService, useValue: mockShiftService },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: AlertController, useValue: mockAlertCtrl }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeShiftModalComponent);
    component = fixture.componentInstance;
    component.employee = sampleUser;
    fixture.detectChanges();
  });

  it('should create modal component and load shifts and presets', () => {
    expect(component).toBeTruthy();
    expect(mockShiftService.getShiftsForWeek).toHaveBeenCalled();
    expect(mockShiftService.getPresets).toHaveBeenCalled();
    expect(component.shifts).toHaveSize(1);
    expect(component.totalWeekHours).toBe(8);
    expect(component.totalPlannedWeekHours).toBe(7.5);
    expect(component.totalOvertimeWeekHours).toBe(0.5);
  });

  it('should auto-fill times when selecting a shift type from presets', () => {
    component.onShiftTypeChange('MATIN');
    expect(component.formHeureDebut).toBe('08:00');
    expect(component.formHeureFin).toBe('16:00');
    expect(component.formDureePauseMinutes).toBe(30);
    expect(component.formHeuresPrevues).toBe(7.5);
  });

  it('should navigate to previous and next week', () => {
    const initialMondayTime = component.currentWeekStart.getTime();
    component.prevWeek();
    expect(component.currentWeekStart.getTime()).toBe(initialMondayTime - 7 * 24 * 60 * 60 * 1000);

    component.nextWeek();
    expect(component.currentWeekStart.getTime()).toBe(initialMondayTime);
  });

  it('should open new shift form and save created shift', () => {
    component.openNewShiftForm();
    expect(component.showForm).toBeTrue();

    mockShiftService.createShift.and.returnValue(of(sampleShift));
    component.saveShift();

    expect(mockShiftService.createShift).toHaveBeenCalled();
    expect(component.showForm).toBeFalse();
  });

  it('should open edit shift form and update existing shift', () => {
    component.openEditShiftForm(sampleShift);
    expect(component.showForm).toBeTrue();
    expect(component.editingShiftId).toBe(10);
    expect(component.formTypeShift).toBe('MATIN');

    mockShiftService.updateShift.and.returnValue(of(sampleShift));
    component.saveShift();

    expect(mockShiftService.updateShift).toHaveBeenCalledWith(10, jasmine.any(Object));
    expect(component.showForm).toBeFalse();
  });

  it('confirmDelete() should prompt alert and execute deleteShift on handler', async () => {
    let confirmHandler: () => void = () => {};
    mockAlertCtrl.create.and.callFake((options: any) => {
      const deleteBtn = options.buttons.find((b: any) => b.role === 'destructive');
      if (deleteBtn && deleteBtn.handler) {
        confirmHandler = deleteBtn.handler;
      }
      return Promise.resolve({
        present: () => Promise.resolve()
      } as any);
    });
    mockShiftService.deleteShift.and.returnValue(of(undefined as any));

    await component.confirmDeleteShift(sampleShift);
    expect(mockAlertCtrl.create).toHaveBeenCalled();

    confirmHandler();
    expect(mockShiftService.deleteShift).toHaveBeenCalledWith(10);
  });

  it('togglePresetManager() and savePreset() should manage presets', () => {
    expect(component.showPresetManager).toBeFalse();
    component.togglePresetManager();
    expect(component.showPresetManager).toBeTrue();

    const updatedPreset: ShiftPreset = { ...samplePreset, dureePauseMinutes: 45 };
    mockShiftService.updatePreset.and.returnValue(of(updatedPreset));

    component.savePreset(updatedPreset);
    expect(mockShiftService.updatePreset).toHaveBeenCalledWith('MATIN', updatedPreset);
    expect(component.presets[0].dureePauseMinutes).toBe(45);
  });

  it('recalculatePlannedHours() should handle overnight shifts spanning midnight', () => {
    component.formHeureDebut = '22:00';
    component.formHeureFin = '06:00';
    component.formDureePauseMinutes = 60;
    component.recalculatePlannedHours();
    expect(component.formHeuresPrevues).toBe(7);
  });

  it('resetToCurrentWeek() should reset week start to Monday and reload', () => {
    component.prevWeek();
    component.resetToCurrentWeek();
    expect(mockShiftService.getShiftsForWeek).toHaveBeenCalled();
  });

  it('onShiftTypeChange() and getShiftBadgeColor() should support all shift types', () => {
    component.onShiftTypeChange('SOIR');
    expect(component.formHeureDebut).toBe('16:00');
    expect(component.getShiftBadgeColor('SOIR')).toBe('primary');

    component.onShiftTypeChange('COUPURE');
    expect(component.formHeureDebut).toBe('11:00');
    expect(component.getShiftBadgeColor('COUPURE')).toBe('tertiary');

    component.onShiftTypeChange('NUIT');
    expect(component.formHeureDebut).toBe('22:00');
    expect(component.getShiftBadgeColor('NUIT')).toBe('secondary');

    component.onShiftTypeChange('CONGE');
    expect(component.formHeureDebut).toBe('00:00');
    expect(component.getShiftBadgeColor('CONGE')).toBe('medium');

    expect(component.getShiftBadgeColor('MATIN')).toBe('warning');
  });

  it('totalPlannedWeekHours and totalOvertimeWeekHours getters should compute correct values', () => {
    component.shifts = [
      { id: 1, userId: 1, dateShift: '2026-08-10', typeShift: 'MATIN', typePoste: 'SERVEUR', heureDebut: '08:00', heureFin: '16:00', heuresPrevues: 8, heuresSup: 2 },
      { id: 2, userId: 1, dateShift: '2026-08-11', typeShift: 'SOIR', typePoste: 'SERVEUR', heureDebut: '16:00', heureFin: '00:00', heuresPrevues: 7.5, heuresSup: 1 }
    ];

    expect(component.totalPlannedWeekHours).toBe(15.5);
    expect(component.totalOvertimeWeekHours).toBe(3);
  });

  it('should dismiss modal on dismiss call', () => {
    component.dismiss();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });

  it('ngOnInit() should initialize in create mode when openInCreateMode is true and initialDate is provided', () => {
    const newFixture = TestBed.createComponent(EmployeeShiftModalComponent);
    const newComponent = newFixture.componentInstance;
    newComponent.employee = sampleUser;
    newComponent.openInCreateMode = true;
    newComponent.initialDate = '2026-08-15';
    newComponent.ngOnInit();

    expect(newComponent.showForm).toBeTrue();
    expect(newComponent.formDate).toBe('2026-08-15');
    expect(newComponent.editingShiftId).toBeNull();
  });

  it('ngOnInit() should not open create form when openInCreateMode is false', () => {
    const newFixture = TestBed.createComponent(EmployeeShiftModalComponent);
    const newComponent = newFixture.componentInstance;
    newComponent.employee = sampleUser;
    newComponent.openInCreateMode = false;
    newComponent.initialDate = '2026-08-15';
    newComponent.ngOnInit();

    expect(newComponent.showForm).toBeFalse();
  });

  describe('Access Control Rules (#284)', () => {
    it('should grant full permissions to MANAGER / ADMIN', () => {
      component.currentUser = { id: 99, username: 'admin', roles: ['ADMIN'] } as User;
      component.isManagerOrAdmin = true;

      expect(component.isManagerOrAdmin).toBeTrue();
      expect(component.canCreateShift).toBeTrue();
      expect(component.canEditShift).toBeTrue();
      expect(component.canEditPlanningFields).toBeTrue();
      expect(component.canEditRealHours).toBeTrue();
      expect(component.canDeleteShift).toBeTrue();
    });

    it('should allow employee to edit own real hours but restrict planning fields and creation', () => {
      component.currentUser = { id: 1, username: 'serveur1', roles: ['SERVEUR'] } as User;
      component.isManagerOrAdmin = false;

      expect(component.isSelf).toBeTrue();
      expect(component.canCreateShift).toBeFalse();
      expect(component.canEditShift).toBeTrue();
      expect(component.canEditPlanningFields).toBeFalse();
      expect(component.canEditRealHours).toBeTrue();
      expect(component.canDeleteShift).toBeFalse();
    });

    it('should completely restrict other employees (view-only mode)', () => {
      component.currentUser = { id: 2, username: 'barman1', roles: ['BARMAN'] } as User;
      component.isManagerOrAdmin = false;

      expect(component.isSelf).toBeFalse();
      expect(component.canCreateShift).toBeFalse();
      expect(component.canEditShift).toBeFalse();
      expect(component.canEditPlanningFields).toBeFalse();
      expect(component.canEditRealHours).toBeFalse();
      expect(component.canDeleteShift).toBeFalse();
    });

    it('openNewShiftForm() should do nothing when canCreateShift is false', () => {
      component.currentUser = { id: 1, username: 'serveur1', roles: ['SERVEUR'] } as User;
      component.isManagerOrAdmin = false;
      component.showForm = false;

      component.openNewShiftForm();
      expect(component.showForm).toBeFalse();
    });

    it('saveShift() should do nothing when canEditShift is false', () => {
      component.currentUser = { id: 2, username: 'barman1', roles: ['BARMAN'] } as User;
      component.isManagerOrAdmin = false;
      component.formDate = '2026-08-10';
      component.formHeureDebut = '08:00';
      component.formHeureFin = '16:00';

      component.saveShift();
      expect(mockShiftService.updateShift).not.toHaveBeenCalled();
      expect(mockShiftService.createShift).not.toHaveBeenCalled();
    });
  });

  describe('openShiftHistoryModal()', () => {
    it('should create and present the ShiftHistoryModal with shiftId and employee name', async () => {
      const mockModal = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
      mockModalCtrl.create.and.returnValue(Promise.resolve(mockModal as any));

      component.openEditShiftForm(sampleShift); // sets editingShiftId = 10
      await component.openShiftHistoryModal();

      expect(mockModalCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({
        componentProps: jasmine.objectContaining({ shiftId: 10 })
      }));
      expect(mockModal.present).toHaveBeenCalled();
    });

    it('should do nothing when editingShiftId is null', async () => {
      component.editingShiftId = null;
      await component.openShiftHistoryModal();
      expect(mockModalCtrl.create).not.toHaveBeenCalled();
    });
  });
});


