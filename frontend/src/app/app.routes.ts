import {Routes} from '@angular/router';
import {AuthGuard} from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'app-home',
    pathMatch: 'full'
  },
  {
    path: 'app-home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'cocktails',
    loadComponent: () => import('./features/cocktails/cocktail-list/cocktail-list.component').then(m => m.CocktailListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'cocktails/new',
    loadComponent: () => import('./features/cocktails/cocktail-form/cocktail-form.component').then(m => m.CocktailFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'cocktails/:id/edit',
    loadComponent: () => import('./features/cocktails/cocktail-form/cocktail-form.component').then(m => m.CocktailFormComponent),
    canActivate: [AuthGuard]
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
    canActivate: [AuthGuard]
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./features/admin/users/user-list/user-list.component').then(m => m.UserListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
