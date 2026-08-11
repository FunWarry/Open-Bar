import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { ScheduleHistoryModalComponent } from '../../../app/features/schedule/schedule-history-modal/schedule-history-modal.component';
import { ShiftService } from '../../../app/core/services/shift.service';
import { UserService } from '../../../app/core/services/user.service';
import { ShiftAuditLog } from '../../../app/core/models/shift.model';
import { User } from '../../../app/core/models/user.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('ScheduleHistoryModalComponent', () => {
  let component: ScheduleHistoryModalComponent;
  let fixture: ComponentFixture<ScheduleHistoryModalComponent>;
  let mockShiftService: jasmine.SpyObj<ShiftService>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockModalCtrl: jasmine.SpyObj<ModalController>;

  const mockUsers: User[] = [
    { id: 1, username: 'serveur1', nom: 'Dupont', prenom: 'Jean', email: 's1@bar.com', roles: ['SERVEUR'], enabled: true, createdAt: '', updatedAt: '' },
    { id: 2, username: 'barman1', nom: 'Martin', prenom: 'Alice', email: 'b1@bar.com', roles: ['BARMAN'], enabled: true, createdAt: '', updatedAt: '' }
  ];

  const mockAuditLogs: ShiftAuditLog[] = [
    {
      id: 101,
      shiftId: 1,
      userId: 1,
      userName: 'serveur1',
      userNom: 'Dupont',
      userPrenom: 'Jean',
      dateShift: '2026-08-17',
      action: 'CREATED',
      changedBy: 'manager1',
      changedAt: '2026-08-17T09:00:00',
      previousSnapshot: undefined,
      newSnapshot: '{"heureDebut":"08:00","heureFin":"16:00","typeShift":"MATIN","typePoste":"SERVEUR"}'
    },
    {
      id: 102,
      shiftId: 1,
      userId: 1,
      userName: 'serveur1',
      userNom: 'Dupont',
      userPrenom: 'Jean',
      dateShift: '2026-08-17',
      action: 'UPDATED',
      changedBy: 'manager1',
      changedAt: '2026-08-17T11:00:00',
      previousSnapshot: '{"heureDebut":"08:00","heureFin":"16:00","typeShift":"MATIN","typePoste":"SERVEUR"}',
      newSnapshot: '{"heureDebut":"09:00","heureFin":"17:00","typeShift":"MATIN","typePoste":"SERVEUR"}'
    }
  ];

  beforeEach(async () => {
    mockShiftService = jasmine.createSpyObj('ShiftService', ['getWeekAuditLog']);
    mockUserService = jasmine.createSpyObj('UserService', ['getUsers']);
    mockModalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);

    mockShiftService.getWeekAuditLog.and.returnValue(of(mockAuditLogs));
    mockUserService.getUsers.and.returnValue(of(mockUsers));

    await TestBed.configureTestingModule({
      imports: [ScheduleHistoryModalComponent, CommonModule, FormsModule, getTranslocoTestingModule()],
      providers: [
        { provide: ShiftService, useValue: mockShiftService },
        { provide: UserService, useValue: mockUserService },
        { provide: ModalController, useValue: mockModalCtrl }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleHistoryModalComponent);
    component = fixture.componentInstance;
    component.weekISO = '2026-08-17';
    fixture.detectChanges();
  });

  it('should create and load initial users and audit logs', () => {
    expect(component).toBeTruthy();
    expect(mockUserService.getUsers).toHaveBeenCalled();
    expect(mockShiftService.getWeekAuditLog).toHaveBeenCalledWith('2026-08-17', undefined);
    expect(component.logs).toHaveSize(2);
  });

  it('filteredLogs should filter by action and search query', () => {
    component.selectedAction = 'CREATED';
    expect(component.filteredLogs).toHaveSize(1);
    expect(component.filteredLogs[0].action).toBe('CREATED');

    component.selectedAction = 'ALL';
    component.searchQuery = 'Dupont';
    expect(component.filteredLogs).toHaveSize(2);

    component.searchQuery = 'NonExisting';
    expect(component.filteredLogs).toHaveSize(0);
  });

  it('toggleExpand should track expanded state of audit logs', () => {
    expect(component.isExpanded(101)).toBeFalse();
    component.toggleExpand(101);
    expect(component.isExpanded(101)).toBeTrue();
    component.toggleExpand(101);
    expect(component.isExpanded(101)).toBeFalse();
  });

  it('parseSnapshot should parse valid JSON and handle errors gracefully', () => {
    const parsed = component.parseSnapshot('{"heureDebut":"08:00"}');
    expect(parsed?.heureDebut).toBe('08:00');
    expect(component.parseSnapshot('invalid-json')).toBeNull();
    expect(component.parseSnapshot(undefined)).toBeNull();
  });

  it('replayAtInstant should dismiss modal with replay action and target timestamp', () => {
    component.replayAtInstant('2026-08-17T11:00:00');
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({
      action: 'replay',
      timestamp: '2026-08-17T11:00:00'
    });
  });

  it('dismiss should close modal', () => {
    component.dismiss();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
