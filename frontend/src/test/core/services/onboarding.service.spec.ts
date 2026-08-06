import { TestBed } from '@angular/core/testing';
import { OnboardingService } from '../../../app/core/services/onboarding.service';

/**
 * Unit test suite for OnboardingService.
 */
describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OnboardingService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isCompleted should return false initially', () => {
    expect(service.isCompleted('user_123')).toBeFalse();
  });

  it('markAsCompleted should persist completion in localStorage', () => {
    service.markAsCompleted('user_123');
    expect(service.isCompleted('user_123')).toBeTrue();
    expect(localStorage.getItem('openbar_onboarding_completed_user_123')).toBe('true');
  });

  it('resetOnboarding should clear completion state in localStorage', () => {
    service.markAsCompleted('user_123');
    expect(service.isCompleted('user_123')).toBeTrue();

    service.resetOnboarding('user_123');
    expect(service.isCompleted('user_123')).toBeFalse();
    expect(localStorage.getItem('openbar_onboarding_completed_user_123')).toBeNull();
  });

  it('getStepsForRole should return ADMIN tailored tutorial steps', () => {
    const steps = service.getStepsForRole('ADMIN');
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[0].id).toBe('welcome');
    expect(steps[1].roleTarget).toBe('ADMIN');
  });

  it('getStepsForRole should return MANAGER tailored tutorial steps', () => {
    const steps = service.getStepsForRole('MANAGER');
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[1].roleTarget).toBe('MANAGER');
  });

  it('getStepsForRole should return SERVEUR tailored tutorial steps', () => {
    const steps = service.getStepsForRole('SERVEUR');
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[1].roleTarget).toBe('SERVEUR');
  });

  it('getStepsForRole should return BARMAN tailored tutorial steps', () => {
    const steps = service.getStepsForRole('BARMAN');
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[1].roleTarget).toBe('BARMAN');
  });

  it('getStepsForRole should return CLIENT fallback tutorial steps', () => {
    const steps = service.getStepsForRole('CLIENT');
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps[1].roleTarget).toBe('CLIENT');
  });
});
