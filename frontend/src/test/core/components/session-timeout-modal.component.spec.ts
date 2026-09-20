import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { SessionTimeoutModalComponent } from '../../../app/core/components/ui/session-timeout-modal/session-timeout-modal.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('SessionTimeoutModalComponent', () => {
  let component: SessionTimeoutModalComponent;
  let fixture: ComponentFixture<SessionTimeoutModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [
        SessionTimeoutModalComponent,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionTimeoutModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('initializes with default remaining seconds and formats time properly', () => {
    component.remainingSeconds = 300;
    expect(component.remainingFormatted).toBe('05:00');

    component.remainingSeconds = 65;
    expect(component.remainingFormatted).toBe('01:05');

    component.remainingSeconds = 9;
    expect(component.remainingFormatted).toBe('00:09');

    component.remainingSeconds = 0;
    expect(component.remainingFormatted).toBe('00:00');
  });

  it('onExtend dismisses modal with extend action', () => {
    component.onExtend();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'extend' });
  });

  it('onLogout dismisses modal with logout action', () => {
    component.onLogout();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'logout' });
  });

  it('decrements remainingSeconds each second and dismisses when expired', fakeAsync(() => {
    component.remainingSeconds = 2;
    component.ngOnInit();

    tick(1000);
    expect(component.remainingSeconds).toBe(1);

    tick(1000);
    expect(component.remainingSeconds).toBe(0);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'expired' });
  }));
});
