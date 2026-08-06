import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { OnboardingComponent } from '../../../app/features/onboarding/onboarding.component';
import { OnboardingService } from '../../../app/core/services/onboarding.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

/**
 * Unit test suite for OnboardingComponent.
 */
describe('OnboardingComponent', () => {
  let component: OnboardingComponent;
  let fixture: ComponentFixture<OnboardingComponent>;
  let router: Router;
  let storeSpy: jasmine.SpyObj<Store>;
  let onboardingService: OnboardingService;

  const mockUser = {
    id: 42,
    username: 'manager_john',
    email: 'john@openbar.local',
    roles: ['MANAGER'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  };

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(mockUser));

    await TestBed.configureTestingModule({
      imports: [
        OnboardingComponent,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    onboardingService = TestBed.inject(OnboardingService);
    fixture = TestBed.createComponent(OnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize steps based on current user role from store', () => {
    expect(component.userRole()).toBe('MANAGER');
    expect(component.steps().length).toBeGreaterThanOrEqual(3);
    expect(component.currentIndex()).toBe(0);
    expect(component.currentStep).toBeDefined();
    expect(component.isLastStep).toBeFalse();
  });

  it('next() should advance step index until last step then call finish', () => {
    spyOn(component, 'finish');
    expect(component.currentIndex()).toBe(0);

    component.next();
    expect(component.currentIndex()).toBe(1);

    component.next();
    expect(component.currentIndex()).toBe(2);
    expect(component.isLastStep).toBeTrue();

    // Final step advance triggers finish
    component.next();
    expect(component.finish).toHaveBeenCalled();
  });

  it('previous() should decrement index but not below zero', () => {
    component.currentIndex.set(2);
    component.previous();
    expect(component.currentIndex()).toBe(1);

    component.previous();
    expect(component.currentIndex()).toBe(0);

    component.previous();
    expect(component.currentIndex()).toBe(0);
  });

  it('goToStep() should navigate directly to valid step index', () => {
    component.goToStep(1);
    expect(component.currentIndex()).toBe(1);

    component.goToStep(-1); // Invalid negative index
    expect(component.currentIndex()).toBe(1);

    component.goToStep(99); // Invalid out of bound index
    expect(component.currentIndex()).toBe(1);
  });

  it('skip() should trigger finish()', () => {
    spyOn(component, 'finish');
    component.skip();
    expect(component.finish).toHaveBeenCalled();
  });

  it('finish() should mark onboarding as completed and navigate to role route', () => {
    spyOn(onboardingService, 'markAsCompleted');
    spyOn(router, 'navigate');

    component.finish();

    expect(onboardingService.markAsCompleted).toHaveBeenCalledWith('42');
    expect(router.navigate).toHaveBeenCalledWith(['/manager']);
  });

  it('finish() should fallback to userRole string when currentUser has no id', () => {
    component.currentUser = null;
    component.userRole.set('SERVEUR');
    spyOn(onboardingService, 'markAsCompleted');
    spyOn(router, 'navigate');

    component.finish();

    expect(onboardingService.markAsCompleted).toHaveBeenCalledWith('SERVEUR');
    expect(router.navigate).toHaveBeenCalledWith(['/serveur']);
  });

  it('getDestinationRoute should return proper route for all roles', () => {
    component.userRole.set('ADMIN');
    expect(component.getDestinationRoute()).toBe('/admin');

    component.userRole.set('MANAGER');
    expect(component.getDestinationRoute()).toBe('/manager');

    component.userRole.set('SERVEUR');
    expect(component.getDestinationRoute()).toBe('/serveur');

    component.userRole.set('BARMAN');
    expect(component.getDestinationRoute()).toBe('/barman');

    component.userRole.set('CLIENT');
    expect(component.getDestinationRoute()).toBe('/client/commande');

    component.userRole.set('UNKNOWN_ROLE');
    expect(component.getDestinationRoute()).toBe('/client/commande');
  });
});
