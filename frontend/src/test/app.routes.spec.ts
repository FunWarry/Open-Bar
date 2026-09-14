import { routes } from '../app/app.routes';
import { AuthGuard } from '../app/core/guards/auth.guard';
import { RoleGuard } from '../app/core/guards/role.guard';
import { ModuleGuard } from '../app/core/guards/module.guard';

/**
 * Unit tests verifying route configuration for application routes in app.routes.ts,
 * specifically ensuring ingredient management routes and guards are correctly specified.
 */
describe('App Routes - Ingredients', () => {
  it('should define route /ingredients with AuthGuard, RoleGuard and correct roles', () => {
    const route = routes.find(r => r.path === 'ingredients');
    expect(route).toBeDefined();
    expect(route?.canActivate).toBeDefined();
    expect(route?.canActivate).toContain(AuthGuard as any);
    expect(route?.canActivate).toContain(RoleGuard as any);
    expect(route?.data?.['roles']).toEqual(jasmine.arrayContaining(['ADMIN', 'MANAGER', 'BARMAN']));
  });

  it('should define route /ingredients/new with AuthGuard, RoleGuard and correct roles', () => {
    const route = routes.find(r => r.path === 'ingredients/new');
    expect(route).toBeDefined();
    expect(route?.canActivate).toBeDefined();
    expect(route?.canActivate).toContain(AuthGuard as any);
    expect(route?.canActivate).toContain(RoleGuard as any);
    expect(route?.data?.['roles']).toEqual(jasmine.arrayContaining(['ADMIN', 'MANAGER', 'BARMAN']));
  });

  it('should define route /ingredients/:id with AuthGuard, RoleGuard and correct roles', () => {
    const route = routes.find(r => r.path === 'ingredients/:id');
    expect(route).toBeDefined();
    expect(route?.canActivate).toBeDefined();
    expect(route?.canActivate).toContain(AuthGuard as any);
    expect(route?.canActivate).toContain(RoleGuard as any);
    expect(route?.data?.['roles']).toEqual(jasmine.arrayContaining(['ADMIN', 'MANAGER', 'BARMAN']));
  });

  it('should define route /ingredients/:id/edit with AuthGuard, RoleGuard and correct roles', () => {
    const route = routes.find(r => r.path === 'ingredients/:id/edit');
    expect(route).toBeDefined();
    expect(route?.canActivate).toBeDefined();
    expect(route?.canActivate).toContain(AuthGuard as any);
    expect(route?.canActivate).toContain(RoleGuard as any);
    expect(route?.data?.['roles']).toEqual(jasmine.arrayContaining(['ADMIN', 'MANAGER', 'BARMAN']));
  });

  it('should order ModuleGuard first before AuthGuard and RoleGuard on modular routes', () => {
    const modularPaths = ['ingredients', 'kitchen', 'floor-plan', 'manager/employees', 'manager/pricing'];
    for (const path of modularPaths) {
      const route = routes.find(r => r.path === path);
      expect(route).toBeDefined();
      expect(route?.canActivate?.[0]).toBe(ModuleGuard as any);
    }
  });

  it('should define explicit route for /404 and redirect wildcard ** to /404', () => {
    const notFoundRoute = routes.find(r => r.path === '404');
    expect(notFoundRoute).toBeDefined();
    expect(notFoundRoute?.loadComponent).toBeDefined();

    const wildcardRoute = routes.find(r => r.path === '**');
    expect(wildcardRoute).toBeDefined();
    expect(wildcardRoute?.redirectTo).toBe('/404');
  });
});
