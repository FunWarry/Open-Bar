import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeesComponent, EmployeeSummary } from '../../../app/features/employees/employees.component';
import { UserService } from '../../../app/core/services/user.service';
import { ShiftService } from '../../../app/core/services/shift.service';
import { ModalController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { User } from '../../../app/core/models/user.model';
import { EmployeeShift } from '../../../app/core/models/shift.model';
import { CsvExportService, CsvColumn } from '../../../app/core/services/csv-export.service';

describe('EmployeesComponent', () => {
  let component: EmployeesComponent;
  let fixture: ComponentFixture<EmployeesComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockShiftService: jasmine.SpyObj<ShiftService>;
  let mockModalCtrl: jasmine.SpyObj<ModalController>;
  let mockCsvExportService: jasmine.SpyObj<CsvExportService>;

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
    mockCsvExportService = jasmine.createSpyObj('CsvExportService', ['exportTable']);

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
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: CsvExportService, useValue: mockCsvExportService }
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

  it('goToShiftPresets() navigates to /manager/shift-presets', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    component.goToShiftPresets();
    expect(router.navigate).toHaveBeenCalledWith(['/manager/shift-presets']);
  });

  it('renders employees presets button with data-testid', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const presetsBtn = compiled.querySelector('[data-testid="employees-btn-presets"]');
    expect(presetsBtn).toBeTruthy();
  });

  it('exportEmployeeHoursCsv should export table when employee summaries exist and format correctly', () => {
    component.filteredSummaries = [
      {
        user: {
          id: 1,
          username: 'serveur1',
          email: 'serveur1@openbar.fr',
          nom: 'Bernard',
          prenom: 'Lucas',
          roles: ['SERVEUR', 'BARMAN'],
          enabled: true,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01'
        },
        shiftsCount: 2,
        totalHours: 15.5
      },
      {
        user: {
          id: 2,
          username: 'emptyname',
          email: 'empty@openbar.fr',
          nom: '',
          prenom: '',
          roles: [],
          enabled: true,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01'
        },
        shiftsCount: 0,
        totalHours: 0
      }
    ];

    component.exportEmployeeHoursCsv();

    expect(mockCsvExportService.exportTable).toHaveBeenCalledWith(
      jasmine.any(Array),
      jasmine.any(Array),
      'heures_employes'
    );

    const callArgs = mockCsvExportService.exportTable.calls.mostRecent().args;
    const columns = callArgs[1] as CsvColumn<EmployeeSummary>[];

    const idCol = columns.find(c => c.header === 'ID');
    const nameCol = columns.find(c => c.header === 'Nom_Complet');
    const userCol = columns.find(c => c.header === 'Identifiant');
    const emailCol = columns.find(c => c.header === 'Email');
    const rolesCol = columns.find(c => c.header === 'Roles');
    const hoursCol = columns.find(c => c.header === 'Heures_Travaillees');

    expect(idCol?.formatter?.(null, component.filteredSummaries[0])).toBe(1);
    expect(nameCol?.formatter?.(null, component.filteredSummaries[0])).toBe('Bernard Lucas');
    expect(nameCol?.formatter?.(null, component.filteredSummaries[1])).toBe('emptyname');
    expect(userCol?.formatter?.(null, component.filteredSummaries[0])).toBe('serveur1');
    expect(emailCol?.formatter?.(null, component.filteredSummaries[0])).toBe('serveur1@openbar.fr');
    expect(rolesCol?.formatter?.(null, component.filteredSummaries[0])).toBe('SERVEUR, BARMAN');
    expect(rolesCol?.formatter?.(null, component.filteredSummaries[1])).toBe('');
    expect(hoursCol?.formatter?.(15.5, component.filteredSummaries[0])).toBe('15.50');
    expect(hoursCol?.formatter?.(null, component.filteredSummaries[1])).toBe('0.00');
  });

  it('exportEmployeeHoursCsv should return early when filteredSummaries is empty', () => {
    component.filteredSummaries = [];
    mockCsvExportService.exportTable.calls.reset();

    component.exportEmployeeHoursCsv();

    expect(mockCsvExportService.exportTable).not.toHaveBeenCalled();
  });

  describe('KPI and Statistics Getters', () => {
    it('totalEmployeesCount returns total count of employees', () => {
      expect(component.totalEmployeesCount).toBe(3);
    });

    it('totalWeeklyHours computes sum of all employee hours', () => {
      // sampleShifts has 8h for user 1 and 8h for user 2 = 16h total
      expect(component.totalWeeklyHours).toBe(16);
    });

    it('totalWeeklyShifts computes sum of shifts count', () => {
      // 1 shift for user 1 and 1 shift for user 2 = 2 shifts total
      expect(component.totalWeeklyShifts).toBe(2);
    });

    it('averageWeeklyHours returns correct rounded average', () => {
      // 16 hours / 3 employees = 5.3
      expect(component.averageWeeklyHours).toBe('5.3');
    });

    it('averageWeeklyHours returns 0.0 when no employees', () => {
      component.employeeSummaries = [];
      expect(component.averageWeeklyHours).toBe('0.0');
    });

    it('roleCounts calculates accurate count per role', () => {
      const counts = component.roleCounts;
      expect(counts['SERVEUR']).toBe(1);
      expect(counts['BARMAN']).toBe(1);
      expect(counts['MANAGER']).toBe(1);
      expect(counts['ADMIN']).toBe(0);
    });
  });

  describe('Filter Controls and Helpers', () => {
    it('selectRole updates selectedRole and re-filters', () => {
      component.selectRole('SERVEUR');
      expect(component.selectedRole).toBe('SERVEUR');
      expect(component.filteredSummaries).toHaveSize(1);
      expect(component.filteredSummaries[0].user.roles).toContain('SERVEUR');

      component.selectRole('ALL');
      expect(component.selectedRole).toBe('ALL');
      expect(component.filteredSummaries).toHaveSize(3);
    });

    it('filters employees by multiple roles simultaneously', () => {
      component.selectedRoles = ['SERVEUR', 'BARMAN'];
      component.onRoleChange();

      expect(component.filteredSummaries).toHaveSize(2);
      const usernames = component.filteredSummaries.map(s => s.user.username);
      expect(usernames).toContain('serveur1');
      expect(usernames).toContain('barman1');
    });

    it('roleSelectOptions provides complete list with badge counts', () => {
      const options = component.roleSelectOptions;
      expect(options).toHaveSize(4);
      const values = options.map(o => o.value);
      expect(values).toEqual(['SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN']);
    });

    it('resetFilters clears search and role filters', () => {
      component.searchQuery = 'something';
      component.selectedRole = 'BARMAN';
      component.resetFilters();

      expect(component.searchQuery).toBe('');
      expect(component.selectedRole).toBe('ALL');
      expect(component.filteredSummaries).toHaveSize(3);
    });

    it('goToSchedule navigates to /manager/schedule', () => {
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate');
      component.goToSchedule();
      expect(router.navigate).toHaveBeenCalledWith(['/manager/schedule']);
    });

    it('getUserPrimaryRole returns primary role or default', () => {
      expect(component.getUserPrimaryRole(sampleUsers[0].roles)).toBe('SERVEUR');
      expect(component.getUserPrimaryRole([])).toBe('SERVEUR');
      expect(component.getUserPrimaryRole(['MANAGER', 'ADMIN'])).toBe('MANAGER');
      expect(component.getUserPrimaryRole(['ADMIN', 'MANAGER'])).toBe('ADMIN');
      expect(component.getUserPrimaryRole(['BARMAN'])).toBe('BARMAN');
      expect(component.getUserPrimaryRole(['CUSTOM_ROLE'])).toBe('SERVEUR');
    });

    it('getWorkloadProgress computes ratio based on 35h contract base', () => {
      expect(component.getWorkloadProgress(0)).toBe(0);
      expect(component.getWorkloadProgress(17.5)).toBe(50);
      expect(component.getWorkloadProgress(35)).toBe(100);
      expect(component.getWorkloadProgress(45)).toBe(100);
    });

    it('isOvertime checks if hours exceed 35h', () => {
      expect(component.isOvertime(35)).toBeFalse();
      expect(component.isOvertime(35.5)).toBeTrue();
      expect(component.isOvertime(20)).toBeFalse();
    });

    it('getDisplayName returns full name or fallback to username', () => {
      expect(component.getDisplayName(sampleUsers[0])).toBe('Lucas Bernard');
      expect(component.getDisplayName({ ...sampleUsers[0], prenom: '', nom: '' })).toBe('serveur1');
    });
  });
});

