import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { EstablishmentModule } from '../models/establishment-module.model';
import { FeatureFlagService } from '../services/feature-flag.service';

/**
 * Route guard enforcing modular capability requirements defined in route data (`requiredModule`).
 * Redirects the user to the 404 page if the required module is disabled in establishment configuration.
 * Handles both synchronous (preloaded) and asynchronous (initial cold load / page refresh) flag evaluation.
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
   * If the module configuration is not yet loaded (e.g. cold page refresh or direct URL entry),
   * waits for the backend capabilities call before making the routing decision.
   *
   * @param route Current route snapshot containing potential `requiredModule` metadata
   * @param state Current router state
   * @returns `true` if module is enabled or none required, or `UrlTree` pointing to `/404` otherwise
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state?: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const requiredModule = route.data?.['requiredModule'] as EstablishmentModule | undefined;

    if (!requiredModule) {
      return true;
    }

    if (this.featureFlagService.isLoaded()) {
      return this.checkModule(requiredModule, route);
    }

    return this.featureFlagService.loadModules().pipe(
      map(() => this.checkModule(requiredModule, route)),
      catchError(() => of(this.checkModule(requiredModule, route)))
    );
  }

  /**
   * Checks whether the specified capability module is enabled, returning true or a 404 redirection.
   *
   * @param module Capability identifier to verify
   * @param route Route snapshot for diagnostic warning logging
   * @returns `true` if enabled, or `UrlTree` to `/404` if disabled
   */
  private checkModule(module: EstablishmentModule, route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (!this.featureFlagService.isModuleEnabled(module)) {
      console.warn(`[ModuleGuard] Access denied to /${route.url.map(segment => segment.path).join('/')}: module '${module}' is disabled.`);
      return this.router.createUrlTree(['/404']);
    }
    return true;
  }
}
