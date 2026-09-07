import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { EstablishmentModule } from '../models/establishment-module.model';
import { FeatureFlagService } from '../services/feature-flag.service';

/**
 * Route guard enforcing modular capability requirements defined in route data (`requiredModule`).
 * Redirects the user if the required module is disabled in establishment configuration.
 */
@Injectable({
  providedIn: 'root'
})
export class ModuleGuard implements CanActivate {
  /**
   * Constructs ModuleGuard with feature flag service and router.
   *
   * @param featureFlagService Service exposing establishment module states
   * @param router Angular Router for fallback navigation
   */
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly router: Router
  ) {}

  /**
   * Verifies whether the required module for the activated route is currently enabled.
   *
   * @param route Current route snapshot containing potential `requiredModule` metadata
   * @param state Current router state
   * @returns `true` if module is enabled or none required, `false` otherwise
   */
  canActivate(route: ActivatedRouteSnapshot, state?: RouterStateSnapshot): boolean {
    const requiredModule = route.data?.['requiredModule'] as EstablishmentModule | undefined;

    if (!requiredModule) {
      return true;
    }

    const isEnabled = this.featureFlagService.isModuleEnabled(requiredModule);
    if (!isEnabled) {
      console.warn(`[ModuleGuard] Access denied to ${route.url.join('/')}: module '${requiredModule}' is disabled.`);
      this.router.navigate(['/app-home']);
      return false;
    }

    return true;
  }
}
