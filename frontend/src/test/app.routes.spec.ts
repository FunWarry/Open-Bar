import { routes } from '../app/app.routes';
import { AuthGuard } from '../app/core/guards/auth.guard';
import { RoleGuard } from '../app/core/guards/role.guard';

/**
 * Unit tests verifying route configuration for application routes in app.routes.ts,
 * specifically ensuring ingredient management routes and guards are correctly specified.
 */
describe('App Routes - Ingredients', () => {
  it('should define route /ingredients with AuthGuard, RoleGuard and correct roles', () => {
    const route = routes.find(r => r.path === 'ingredients');
    expect(route).toBeDefined();
    expect(route?.canActivate).toContain(AuthGuard);
    expect(route?.canActivate).toContain(RoleGuard);
    expect(route?.data?.['roles']).toEqual(['ADMIN', 'MANAGER', 'BARMAN']);
  });

  it('should define route /ingredients/new with AuthGuard, RoleGuard and correct roles', () => {
    const route = routes.find(r => r.path === 'ingredients/new');
    expect(route).toBeDefined();
    expect(route?.canActivate).toContain(AuthGuard);
    expect(route?.canActivate).toContain(RoleGuard);
    expect(route?.data?.['roles']).toEqual(['ADMIN', 'MANAGER', 'BARMAN']);
  });

  it('should define route /ingredients/:id with AuthGuard, RoleGuard and correct roles', () => {
    const route = routes.find(r => r.path === 'ingredients/:id');
    expect(route).toBeDefined();
    expect(route?.canActivate).toContain(AuthGuard);
    expect(route?.canActivate).toContain(RoleGuard);
    expect(route?.data?.['roles']).toEqual(['ADMIN', 'MANAGER', 'BARMAN']);
  });

  it('should define route /ingredients/:id/edit with AuthGuard, RoleGuard and correct roles', () => {
    const route = routes.find(r => r.path === 'ingredients/:id/edit');
    expect(route).toBeDefined();
    expect(route?.canActivate).toContain(AuthGuard);
    expect(route?.canActivate).toContain(RoleGuard);
    expect(route?.data?.['roles']).toEqual(['ADMIN', 'MANAGER', 'BARMAN']);
  });
});
