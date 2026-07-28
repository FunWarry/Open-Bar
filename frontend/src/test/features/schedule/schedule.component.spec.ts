import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ScheduleComponent } from '../../../app/features/schedule/schedule.component';

describe('ScheduleComponent', () => {
  let component: ScheduleComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduleComponent, CommonModule]
    }).compileComponents();

    const fixture = TestBed.createComponent(ScheduleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with loading true', () => {
    expect(component.loading).toBeTrue();
  });

  it('weekLabel should contain "Semaine du"', () => {
    expect(component.weekLabel).toContain('Semaine du');
  });

  it('getDayHeaders should return 7 days', () => {
    expect(component.getDayHeaders()).toHaveSize(7);
  });

  it('getDayHeaders should start with Mon', () => {
    expect(component.getDayHeaders()[0].day).toBe('Mon');
  });

  it('getShiftColorClass returns correct classes', () => {
    expect(component.getShiftColorClass({ day: 'Mon', date: '', type: 'MANAGER' })).toBe('shift--manager');
    expect(component.getShiftColorClass({ day: 'Mon', date: '', type: 'WAITER' })).toBe('shift--waiter');
    expect(component.getShiftColorClass({ day: 'Mon', date: '', type: 'BARTENDER' })).toBe('shift--bartender');
    expect(component.getShiftColorClass({ day: 'Mon', date: '', type: 'DAY_OFF' })).toBe('shift--dayoff');
    expect(component.getShiftColorClass({ day: 'Mon', date: '', type: 'EMPTY' })).toBe('shift--empty');
  });

  it('prevWeek should move week start back by 7 days', () => {
    const initialDate = new Date(component.currentWeekStart);
    component.prevWeek();
    const expected = new Date(initialDate);
    expected.setDate(expected.getDate() - 7);
    expect(component.currentWeekStart.toDateString()).toBe(expected.toDateString());
  });

  it('nextWeek should move week start forward by 7 days', () => {
    const initialDate = new Date(component.currentWeekStart);
    component.nextWeek();
    const expected = new Date(initialDate);
    expected.setDate(expected.getDate() + 7);
    expect(component.currentWeekStart.toDateString()).toBe(expected.toDateString());
  });
});
