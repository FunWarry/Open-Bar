import {Routes} from '@angular/router';
import {AuthGuard} from './core/guards/auth.guard';
import {RoleGuard} from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
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
  {
    path: 'commandes',
    loadComponent: () => import('./features/commandes/commande-list/commande-list.component').then(m => m.CommandeListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'commandes/new',
    loadComponent: () => import('./features/commandes/commande-form/commande-form.component').then(m => m.CommandeFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'commandes/:id',
    loadComponent: () => import('./features/commandes/commande-detail/commande-detail.component').then(m => m.CommandeDetailComponent),
    canActivate: [AuthGuard]
  },
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
    path: 'admin/personnalisation',
    loadComponent: () => import('./features/admin/personnalisation/personnalisation.component').then(m => m.PersonnalisationComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {roles: ['ADMIN']}
  },
  {
    path: 'barman',
    loadComponent: () => import('./features/dashboard-barman/dashboard-barman.component').then(m => m.DashboardBarmanComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['BARMAN'] }
  },
  {
    path: 'serveur',
    loadComponent: () => import('./features/dashboard-serveur/dashboard-serveur.component').then(m => m.DashboardServeurComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['SERVEUR'] }
  },
  {
    path: 'serveur/nouvelle-commande/:tableId',
    loadComponent: () => import('./features/dashboard-serveur/nouvelle-commande/nouvelle-commande.component').then(m => m.NouvelleCommandeComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['SERVEUR'] }
  },
  {
    path: 'serveur/suivi-commandes',
    loadComponent: () => import('./features/dashboard-serveur/kanban-serveur/kanban-serveur.component').then(m => m.KanbanServeurComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['SERVEUR'] }
  },
  {
    path: 'plan-salle',
    loadComponent: () => import('./features/plan-salle/plan-salle.component').then(m => m.PlanSalleComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN'] }
  },
  {
    path: 'manager',
    loadComponent: () => import('./features/dashboard-manager/dashboard-manager.component').then(m => m.DashboardManagerComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN'] }
  },
  {
    path: 'factures',
    loadComponent: () => import('./features/factures/facture-list/facture-list.component').then(m => m.FactureListComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER', 'ADMIN', 'SERVEUR'] }
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
  {
    path: '**',
    loadComponent: () => import('./features/error-404/error-404.component').then(m => m.Error404Component),
  }
];
