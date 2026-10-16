import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartupOverlayComponent } from '../../../app/core/components/startup-overlay/startup-overlay.component';
import { StartupReadinessService } from '../../../app/core/services/startup-readiness.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { signal } from '@angular/core';

describe('StartupOverlayComponent', () => {
  let component: StartupOverlayComponent;
  let fixture: ComponentFixture<StartupOverlayComponent>;
  let startupServiceMock: jasmine.SpyObj<StartupReadinessService> & {
    isStartingUp: ReturnType<typeof signal<boolean>>;
    elapsedSeconds: ReturnType<typeof signal<number>>;
    attempts: ReturnType<typeof signal<number>>;
    isChecking: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    const isStartingUpSignal = signal<boolean>(true);
    const elapsedSecondsSignal = signal<number>(5);
    const attemptsSignal = signal<number>(2);
    const isCheckingSignal = signal<boolean>(false);

    const spy = jasmine.createSpyObj<StartupReadinessService>('StartupReadinessService', [
      'retryNow',
      'initStartupCheck',
      'isBackendReady'
    ]);

    startupServiceMock = Object.assign(spy, {
      isStartingUp: isStartingUpSignal,
      elapsedSeconds: elapsedSecondsSignal,
      attempts: attemptsSignal,
      isChecking: isCheckingSignal
    });

    await TestBed.configureTestingModule({
      imports: [StartupOverlayComponent, getTranslocoTestingModule()],
      providers: [
        { provide: StartupReadinessService, useValue: startupServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StartupOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and render startup card', () => {
    expect(component).toBeTruthy();
    const cardEl = fixture.nativeElement.querySelector('[data-testid="startup-card"]');
    expect(cardEl).toBeTruthy();
  });

  it('should trigger retryNow on clicking the retry button', () => {
    component.onRetry();
    expect(startupServiceMock.retryNow).toHaveBeenCalled();
  });

  it('should display tip when elapsed seconds exceed 20s', () => {
    startupServiceMock.elapsedSeconds.set(25);
    fixture.detectChanges();

    const tipEl = fixture.nativeElement.querySelector('[data-testid="startup-slow-tip"]');
    expect(tipEl).toBeTruthy();
  });
});
