import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { ShiftHistoryModalComponent } from '../../../app/features/schedule/shift-history-modal/shift-history-modal.component';
import { ShiftService } from '../../../app/core/services/shift.service';
import { ShiftAuditLog } from '../../../app/core/models/shift.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('ShiftHistoryModalComponent', () => {
  let component: ShiftHistoryModalComponent;
  let fixture: ComponentFixture<ShiftHistoryModalComponent>;
  let mockShiftService: jasmine.SpyObj<ShiftService>;
  let mockModalCtrl: jasmine.SpyObj<ModalController>;

  const mockLogs: ShiftAuditLog[] = [
    {
      id: 1,
      shiftId: 42,
      userId: 1,
      userName: 'serveur1',
      userNom: 'Dupont',
      userPrenom: 'Jean',
      dateShift: '2026-08-18',
      action: 'CREATED',
      changedBy: 'manager1',
      changedAt: '2026-08-18T08:00:00',
      previousSnapshot: undefined,
      newSnapshot: '{"heureDebut":"08:00","heureFin":"16:00","typeShift":"MATIN","typePoste":"SERVEUR"}'
    },
    {
      id: 2,
      shiftId: 42,
      userId: 1,
      userName: 'serveur1',
      userNom: 'Dupont',
      userPrenom: 'Jean',
      dateShift: '2026-08-18',
      action: 'UPDATED',
      changedBy: 'manager2',
      changedAt: '2026-08-18T10:00:00',
      previousSnapshot: '{"heureDebut":"08:00","heureFin":"16:00","typeShift":"MATIN","typePoste":"SERVEUR"}',
      newSnapshot: '{"heureDebut":"09:00","heureFin":"17:00","typeShift":"MATIN","typePoste":"SERVEUR"}'
    },
    {
      id: 3,
      shiftId: 42,
      userId: 1,
      userName: 'serveur1',
      userNom: 'Dupont',
      userPrenom: 'Jean',
      dateShift: '2026-08-18',
      action: 'DELETED',
      changedBy: 'manager1',
      changedAt: '2026-08-18T18:00:00',
      previousSnapshot: '{"heureDebut":"09:00","heureFin":"17:00","typeShift":"MATIN","typePoste":"SERVEUR"}',
      newSnapshot: undefined
    }
  ];

  beforeEach(async () => {
    mockShiftService = jasmine.createSpyObj('ShiftService', ['getShiftHistory']);
    mockModalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);

    mockShiftService.getShiftHistory.and.returnValue(of(mockLogs));

    await TestBed.configureTestingModule({
      imports: [ShiftHistoryModalComponent, CommonModule, getTranslocoTestingModule()],
      providers: [
        { provide: ShiftService, useValue: mockShiftService },
        { provide: ModalController, useValue: mockModalCtrl }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftHistoryModalComponent);
    component = fixture.componentInstance;
    component.shiftId = 42;
    component.employeeName = 'Jean Dupont';
    fixture.detectChanges();
  });

  it('should create and load history for the given shiftId', () => {
    expect(component).toBeTruthy();
    expect(mockShiftService.getShiftHistory).toHaveBeenCalledWith(42);
    expect(component.logs).toHaveSize(3);
    expect(component.loading).toBeFalse();
  });

  it('should set loading false when API returns an error', () => {
    mockShiftService.getShiftHistory.and.returnValue(throwError(() => new Error('Network error')));

    component.logs = [];
    component.loading = true;
    component.loadHistory();

    expect(component.loading).toBeFalse();
    expect(component.logs).toHaveSize(0);
  });

  it('should NOT call loadHistory when shiftId is not set', () => {
    const newFixture = TestBed.createComponent(ShiftHistoryModalComponent);
    const newComponent = newFixture.componentInstance;
    // shiftId is not set — ngOnInit should skip loading
    newComponent.ngOnInit();
    // getShiftHistory was already called once in beforeEach; should not be called again
    expect(mockShiftService.getShiftHistory).toHaveBeenCalledTimes(1);
  });

  describe('getActionBadgeColor()', () => {
    it('should return "success" for CREATED action', () => {
      expect(component.getActionBadgeColor('CREATED')).toBe('success');
    });

    it('should return "primary" for UPDATED action', () => {
      expect(component.getActionBadgeColor('UPDATED')).toBe('primary');
    });

    it('should return "danger" for DELETED action', () => {
      expect(component.getActionBadgeColor('DELETED')).toBe('danger');
    });

    it('should return "medium" for unknown action', () => {
      expect(component.getActionBadgeColor('UNKNOWN' as any)).toBe('medium');
    });
  });

  describe('getActionIcon()', () => {
    it('should return "add-circle-outline" for CREATED', () => {
      expect(component.getActionIcon('CREATED')).toBe('add-circle-outline');
    });

    it('should return "create-outline" for UPDATED', () => {
      expect(component.getActionIcon('UPDATED')).toBe('create-outline');
    });

    it('should return "trash-outline" for DELETED', () => {
      expect(component.getActionIcon('DELETED')).toBe('trash-outline');
    });

    it('should return "time-outline" for unknown action', () => {
      expect(component.getActionIcon('UNKNOWN' as any)).toBe('time-outline');
    });
  });

  describe('parseSnapshot()', () => {
    it('should parse a valid JSON snapshot string into an EmployeeShift', () => {
      const result = component.parseSnapshot('{"heureDebut":"08:00","heureFin":"16:00","typeShift":"MATIN"}');
      expect(result).not.toBeNull();
      expect(result?.heureDebut).toBe('08:00');
    });

    it('should return null when snapshot is undefined', () => {
      expect(component.parseSnapshot(undefined)).toBeNull();
    });

    it('should return null when snapshot is an empty string', () => {
      expect(component.parseSnapshot('')).toBeNull();
    });

    it('should return null when snapshot is malformed JSON', () => {
      expect(component.parseSnapshot('not-valid-json')).toBeNull();
    });

    it('should return null when snapshot is null', () => {
      expect(component.parseSnapshot(null as any)).toBeNull();
    });
  });

  describe('dismiss()', () => {
    it('should call modalCtrl.dismiss()', () => {
      component.dismiss();
      expect(mockModalCtrl.dismiss).toHaveBeenCalled();
    });
  });
});
