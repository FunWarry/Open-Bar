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
});
