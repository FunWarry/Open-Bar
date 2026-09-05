import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeesComponent } from '../../../app/features/employees/employees.component';
import { UserService } from '../../../app/core/services/user.service';
import { ShiftService } from '../../../app/core/services/shift.service';
import { ModalController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { User } from '../../../app/core/models/user.model';
import { EmployeeShift } from '../../../app/core/models/shift.model';

describe('EmployeesComponent', () => {
  let component: EmployeesComponent;
  let fixture: ComponentFixture<EmployeesComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockShiftService: jasmine.SpyObj<ShiftService>;
  let mockModalCtrl: jasmine.SpyObj<ModalController>;

  const sampleUsers: User[] = [
    { id: 1, username: 'serveur1', email: 'serveur1@openbar.fr', nom: 'Bernard', prenom: 'Lucas', roles: ['SERVEUR'], enabled: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 2, username: 'barman1', email: 'barman1@openbar.fr', nom: 'Moreau', prenom: 'Antoine', roles: ['BARMAN'], enabled: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 3, username: 'manager1', email: 'manager1@openbar.fr', nom: 'Martin', prenom: 'Sophie', roles: ['MANAGER'], enabled: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
  ];

  const sampleShifts: EmployeeShift[] = [
    {
      id: 10,
      userId: 1,
      dateShift: '2026-08-10',
      typeShift: 'MATIN',
      typePoste: 'SERVEUR',
      heureDebut: '08:00',
      heureFin: '16:00',
      heuresEffectuees: 8
    },
    {
      id: 11,
      userId: 2,
      dateShift: '2026-08-10',
      typeShift: 'SOIR',
      typePoste: 'BARMAN',
      heureDebut: '17:00',
      heureFin: '01:00',
      heuresEffectuees: 8
    }
  ];

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['getUsers']);
    mockShiftService = jasmine.createSpyObj('ShiftService', ['getShiftsForWeek']);
    mockModalCtrl = jasmine.createSpyObj('ModalController', ['create']);

    mockUserService.getUsers.and.returnValue(of(sampleUsers));
    mockShiftService.getShiftsForWeek.and.returnValue(of(sampleShifts));
    mockModalCtrl.create.and.returnValue(
      Promise.resolve({
        present: () => Promise.resolve(),
        onDidDismiss: () => Promise.resolve({ data: null })
      } as any)
    );

    await TestBed.configureTestingModule({
      imports: [
        EmployeesComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              EMPLOYEES: {
                TITLE: 'Gestion du Personnel',
                SUBTITLE: 'Browse the team',
                SEARCH_PLACEHOLDER: 'Rechercher...',
                NO_EMPLOYEES: 'No employees'
              }
            }
          },
          translocoConfig: {
            availableLangs: ['fr'],
            defaultLang: 'fr'
          }
        })
      ],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: mockUserService },
        { provide: ShiftService, useValue: mockShiftService },
        { provide: ModalController, useValue: mockModalCtrl }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and load employees summaries', () => {
    expect(component).toBeTruthy();
    expect(mockUserService.getUsers).toHaveBeenCalled();
    expect(component.employeeSummaries).toHaveSize(3);
    expect(component.loading).toBeFalse();
  });

  it('should calculate correct weekly total hours for employee', () => {
    const serveurSummary = component.employeeSummaries.find(es => es.user.id === 1);
    expect(serveurSummary).toBeTruthy();
    expect(serveurSummary?.totalHours).toBe(8);
    expect(serveurSummary?.shiftsCount).toBe(1);
  });

  it('should filter employees by search query', () => {
    component.searchQuery = 'Lucas';
    component.onSearchChange();

    expect(component.filteredSummaries).toHaveSize(1);
    expect(component.filteredSummaries[0].user.username).toBe('serveur1');
  });

  it('should filter employees by role', () => {
    component.selectedRole = 'BARMAN';
    component.onRoleChange();

    expect(component.filteredSummaries).toHaveSize(1);
    expect(component.filteredSummaries[0].user.username).toBe('barman1');
  });

  it('should open modal when clicking employee', async () => {
    await component.openEmployeeShiftsModal(sampleUsers[0]);

    expect(mockModalCtrl.create).toHaveBeenCalled();
  });

  it('getRoleBadgeColor() and trackById() should return correct values', () => {
    expect(component.getRoleBadgeColor('MANAGER')).toBe('warning');
    expect(component.getRoleBadgeColor('SERVEUR')).toBe('success');
    expect(component.getRoleBadgeColor('BARMAN')).toBe('secondary');
    expect(component.getRoleBadgeColor('ADMIN')).toBe('tertiary');
    expect(component.getRoleBadgeColor('OTHER')).toBe('primary');

    expect(component.trackById(0, component.employeeSummaries[0])).toBe(1);
  });
});

