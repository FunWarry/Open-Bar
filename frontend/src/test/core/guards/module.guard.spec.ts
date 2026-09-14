import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ModuleGuard } from '../../../app/core/guards/module.guard';
import { FeatureFlagService } from '../../../app/core/services/feature-flag.service';
import { EstablishmentModule, EstablishmentModules } from '../../../app/core/models/establishment-module.model';

function makeRoute(requiredModule?: EstablishmentModule): ActivatedRouteSnapshot {
  return {
    data: requiredModule ? { requiredModule } : {},
    url: [{ path: 'test-route' }]
  } as unknown as ActivatedRouteSnapshot;
}

describe('ModuleGuard', () => {
  let guard: ModuleGuard;
  let router: jasmine.SpyObj<Router>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService> & { isLoaded: any };

  const mockUrlTree = {
    toString: () => '/404'
  } as UrlTree;

  const mockModules: EstablishmentModules = {
    cuisineKds: true,
    happyHour: true,
    employeeManagement: true,
    floorPlan: false,
    qrClientOrdering: true,
    stockTracking: true,
  };

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree']);
    router.createUrlTree.and.returnValue(mockUrlTree);

    featureFlagService = jasmine.createSpyObj('FeatureFlagService', ['isModuleEnabled', 'loadModules']);
    featureFlagService.isLoaded = signal(true);
    featureFlagService.loadModules.and.returnValue(of(mockModules));

    TestBed.configureTestingModule({
      providers: [
        ModuleGuard,
        { provide: Router, useValue: router },
        { provide: FeatureFlagService, useValue: featureFlagService }
      ]
    });

    guard = TestBed.inject(ModuleGuard);
  });

  it('should allow navigation if no requiredModule is defined on route', () => {
    const route = makeRoute();
    const result = guard.canActivate(route);

    expect(result).toBeTrue();
    expect(featureFlagService.isModuleEnabled).not.toHaveBeenCalled();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should allow navigation if requiredModule is enabled when flags are already loaded', () => {
    featureFlagService.isLoaded = signal(true);
    featureFlagService.isModuleEnabled.and.returnValue(true);
    const route = makeRoute(EstablishmentModule.CUISINE_KDS);
    const result = guard.canActivate(route);

    expect(result).toBeTrue();
    expect(featureFlagService.isModuleEnabled).toHaveBeenCalledWith(EstablishmentModule.CUISINE_KDS);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should block navigation and redirect to /404 if requiredModule is disabled when flags are already loaded', () => {
    featureFlagService.isLoaded = signal(true);
    featureFlagService.isModuleEnabled.and.returnValue(false);
    const route = makeRoute(EstablishmentModule.FLOOR_PLAN);
    const result = guard.canActivate(route);

    expect(result).toBe(mockUrlTree);
    expect(featureFlagService.isModuleEnabled).toHaveBeenCalledWith(EstablishmentModule.FLOOR_PLAN);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/404']);
  });

  it('should wait for loadModules() when not loaded and allow navigation if module is enabled', (done) => {
    featureFlagService.isLoaded = signal(false);
    featureFlagService.isModuleEnabled.and.returnValue(true);
    const route = makeRoute(EstablishmentModule.CUISINE_KDS);

    const result$ = guard.canActivate(route);
    expect(typeof result$).not.toBe('boolean');

    (result$ as any).subscribe((res: boolean | UrlTree) => {
      expect(featureFlagService.loadModules).toHaveBeenCalled();
      expect(featureFlagService.isModuleEnabled).toHaveBeenCalledWith(EstablishmentModule.CUISINE_KDS);
      expect(res).toBeTrue();
      expect(router.createUrlTree).not.toHaveBeenCalled();
      done();
    });
  });

  it('should wait for loadModules() when not loaded and redirect to /404 if module is disabled', (done) => {
    featureFlagService.isLoaded = signal(false);
    featureFlagService.isModuleEnabled.and.returnValue(false);
    const route = makeRoute(EstablishmentModule.FLOOR_PLAN);

    const result$ = guard.canActivate(route);
    (result$ as any).subscribe((res: boolean | UrlTree) => {
      expect(featureFlagService.loadModules).toHaveBeenCalled();
      expect(featureFlagService.isModuleEnabled).toHaveBeenCalledWith(EstablishmentModule.FLOOR_PLAN);
      expect(res).toBe(mockUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/404']);
      done();
    });
  });

  it('should redirect to /404 when loadModules() fails and module is disabled', (done) => {
    featureFlagService.isLoaded = signal(false);
    featureFlagService.loadModules.and.returnValue(throwError(() => new Error('Network error')));
    featureFlagService.isModuleEnabled.and.returnValue(false);
    const route = makeRoute(EstablishmentModule.CUISINE_KDS);

    const result$ = guard.canActivate(route);
    (result$ as any).subscribe((res: boolean | UrlTree) => {
      expect(res).toBe(mockUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/404']);
      done();
    });
  });
});
