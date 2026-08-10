import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { ClosureConfigModalComponent } from '../../../app/features/schedule/closure-config-modal/closure-config-modal.component';
import { ClosureService } from '../../../app/core/services/closure.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('ClosureConfigModalComponent', () => {
  let component: ClosureConfigModalComponent;
  let fixture: ComponentFixture<ClosureConfigModalComponent>;
  let mockClosureService: jasmine.SpyObj<ClosureService>;
  let mockModalCtrl: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    mockClosureService = jasmine.createSpyObj('ClosureService', ['getClosures', 'createClosure', 'deleteClosure']);
    mockModalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);

    mockClosureService.getClosures.and.returnValue(
      of([
        {
          id: 1,
          type: 'WEEKLY_RECURRING',
          dayOfWeek: 'SUNDAY',
          reason: 'Repos hebdomadaire'
        },
        {
          id: 2,
          type: 'EXCEPTIONAL',
          closureDate: '2026-07-14',
          isAnnualRecurring: true,
          reason: '14 Juillet'
        }
      ])
    );

    await TestBed.configureTestingModule({
      imports: [ClosureConfigModalComponent, CommonModule, FormsModule, getTranslocoTestingModule()],
      providers: [
        { provide: ClosureService, useValue: mockClosureService },
        { provide: ModalController, useValue: mockModalCtrl }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClosureConfigModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load initial closures', () => {
    expect(component).toBeTruthy();
    expect(mockClosureService.getClosures).toHaveBeenCalled();
    expect(component.closures).toHaveSize(2);
  });

  it('should identify Sunday as weekly closed', () => {
    const sunday = component.weeklyDays.find((d) => d.dayOfWeek === 'SUNDAY');
    expect(sunday?.isClosed).toBeTrue();
    expect(sunday?.closureId).toBe(1);
  });

  it('should filter exceptional closures', () => {
    expect(component.exceptionalClosures).toHaveSize(1);
    expect(component.exceptionalClosures[0].reason).toBe('14 Juillet');
  });

  it('should dismiss modal on dismiss()', () => {
    component.dismiss();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(true);
  });

  it('toggleWeeklyDay() should delete closure if currently closed', () => {
    mockClosureService.deleteClosure.and.returnValue(of(undefined as any));
    const sunday = component.weeklyDays.find(d => d.dayOfWeek === 'SUNDAY')!;

    component.toggleWeeklyDay(sunday);

    expect(mockClosureService.deleteClosure).toHaveBeenCalledWith(1);
    expect(mockClosureService.getClosures).toHaveBeenCalled();
  });

  it('toggleWeeklyDay() should create closure if currently open', () => {
    mockClosureService.createClosure.and.returnValue(of({ id: 10, type: 'WEEKLY_RECURRING', dayOfWeek: 'MONDAY', reason: 'Fermé' }));
    const monday = component.weeklyDays.find(d => d.dayOfWeek === 'MONDAY')!;

    component.toggleWeeklyDay(monday);

    expect(mockClosureService.createClosure).toHaveBeenCalledWith({
      type: 'WEEKLY_RECURRING',
      dayOfWeek: 'MONDAY',
      reason: 'Fermeture hebdomadaire (Lundi)'
    });
  });

  it('selectPreset() should populate reason and set date range for annual leaves', () => {
    component.newClosureDate = '2026-08-01';
    component.selectPreset('Congés annuels');
    expect(component.newClosureReason).toBe('Congés annuels');
    expect(component.newIsDateRange).toBeTrue();
    expect(component.newEndDate).toBe('2026-08-08');

    component.selectPreset('Jour Férié');
    expect(component.newClosureReason).toBe('Jour Férié');
  });

  it('addExceptionalClosure() should create exceptional closure and reset form', () => {
    mockClosureService.createClosure.and.returnValue(of({
      id: 3,
      type: 'EXCEPTIONAL',
      closureDate: '2026-12-25',
      isAnnualRecurring: true,
      reason: 'Noël'
    }));

    component.newClosureDate = '2026-12-25';
    component.newClosureReason = 'Noël';
    component.newIsAnnualRecurring = true;

    component.addExceptionalClosure();

    expect(mockClosureService.createClosure).toHaveBeenCalledWith({
      type: 'EXCEPTIONAL',
      closureDate: '2026-12-25',
      endDate: undefined,
      isAnnualRecurring: true,
      reason: 'Noël'
    });
    expect(component.newClosureReason).toBe('');
    expect(component.saving).toBeFalse();
  });

  it('addExceptionalClosure() should not call service if fields are missing', () => {
    component.newClosureDate = '';
    component.newClosureReason = '';
    component.addExceptionalClosure();
    expect(mockClosureService.createClosure).not.toHaveBeenCalled();
  });

  it('deleteClosure() should delete closure and reload list', () => {
    mockClosureService.deleteClosure.and.returnValue(of(undefined as any));

    component.deleteClosure(2);

    expect(mockClosureService.deleteClosure).toHaveBeenCalledWith(2);
    expect(mockClosureService.getClosures).toHaveBeenCalled();
  });
});

