import {Routes} from '@angular/router';
import {AuthGuard} from './core/guards/auth.guard';
import {RoleGuard} from './core/guards/role.guard';
import {SetupGuard} from './core/guards/setup.guard';
import {PendingChangesGuard} from './core/guards/pending-changes.guard';
import {ModuleGuard} from './core/guards/module.guard';
import {EstablishmentModule} from './core/models/establishment-module.model';
/**
 * Application routing configuration for OpenBar.
 * Defines lazy-loaded feature routes protected by authentication and role guards.
 */

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'setup',
    loadComponent: () => import('./features/setup/setup.component').then(m => m.SetupComponent),
    canActivate: [SetupGuard]
  },
  {
    path: 'legal',
    loadComponent: () => import('./features/legal/legal.component').then(m => m.LegalComponent)
  },
  {
    path: 'cgu',
    redirectTo: '/legal',
    pathMatch: 'full'
  },
  {
    path: 'terms',
    redirectTo: '/legal',
    pathMatch: 'full'
  },
  {
    path: 'licence',
    redirectTo: '/legal',
    pathMatch: 'full'
  },
  {
    path: 'license',
    redirectTo: '/legal',
    pathMatch: 'full'
  },
  {
    path: 'app-home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {roles: ['ADMIN']}
  },

  // Ingredients management — accessible to ADMIN, MANAGER, BARMAN
  {
    path: 'ingredients',
    loadComponent: () => import('./features/ingredients/ingredient-list/ingredient-list.component').then(m => m.IngredientListComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['ADMIN', 'MANAGER', 'BARMAN'], requiredModule: EstablishmentModule.STOCK_TRACKING }
  },
  {
    path: 'ingredients/new',
    loadComponent: () => import('./features/ingredients/ingredient-form/ingredient-form.component').then(m => m.IngredientFormComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['ADMIN', 'MANAGER', 'BARMAN'], requiredModule: EstablishmentModule.STOCK_TRACKING }
  },
  {
    path: 'ingredients/:id',
    loadComponent: () => import('./features/ingredients/ingredient-form/ingredient-form.component').then(m => m.IngredientFormComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['ADMIN', 'MANAGER', 'BARMAN'], requiredModule: EstablishmentModule.STOCK_TRACKING }
  },
  {
    path: 'ingredients/:id/edit',
    loadComponent: () => import('./features/ingredients/ingredient-form/ingredient-form.component').then(m => m.IngredientFormComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['ADMIN', 'MANAGER', 'BARMAN'], requiredModule: EstablishmentModule.STOCK_TRACKING }
  },

  // Cocktails
  {
    path: 'cocktails',
    loadComponent: () => import('./features/cocktails/cocktail-list/cocktail-list.component').then(m => m.CocktailListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'cocktails/new',
    loadComponent: () => import('./features/cocktails/cocktail-form/cocktail-form.component').then(m => m.CocktailFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {roles: ['ADMIN']}
  },
  {
    path: 'cocktails/:id/edit',
    loadComponent: () => import('./features/cocktails/cocktail-form/cocktail-form.component').then(m => m.CocktailFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {roles: ['ADMIN']}
  },

  // Orders (English routes + legacy /commandes redirects)
  {
    path: 'orders',
    loadComponent: () => import('./features/commandes/commande-list/commande-list.component').then(m => m.CommandeListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'orders/new',
    loadComponent: () => import('./features/commandes/commande-form/commande-form.component').then(m => m.CommandeFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./features/commandes/commande-detail/commande-detail.component').then(m => m.CommandeDetailComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'commandes',
    loadComponent: () => import('./features/commandes/commande-list/commande-list.component').then(m => m.CommandeListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'commandes/new',
    redirectTo: '/orders/new',
    pathMatch: 'full'
  },
  {
    path: 'commandes/nouvelle',
    redirectTo: '/orders/new',
    pathMatch: 'full'
  },
  {
    path: 'commandes/:id',
    loadComponent: () => import('./features/commandes/commande-detail/commande-detail.component').then(m => m.CommandeDetailComponent),
    canActivate: [AuthGuard]
  },

  // Tables
  {
    path: 'tables',
    loadComponent: () => import('./features/tables/table-list/table-list.component').then(m => m.TableListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tables/new',
    loadComponent: () => import('./features/tables/table-form/table-form.component').then(m => m.TableFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tables/:id',
    loadComponent: () => import('./features/tables/table-detail/table-detail.component').then(m => m.TableDetailComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tables/:id/edit',
    loadComponent: () => import('./features/tables/table-form/table-form.component').then(m => m.TableFormComponent),
    canActivate: [AuthGuard]
  },

  // Profile & Admin
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {roles: ['ADMIN']}
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./features/admin/users/user-list/user-list.component').then(m => m.UserListComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {roles: ['ADMIN']}
  },
  {
    path: 'admin/settings',
    loadComponent: () => import('./features/admin/settings/app-settings-page.component').then(m => m.AppSettingsPageComponent),
    canActivate: [AuthGuard, RoleGuard],
    canDeactivate: [PendingChangesGuard],
    data: { roles: ['ADMIN', 'MANAGER'] }
  },
  {
    path: 'settings',
    redirectTo: '/admin/settings',
    pathMatch: 'full'
  },
  {
    path: 'admin/customization',
    redirectTo: '/admin/settings',
    pathMatch: 'full'
  },
  {
    path: 'admin/personnalisation',
    redirectTo: '/admin/settings',
    pathMatch: 'full'
  },
  {
    path: 'admin/establishment',
    redirectTo: '/admin/settings',
    pathMatch: 'full'
  },
  {
    path: 'admin/etablissement',
    redirectTo: '/admin/settings',
    pathMatch: 'full'
  },
  {
    path: 'admin/audit-logs',
    loadComponent: () => import('./features/admin/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {roles: ['ADMIN']}
  },

  // Bartender (English route + /barman)
  {
    path: 'bartender',
    loadComponent: () => import('./features/dashboard-barman/dashboard-barman.component').then(m => m.DashboardBarmanComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['BARMAN', 'ADMIN', 'MANAGER'] }
  },
  {
    path: 'barman',
    loadComponent: () => import('./features/dashboard-barman/dashboard-barman.component').then(m => m.DashboardBarmanComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['BARMAN', 'ADMIN', 'MANAGER'] }
  },

  // Kitchen Display Screen (KDS) (English route /kitchen + /cuisine + /kds)
  {
    path: 'kitchen',
    loadComponent: () => import('./features/kds-kitchen/kds-kitchen.component').then(m => m.KdsKitchenComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['BARMAN', 'ADMIN', 'MANAGER', 'SERVEUR'], requiredModule: EstablishmentModule.CUISINE_KDS }
  },
  {
    path: 'cuisine',
    loadComponent: () => import('./features/kds-kitchen/kds-kitchen.component').then(m => m.KdsKitchenComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['BARMAN', 'ADMIN', 'MANAGER', 'SERVEUR'], requiredModule: EstablishmentModule.CUISINE_KDS }
  },
  {
    path: 'kds',
    redirectTo: '/kitchen',
    pathMatch: 'full'
  },

  // Waiter / Server Dashboard (English route + /serveur)
  {
    path: 'waiter',
    loadComponent: () => import('./features/dashboard-serveur/dashboard-serveur.component').then(m => m.DashboardServeurComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['SERVEUR', 'MANAGER', 'ADMIN'] }
  },
  {
    path: 'waiter/new-order',
    redirectTo: '/waiter',
    pathMatch: 'full',
  },
  {
    path: 'waiter/new-order/:tableId',
    redirectTo: route => `/waiter?tableId=${route.params['tableId']}`,
  },
  {
    path: 'waiter/order-tracking',
    redirectTo: '/waiter?tab=suivi',
    pathMatch: 'full',
  },
  {
    path: 'serveur',
    loadComponent: () => import('./features/dashboard-serveur/dashboard-serveur.component').then(m => m.DashboardServeurComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['SERVEUR', 'MANAGER', 'ADMIN'] }
  },
  {
    path: 'serveur/nouvelle-commande',
    redirectTo: '/serveur',
    pathMatch: 'full',
  },
  {
    path: 'serveur/nouvelle-commande/:tableId',
    redirectTo: route => `/serveur?tableId=${route.params['tableId']}`,
  },
  {
    path: 'serveur/suivi-commandes',
    redirectTo: '/serveur?tab=suivi',
    pathMatch: 'full',
  },

  // Floor Plan (English route + /plan-salle)
  {
    path: 'floor-plan',
    loadComponent: () => import('./features/plan-salle/plan-salle.component').then(m => m.PlanSalleComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['MANAGER', 'ADMIN'], requiredModule: EstablishmentModule.FLOOR_PLAN }
  },
  {
    path: 'plan-salle',
    loadComponent: () => import('./features/plan-salle/plan-salle.component').then(m => m.PlanSalleComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['MANAGER', 'ADMIN'], requiredModule: EstablishmentModule.FLOOR_PLAN }
  },

  // Manager
  {
    path: 'manager',
    loadComponent: () => import('./features/dashboard-manager/dashboard-manager.component').then(m => m.DashboardManagerComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN'] }
  },
  {
    path: 'manager/employees',
    loadComponent: () => import('./features/employees/employees.component').then(m => m.EmployeesComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['MANAGER', 'ADMIN'], requiredModule: EstablishmentModule.EMPLOYEE_MANAGEMENT }
  },
  {
    path: 'manager/schedule',
    loadComponent: () => import('./features/schedule/schedule.component').then(m => m.ScheduleComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['MANAGER', 'ADMIN'], requiredModule: EstablishmentModule.EMPLOYEE_MANAGEMENT }
  },
  {
    path: 'manager/shift-presets',
    loadComponent: () => import('./features/shift-presets/shift-presets-config.component').then(m => m.ShiftPresetsConfigComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    data: { roles: ['MANAGER', 'ADMIN'], requiredModule: EstablishmentModule.EMPLOYEE_MANAGEMENT }
  },
  {
    path: 'manager/timers',
    loadComponent: () => import('./features/admin/settings/app-settings-page.component').then(m => m.AppSettingsPageComponent),
    canActivate: [AuthGuard, RoleGuard],
    canDeactivate: [PendingChangesGuard],
    data: { roles: ['MANAGER', 'ADMIN'], defaultTab: 'timers' }
  },
  {
    path: 'admin/timers',
    loadComponent: () => import('./features/admin/settings/app-settings-page.component').then(m => m.AppSettingsPageComponent),
    canActivate: [AuthGuard, RoleGuard],
    canDeactivate: [PendingChangesGuard],
    data: { roles: ['MANAGER', 'ADMIN'], defaultTab: 'timers' }
  },
  {
    path: 'manager/currency',
    loadComponent: () => import('./features/admin/settings/app-settings-page.component').then(m => m.AppSettingsPageComponent),
    canActivate: [AuthGuard, RoleGuard],
    canDeactivate: [PendingChangesGuard],
    data: { roles: ['MANAGER', 'ADMIN'], defaultTab: 'currency' }
  },
  {
    path: 'manager/pricing',
    loadComponent: () => import('./features/admin/settings/app-settings-page.component').then(m => m.AppSettingsPageComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    canDeactivate: [PendingChangesGuard],
    data: { roles: ['MANAGER', 'ADMIN'], defaultTab: 'pricing', requiredModule: EstablishmentModule.HAPPY_HOUR }
  },
  {
    path: 'admin/pricing',
    loadComponent: () => import('./features/admin/settings/app-settings-page.component').then(m => m.AppSettingsPageComponent),
    canActivate: [AuthGuard, RoleGuard, ModuleGuard],
    canDeactivate: [PendingChangesGuard],
    data: { roles: ['MANAGER', 'ADMIN'], defaultTab: 'pricing', requiredModule: EstablishmentModule.HAPPY_HOUR }
  },

  // Invoices (English route + /factures)
  {
    path: 'invoices',
    loadComponent: () => import('./features/factures/facture-list/facture-list.component').then(m => m.FactureListComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN', 'SERVEUR'] }
  },
  {
    path: 'invoices/recap',
    loadComponent: () => import('./features/factures/facture-recap-journee/facture-recap-journee.component').then(m => m.FactureRecapJourneeComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN'] }
  },
  {
    path: 'invoices/:id/split',
    loadComponent: () => import('./features/factures/facture-split/facture-split.component').then(m => m.FactureSplitComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN', 'SERVEUR'] }
  },
  {
    path: 'invoices/:id',
    loadComponent: () => import('./features/factures/facture-detail/facture-detail.component').then(m => m.FactureDetailComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN', 'SERVEUR'] }
  },
  {
    path: 'factures',
    loadComponent: () => import('./features/factures/facture-list/facture-list.component').then(m => m.FactureListComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN', 'SERVEUR'] }
  },
  {
    path: 'factures/recap',
    loadComponent: () => import('./features/factures/facture-recap-journee/facture-recap-journee.component').then(m => m.FactureRecapJourneeComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN'] }
  },
  {
    path: 'factures/:id/split',
    loadComponent: () => import('./features/factures/facture-split/facture-split.component').then(m => m.FactureSplitComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN', 'SERVEUR'] }
  },
  {
    path: 'factures/:id',
    loadComponent: () => import('./features/factures/facture-detail/facture-detail.component').then(m => m.FactureDetailComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN', 'SERVEUR'] }
  },

  // Client QR & Ordering
  {
    path: 'client/scanner',
    loadComponent: () => import('./features/client/client-qr-scanner/client-qr-scanner.component').then(m => m.ClientQrScannerComponent),
    canActivate: [ModuleGuard],
    data: { requiredModule: EstablishmentModule.QR_CLIENT_ORDERING }
  },
  {
    path: 'client/scan',
    redirectTo: '/client/scanner',
    pathMatch: 'full'
  },
  {
    path: 'client/commande',
    loadComponent: () => import('./features/client/client-commande/client-commande.component').then(m => m.ClientCommandeComponent),
    canActivate: [ModuleGuard],
    data: { requiredModule: EstablishmentModule.QR_CLIENT_ORDERING }
  },
  {
    path: 'client/order',
    redirectTo: '/client/commande',
    pathMatch: 'full'
  },
  {
    path: 'client/suivi/:id',
    loadComponent: () => import('./features/client/client-suivi/client-suivi.component').then(m => m.ClientSuiviComponent),
    canActivate: [ModuleGuard],
    data: { requiredModule: EstablishmentModule.QR_CLIENT_ORDERING }
  },
  {
    path: 'client/tracking/:id',
    redirectTo: route => `/client/suivi/${route.params['id']}`
  },

  // Onboarding & Fallback
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding.component').then(m => m.OnboardingComponent),
    canActivate: [AuthGuard]
  },
  // 404 Not Found explicit route & fallback
  {
    path: '404',
    loadComponent: () => import('./features/error-404/error-404.component').then(m => m.Error404Component),
  },
  {
    path: '**',
    loadComponent: () => import('./features/error-404/error-404.component').then(m => m.Error404Component),
  }
];
