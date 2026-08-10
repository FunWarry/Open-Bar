import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ScheduleComponent } from '../../../app/features/schedule/schedule.component';
import { ScheduleService } from '../../../app/features/schedule/services/schedule.service';
import { EmployeeScheduleRow } from '../../../app/features/schedule/models/schedule.model';
import { ShiftService } from '../../../app/core/services/shift.service';
import { UserService } from '../../../app/core/services/user.service';
import { ClosureService } from '../../../app/core/services/closure.service';
import { PublicationService, WeekSchedulePublicationDTO } from '../../../app/core/services/publication.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { ModalController, ActionSheetController, ToastController, AlertController } from '@ionic/angular/standalone';
import { of, Subject } from 'rxjs';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('ScheduleComponent', () => {
  let component: ScheduleComponent;
  let fixture: ComponentFixture<ScheduleComponent>;
  let mockScheduleService: jasmine.SpyObj<ScheduleService>;
  let mockShiftService: jasmine.SpyObj<ShiftService>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockClosureService: jasmine.SpyObj<ClosureService>;
  let mockPublicationService: jasmine.SpyObj<PublicationService>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;
  let mockModalCtrl: jasmine.SpyObj<ModalController>;
  let mockActionSheetCtrl: jasmine.SpyObj<ActionSheetController>;
  let mockToastCtrl: jasmine.SpyObj<ToastController>;
  let mockAlertCtrl: jasmine.SpyObj<AlertController>;
  let wsSubject: Subject<any>;

  beforeEach(async () => {
    wsSubject = new Subject<any>();
    mockScheduleService = jasmine.createSpyObj('ScheduleService', ['getWeekSchedule', 'getMonday']);
    mockShiftService = jasmine.createSpyObj('ShiftService', ['createShift', 'deleteShift']);
    mockUserService = jasmine.createSpyObj('UserService', ['getUsers']);
    mockClosureService = jasmine.createSpyObj('ClosureService', ['getClosures', 'createClosure', 'deleteClosure']);
    mockPublicationService = jasmine.createSpyObj('PublicationService', ['publishWeek', 'getPublication']);
    mockWebSocketService = jasmine.createSpyObj('WebSocketService', ['watch']);
    mockModalCtrl = jasmine.createSpyObj('ModalController', ['create']);
    mockActionSheetCtrl = jasmine.createSpyObj('ActionSheetController', ['create']);
    mockToastCtrl = jasmine.createSpyObj('ToastController', ['create']);
    mockAlertCtrl = jasmine.createSpyObj('AlertController', ['create']);

    const mockMonday = new Date('2026-08-10');
    mockScheduleService.getMonday.and.returnValue(mockMonday);
    mockScheduleService.getWeekSchedule.and.returnValue(
      of({
        weekStart: '2026-08-10',
        weekEnd: '2026-08-16',
        employees: [],
        totalHours: 40,
        totalEmployees: 5,
        activeEmployees: 3
      })
    );
    mockClosureService.getClosures.and.returnValue(of([]));
    mockPublicationService.getPublication.and.returnValue(of(null));
    mockWebSocketService.watch.and.returnValue(wsSubject.asObservable());

    const dummyToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    mockToastCtrl.create.and.returnValue(Promise.resolve(dummyToast as any));

    await TestBed.configureTestingModule({
      imports: [ScheduleComponent, CommonModule, getTranslocoTestingModule()],
      providers: [
        { provide: ScheduleService, useValue: mockScheduleService },
        { provide: ShiftService, useValue: mockShiftService },
        { provide: UserService, useValue: mockUserService },
        { provide: ClosureService, useValue: mockClosureService },
        { provide: PublicationService, useValue: mockPublicationService },
        { provide: WebSocketService, useValue: mockWebSocketService },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ActionSheetController, useValue: mockActionSheetCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        { provide: AlertController, useValue: mockAlertCtrl }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component.isPublished).toBeFalse();
  });

  it('should navigate to previous and next weeks', () => {
    const initialMonday = new Date(component.currentWeekStart);

    component.nextWeek();
    expect(component.currentWeekStart.getDate()).toBe(initialMonday.getDate() + 7);

    component.prevWeek();
    expect(component.currentWeekStart.getDate()).toBe(initialMonday.getDate());
  });

  it('should correctly format weekLabel', () => {
    component.currentWeekStart = new Date('2026-08-10');
    expect(component.weekLabel).toContain('10 août');
    expect(component.weekLabel).toContain('16 août 2026');
  });

  it('should return correct CSS classes for shift types', () => {
    expect(component.getShiftColorClass({ type: 'MANAGER' } as any)).toBe('shift--manager');
    expect(component.getShiftColorClass({ type: 'WAITER' } as any)).toBe('shift--waiter');
    expect(component.getShiftColorClass({ type: 'BARTENDER' } as any)).toBe('shift--bartender');
    expect(component.getShiftColorClass({ type: 'DAY_OFF' } as any)).toBe('shift--dayoff');
    expect(component.getShiftColorClass({ type: 'EMPTY' } as any)).toBe('shift--empty');
    expect(component.getShiftColorClass({ isClosed: true } as any)).toBe('shift--closed');
  });

  it('publishSchedule() should call PublicationService.publishWeek and show toast', fakeAsync(() => {
    const mockPub: WeekSchedulePublicationDTO = {
      id: 1,
      weekStart: '2026-08-10',
      publishedAt: '2026-08-10T14:30:00',
      publishedBy: 'manager1'
    };
    mockPublicationService.publishWeek.and.returnValue(of(mockPub));

    component.publishSchedule();
    tick();

    expect(mockPublicationService.publishWeek).toHaveBeenCalledWith('2026-08-10');
    expect(component.isPublished).toBeTrue();
    expect(component.publication).toEqual(mockPub);
    expect(mockToastCtrl.create).toHaveBeenCalled();
  }));

  it('should update publication state when STOMP /topic/schedule/published event arrives for current week', () => {
    const pubEvent: WeekSchedulePublicationDTO = {
      id: 2,
      weekStart: '2026-08-10',
      publishedAt: '2026-08-10T15:00:00',
      publishedBy: 'admin'
    };

    wsSubject.next({ body: JSON.stringify(pubEvent) });

    expect(component.isPublished).toBeTrue();
    expect(component.publication).toEqual(pubEvent);
  });

  it('should trigger confirmDeleteShift on Delete key when hoveredCell has a shift', () => {
    spyOn(component, 'confirmDeleteShift');

    component.hoveredCell = {
      emp: { employeeId: 1, name: 'Alice', role: 'SERVEUR', shifts: [] },
      shift: { day: 'Mon', date: '2026-08-10', isClosed: false, rawShift: { id: 42 } } as any
    };

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    component.onWindowKeyDown(event);

    expect(component.confirmDeleteShift).toHaveBeenCalledWith(42);
  });

  it('should trigger confirmDeleteShift on Backspace key when hoveredCell has a shift', () => {
    spyOn(component, 'confirmDeleteShift');

    component.hoveredCell = {
      emp: { employeeId: 1, name: 'Alice', role: 'SERVEUR', shifts: [] },
      shift: { day: 'Mon', date: '2026-08-10', isClosed: false, rawShift: { id: 99 } } as any
    };

    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    component.onWindowKeyDown(event);

    expect(component.confirmDeleteShift).toHaveBeenCalledWith(99);
  });

  it('should NOT trigger confirmDeleteShift on Delete key when hoveredCell has no shift', () => {
    spyOn(component, 'confirmDeleteShift');

    component.hoveredCell = {
      emp: { employeeId: 1, name: 'Alice', role: 'SERVEUR', shifts: [] },
      shift: { day: 'Mon', date: '2026-08-10', isClosed: false } as any
    };

    expect(component.confirmDeleteShift).not.toHaveBeenCalled();
  });

  describe('Bulk Delete / Eraser Tool', () => {
    it('toggleDeleteMode() should toggle isDeleteMode and clear selection on exit', () => {
      expect(component.isDeleteMode).toBeFalse();
      component.selectedShiftIds.add(10);

      component.toggleDeleteMode();
      expect(component.isDeleteMode).toBeTrue();

      component.toggleDeleteMode();
      expect(component.isDeleteMode).toBeFalse();
      expect(component.selectedShiftIds.size).toBe(0);
    });

    it('toggleShiftSelection() should add and remove shift IDs from selection set', () => {
      component.toggleShiftSelection(101);
      expect(component.isShiftSelected(101)).toBeTrue();
      expect(component.isShiftSelected(102)).toBeFalse();

      component.toggleShiftSelection(101);
      expect(component.isShiftSelected(101)).toBeFalse();
    });

    it('clearDeleteSelection() should empty the selection set', () => {
      component.selectedShiftIds.add(1);
      component.selectedShiftIds.add(2);
      component.clearDeleteSelection();
      expect(component.selectedShiftIds.size).toBe(0);
    });

    it('onCellClick in delete mode should stage shift for deletion instead of opening modal', () => {
      component.isDeleteMode = true;
      spyOn(component, 'openEmployeeModalForUser');

      const emp: EmployeeScheduleRow = { employeeId: 1, name: 'Bob', role: 'SERVEUR', shifts: [] };
      const shift = { day: 'Mon', date: '2026-08-10', isClosed: false, rawShift: { id: 77 } } as any;

      component.onCellClick(emp, shift);

      expect(component.isShiftSelected(77)).toBeTrue();
      expect(component.openEmployeeModalForUser).not.toHaveBeenCalled();
    });

    it('confirmBulkDelete() should open alert and batch delete all selected shifts on confirmation', fakeAsync(() => {
      component.selectedShiftIds.add(10);
      component.selectedShiftIds.add(20);

      let alertButtons: any[] = [];
      mockAlertCtrl.create.and.callFake((opts: any) => {
        alertButtons = opts.buttons;
        return Promise.resolve({
          present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
        } as any);
      });

      component.confirmBulkDelete();
      tick();

      expect(mockAlertCtrl.create).toHaveBeenCalled();
      const deleteBtn = alertButtons.find((b: any) => b.role === 'destructive');
      expect(deleteBtn).toBeTruthy();

      mockShiftService.deleteShift.and.returnValue(of(void 0));
      deleteBtn.handler();
      tick();

      expect(mockShiftService.deleteShift).toHaveBeenCalledWith(10);
      expect(mockShiftService.deleteShift).toHaveBeenCalledWith(20);
      expect(component.isDeleteMode).toBeFalse();
      expect(component.selectedShiftIds.size).toBe(0);
      expect(mockToastCtrl.create).toHaveBeenCalled();
    }));

    it('pressing Escape in delete mode should exit delete mode', () => {
      component.isDeleteMode = true;
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onWindowKeyDown(event);
      expect(component.isDeleteMode).toBeFalse();
    });

    it('dragging in delete mode should stage all traversed shifts for deletion without duplicating', () => {
      component.isDeleteMode = true;
      component.schedule = {
        weekStart: '2026-08-10',
        weekEnd: '2026-08-16',
        totalHours: 15,
        totalEmployees: 1,
        activeEmployees: 1,
        employees: [
          {
            employeeId: 1,
            name: 'Bob',
            role: 'SERVEUR',
            shifts: [
              { day: 'Mon', date: '2026-08-10', isClosed: false, rawShift: { id: 101 } as any } as any,
              { day: 'Tue', date: '2026-08-11', isClosed: false, rawShift: { id: 102 } as any } as any,
              { day: 'Wed', date: '2026-08-12', isClosed: false, rawShift: { id: 103 } as any } as any
            ]
          }
        ]
      };

      // Mouse down on Monday
      const emp = component.schedule.employees[0];
      component.onCellMouseDown(emp, emp.shifts[0], 0, new MouseEvent('mousedown', { button: 0 }));
      expect(component.isDragging).toBeTrue();

      // Mouse enter on Wednesday (dragging from Mon to Wed)
      component.onCellMouseEnter(emp, emp.shifts[2], 2);

      // Mon, Tue, Wed should all be staged for deletion
      expect(component.isShiftSelected(101)).toBeTrue();
      expect(component.isShiftSelected(102)).toBeTrue();
      expect(component.isShiftSelected(103)).toBeTrue();
      expect(component.selectedShiftIds.size).toBe(3);

      // Mouse up should NOT duplicate
      component.onWindowMouseUp();
      expect(component.isDragging).toBeFalse();
      expect(mockShiftService.createShift).not.toHaveBeenCalled();
    });

    it('calculateScheduleDifferences() should detect ADDED, MODIFIED and DELETED shifts compared to snapshot', () => {
      component.publication = {
        id: 1,
        weekStart: '2026-08-10',
        publishedAt: '2026-08-10T10:00:00',
        publishedBy: 'admin',
        snapshotJson: JSON.stringify([
          { userId: 1, dateShift: '2026-08-10', typeShift: 'MATIN', heureDebut: '08:00', heureFin: '16:00' },
          { userId: 1, dateShift: '2026-08-11', typeShift: 'MATIN', heureDebut: '08:00', heureFin: '16:00' }
        ])
      };

      component.schedule = {
        weekStart: '2026-08-10',
        weekEnd: '2026-08-16',
        totalHours: 15,
        totalEmployees: 1,
        activeEmployees: 1,
        employees: [
          {
            employeeId: 1,
            name: 'Bob',
            role: 'SERVEUR',
            shifts: [
              // Shift 1: Modified hours (09:00 - 17:00 instead of 08:00 - 16:00)
              { day: 'Mon', date: '2026-08-10', isClosed: false, startTime: '09:00', endTime: '17:00', typeShift: 'MATIN', rawShift: { id: 101 } as any } as any,
              // Shift 2: Deleted (empty now)
              { day: 'Tue', date: '2026-08-11', isClosed: false } as any,
              // Shift 3: Added (new shift)
              { day: 'Wed', date: '2026-08-12', isClosed: false, startTime: '11:00', endTime: '22:00', typeShift: 'COUPURE', rawShift: { id: 103 } as any } as any
            ]
          }
        ]
      };

      component.calculateScheduleDifferences();

      expect(component.hasUnpublishedChanges).toBeTrue();
      expect(component.diffModifiedCount).toBe(1);
      expect(component.diffDeletedCount).toBe(1);
      expect(component.diffAddedCount).toBe(1);
      expect(component.totalDiffCount).toBe(3);

      expect(component.getCellDiff(1, '2026-08-10')?.status).toBe('MODIFIED');
      expect(component.getCellDiff(1, '2026-08-11')?.status).toBe('DELETED');
      expect(component.getCellDiff(1, '2026-08-12')?.status).toBe('ADDED');
    });

    it('toggleComparisonMode() should toggle isComparisonMode flag', () => {
      expect(component.isComparisonMode).toBeFalse();
      component.toggleComparisonMode();
      expect(component.isComparisonMode).toBeTrue();
      component.toggleComparisonMode();
      expect(component.isComparisonMode).toBeFalse();
    });
  });
});
