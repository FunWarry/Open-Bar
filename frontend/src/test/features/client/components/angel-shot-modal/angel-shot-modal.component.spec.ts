import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AngelShotModalComponent } from '../../../../../app/features/client/components/angel-shot-modal/angel-shot-modal.component';
import { SafetyAlertService } from '../../../../../app/core/services/safety-alert.service';
import { SafetyAlert } from '../../../../../app/core/models/safety-alert.model';

describe('AngelShotModalComponent', () => {
  let component: AngelShotModalComponent;
  let fixture: ComponentFixture<AngelShotModalComponent>;
  let safetyAlertServiceMock: jasmine.SpyObj<SafetyAlertService>;
  let toastCtrlMock: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  const mockCreatedAlert: SafetyAlert = {
    id: 99,
    tableId: 5,
    tableNumero: 12,
    type: 'ANGEL_SHOT_ICE',
    typeLabel: 'Avec glaçons',
    status: 'ACTIVE',
    comment: 'Need ride',
    createdAt: '2026-10-23T12:00:00'
  };

  beforeEach(async () => {
    safetyAlertServiceMock = jasmine.createSpyObj('SafetyAlertService', ['triggerSafetyAlert']);
    safetyAlertServiceMock.triggerSafetyAlert.and.returnValue(of(mockCreatedAlert));

    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlMock = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlMock.create.and.returnValue(Promise.resolve(toastSpy));

    await TestBed.configureTestingModule({
      imports: [
        AngelShotModalComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'fr' }
        })
      ],
      providers: [
        { provide: SafetyAlertService, useValue: safetyAlertServiceMock },
        { provide: ToastController, useValue: toastCtrlMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AngelShotModalComponent);
    component = fixture.componentInstance;
    component.tableNumero = 12;
    fixture.detectChanges();
  });

  it('should create the component with initial state', () => {
    expect(component).toBeTruthy();
    expect(component.isSubmitting()).toBeFalse();
    expect(component.isSent()).toBeFalse();
    expect(component.variants.length).toBe(3);
  });

  it('should trigger silent emergency alert when variant is clicked', () => {
    component.additionalNote = '   Person in grey shirt   ';
    component.triggerAlert('ANGEL_SHOT_ICE');

    expect(safetyAlertServiceMock.triggerSafetyAlert).toHaveBeenCalledWith(
      12,
      'ANGEL_SHOT_ICE',
      'Person in grey shirt'
    );
    expect(component.isSent()).toBeTrue();
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should handle submission error and display toast', async () => {
    safetyAlertServiceMock.triggerSafetyAlert.and.returnValue(throwError(() => new Error('Network error')));

    component.triggerAlert('ANGEL_SHOT_LIME');

    expect(component.isSent()).toBeFalse();
    expect(component.isSubmitting()).toBeFalse();
    expect(toastCtrlMock.create).toHaveBeenCalled();
  });

  it('should emit closed event on dismiss()', () => {
    spyOn(component.closed, 'emit');

    component.dismiss();

    expect(component.closed.emit).toHaveBeenCalled();
  });
});
