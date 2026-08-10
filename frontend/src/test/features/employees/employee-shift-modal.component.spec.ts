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
      'updatePreset'
    ]);
    mockModalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);
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
                TITLE: 'Créneaux',
                NO_SHIFTS: 'Aucun créneau',
                SUMMARY: {
                  PLANNED: 'Prévu: {{hours}}h',
                  REAL: 'Réalisé: {{hours}}h',
                  OVERTIME: 'Heures Sup: {{hours}}h'
                },
                PRESETS: {
                  TITLE: 'Modèles',
                  MANAGE_BTN: 'Gérer',
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
});


