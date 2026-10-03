import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';
import { RestaurantShiftsModalComponent } from '../../../../app/features/reservations/components/restaurant-shifts-modal/restaurant-shifts-modal.component';
import { RestaurantShiftService } from '../../../../app/core/services/restaurant-shift.service';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('RestaurantShiftsModalComponent', () => {
  let component: RestaurantShiftsModalComponent;
  let fixture: ComponentFixture<RestaurantShiftsModalComponent>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let toastElementSpy: { present: jasmine.Spy };

  beforeEach(async () => {
    toastElementSpy = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastElementSpy as any));

    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [
        RestaurantShiftsModalComponent,
        getTranslocoTestingModule(),
      ],
      providers: [
        RestaurantShiftService,
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantShiftsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the shifts modal component', () => {
    expect(component).toBeTruthy();
    expect(component.shiftsList.length).toBeGreaterThan(0);
  });

  it('adds a new shift when form is valid', () => {
    spyOn(component.shiftsUpdated, 'emit');

    component.addShiftForm.patchValue({
      name: 'Brunch Dimanche',
      startTime: '10:00',
      endTime: '14:00',
      stepMinutes: 30,
    });

    component.addNewShift();

    expect(component.shiftsList.some((s) => s.name === 'Brunch Dimanche')).toBeTrue();
    expect(component.shiftsUpdated.emit).toHaveBeenCalled();
  });

  it('prevents adding shift if start time is after or equal to end time', () => {
    component.addShiftForm.patchValue({
      name: 'Invalid Shift',
      startTime: '18:00',
      endTime: '15:00',
      stepMinutes: 30,
    });

    const countBefore = component.shiftsList.length;
    component.addNewShift();
    expect(component.shiftsList.length).toBe(countBefore);
  });

  it('edits a shift and saves updates', () => {
    const target = component.shiftsList[0];
    component.startEditing(target);
    expect(component.editingShiftId).toBe(target.id);

    component.editForm.patchValue({
      name: 'Midi Étendu',
      startTime: '11:00',
      endTime: '16:00',
      stepMinutes: 45,
    });

    component.saveEdit(target.id);
    expect(component.editingShiftId).toBeNull();
    const updated = component.shiftsList.find((s) => s.id === target.id);
    expect(updated?.name).toBe('Midi Étendu');
  });

  it('deletes a shift and emits updated list', () => {
    spyOn(component.shiftsUpdated, 'emit');
    // Ensure we have at least 2 shifts
    expect(component.shiftsList.length).toBe(2);

    const shiftToDelete = component.shiftsList[0];
    component.deleteShift(shiftToDelete);

    expect(component.shiftsList.some((s) => s.id === shiftToDelete.id)).toBeFalse();
    expect(component.shiftsUpdated.emit).toHaveBeenCalled();
  });

  it('resets shifts to defaults when requested', () => {
    component.resetDefaults();
    expect(component.shiftsList.length).toBe(2);
    expect(component.shiftsList[0].name).toBe('Midi');
  });

  it('emits modalClose on close()', () => {
    spyOn(component.modalClose, 'emit');
    component.close();
    expect(component.modalClose.emit).toHaveBeenCalled();
  });
});
