import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeeShiftModalComponent } from '../../../app/features/employees/employee-shift-modal/employee-shift-modal.component';
import { ShiftService } from '../../../app/core/services/shift.service';
import { ModalController, AlertController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { User } from '../../../app/core/models/user.model';
import { EmployeeShift } from '../../../app/core/models/shift.model';

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
    heuresEffectuees: 8,
    notes: 'Service terrasse'
  };

  beforeEach(async () => {
    mockShiftService = jasmine.createSpyObj('ShiftService', [
      'getShiftsForWeek',
      'createShift',
      'updateShift',
      'deleteShift'
    ]);
    mockModalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);
    mockAlertCtrl = jasmine.createSpyObj('AlertController', ['create']);

    mockShiftService.getShiftsForWeek.and.returnValue(of([sampleShift]));

    await TestBed.configureTestingModule({
      imports: [
        EmployeeShiftModalComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              SHIFTS: {
                TITLE: 'Créneaux',
                NO_SHIFTS: 'Aucun créneau'
              }
            }
          },
          translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' }
        })
      ],
      providers: [
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

  it('should create modal component and load shifts for employee', () => {
    expect(component).toBeTruthy();
    expect(mockShiftService.getShiftsForWeek).toHaveBeenCalled();
    expect(component.shifts).toHaveSize(1);
    expect(component.totalWeekHours).toBe(8);
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

  it('should dismiss modal on dismiss call', () => {
    component.dismiss();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
