import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { ModuleGuard } from '../../../app/core/guards/module.guard';
import { FeatureFlagService } from '../../../app/core/services/feature-flag.service';
import { EstablishmentModule } from '../../../app/core/models/establishment-module.model';

function makeRoute(requiredModule?: EstablishmentModule): ActivatedRouteSnapshot {
  return {
    data: requiredModule ? { requiredModule } : {},
    url: []
  } as unknown as ActivatedRouteSnapshot;
}

describe('ModuleGuard', () => {
  let guard: ModuleGuard;
  let router: jasmine.SpyObj<Router>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    featureFlagService = jasmine.createSpyObj('FeatureFlagService', ['isModuleEnabled']);

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
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow navigation if requiredModule is enabled', () => {
    featureFlagService.isModuleEnabled.and.returnValue(true);
    const route = makeRoute(EstablishmentModule.CUISINE_KDS);
    const result = guard.canActivate(route);

    expect(result).toBeTrue();
    expect(featureFlagService.isModuleEnabled).toHaveBeenCalledWith(EstablishmentModule.CUISINE_KDS);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should block navigation and redirect to /app-home if requiredModule is disabled', () => {
    featureFlagService.isModuleEnabled.and.returnValue(false);
    const route = makeRoute(EstablishmentModule.FLOOR_PLAN);
    const result = guard.canActivate(route);

    expect(result).toBeFalse();
    expect(featureFlagService.isModuleEnabled).toHaveBeenCalledWith(EstablishmentModule.FLOOR_PLAN);
    expect(router.navigate).toHaveBeenCalledWith(['/app-home']);
  });
});
