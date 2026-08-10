import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { DayClosureModalComponent } from '../../../app/features/schedule/day-closure-modal/day-closure-modal.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('DayClosureModalComponent', () => {
  let component: DayClosureModalComponent;
  let fixture: ComponentFixture<DayClosureModalComponent>;
  let mockModalCtrl: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    mockModalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);

    await TestBed.configureTestingModule({
      imports: [DayClosureModalComponent, CommonModule, FormsModule, getTranslocoTestingModule()],
      providers: [{ provide: ModalController, useValue: mockModalCtrl }]
    }).compileComponents();

    fixture = TestBed.createComponent(DayClosureModalComponent);
    component = fixture.componentInstance;
    component.dateISO = '2026-08-15';
    component.isClosed = false;
    fixture.detectChanges();
  });

  it('should create and format date title', () => {
    expect(component).toBeTruthy();
    expect(component.formattedDate).toContain('2026');
  });

  it('should dismiss modal when dismiss() is called', () => {
    component.dismiss();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(null);
  });

  it('should dismiss with save closure payload on saveClosure()', () => {
    component.reason = 'Armistice';
    component.isAnnualRecurring = true;
    component.saveClosure();

    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({
      action: 'close',
      startDate: '2026-08-15',
      endDate: undefined,
      reason: 'Armistice',
      isAnnualRecurring: true
    });
  });

  it('should dismiss with reopen payload on reopenDay()', () => {
    component.reopenDay();

    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({
      action: 'reopen'
    });
  });
});
