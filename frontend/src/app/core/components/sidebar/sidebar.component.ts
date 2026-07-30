import { Component, signal, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncPipe } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline, restaurantOutline, gridOutline, beerOutline,
  statsChartOutline, receiptOutline, wineOutline, cardOutline,
  nutritionOutline, settingsOutline, documentTextOutline, chevronBackOutline,
  chevronForwardOutline, logOutOutline, personOutline, peopleOutline
} from 'ionicons/icons';
import { selectCurrentUser } from '../../store/auth.selectors';
import * as AuthActions from '../../store/auth.actions';
import { User } from '../../models/user.model';
import { NavigationService } from '../../services/navigation.service';

/** Interface representing a single navigation item in the sidebar. */
export interface NavItemDef {
  /** Unique identifier for data-testid attributes. */
  id: string;
  /** Router link path destination. */
  route: string;
  /** Ionicons icon identifier. */
  icon: string;
  /** Transloco translation key for item label. */
  labelKey: string;
  /** Optional array of roles permitted to see this item (empty or undefined = accessible to all authenticated). */
  roles?: string[];
  /** Group section in the sidebar menu. */
  section: 'main' | 'admin';
}

/** Predefined navigation items matching all OpenBar application views. */
export const SIDEBAR_NAV_ITEMS: NavItemDef[] = [
  { id: 'nav-home', route: '/app-home', icon: 'home-outline', labelKey: 'NAV.HOME', section: 'main' },
  { id: 'nav-serveur', route: '/serveur', icon: 'restaurant-outline', labelKey: 'NAV.SERVEUR', roles: ['SERVEUR', 'ADMIN', 'MANAGER'], section: 'main' },
  { id: 'nav-plan-salle', route: '/plan-salle', icon: 'grid-outline', labelKey: 'NAV.PLAN_SALLE', roles: ['MANAGER', 'ADMIN', 'SERVEUR'], section: 'main' },
  { id: 'nav-barman', route: '/barman', icon: 'beer-outline', labelKey: 'NAV.BARMAN', roles: ['BARMAN', 'ADMIN', 'MANAGER'], section: 'main' },
  { id: 'nav-manager', route: '/manager', icon: 'stats-chart-outline', labelKey: 'NAV.DASHBOARD', roles: ['MANAGER', 'ADMIN'], section: 'main' },
  { id: 'nav-cocktails', route: '/cocktails', icon: 'wine-outline', labelKey: 'NAV.COCKTAILS', section: 'main' },
  { id: 'nav-commandes', route: '/commandes', icon: 'receipt-outline', labelKey: 'NAV.COMMANDES', section: 'main' },
  { id: 'nav-tables', route: '/tables', icon: 'restaurant-outline', labelKey: 'NAV.TABLES', section: 'main' },
  { id: 'nav-factures', route: '/factures', icon: 'card-outline', labelKey: 'NAV.FACTURES', roles: ['MANAGER', 'ADMIN', 'SERVEUR'], section: 'main' },
  { id: 'nav-ingredients', route: '/ingredients', icon: 'nutrition-outline', labelKey: 'NAV.INGREDIENTS', roles: ['ADMIN', 'MANAGER', 'BARMAN'], section: 'admin' },
  { id: 'nav-users', route: '/admin/users', icon: 'people-outline', labelKey: 'ADMIN.USERS.TITLE', roles: ['ADMIN'], section: 'admin' },
  { id: 'nav-admin', route: '/admin', icon: 'settings-outline', labelKey: 'NAV.ADMIN', roles: ['ADMIN'], section: 'admin' },
  { id: 'nav-audit-logs', route: '/admin/audit-logs', icon: 'document-text-outline', labelKey: 'NAV.AUDIT_LOGS', roles: ['ADMIN'], section: 'admin' },
];

/** Role hex colors per Figma Design System `Rôles` collection. */
const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#9b8af2',
  MANAGER: '#f0a33b',
  SERVEUR: '#34c77b',
  BARMAN: '#4fc3f7',
};

/**
 * Global collapsible side navigation bar component conforming to Figma NavBar (ID 62:59)
 * and NavItem (ID 120:16).
 *
 * Features:
 * - Collapsible 64px (folded) <-> 220px (expanded) layout with smooth CSS transition
 * - Dynamically filters navigation links per active user role(s)
 * - Highlights active route with accent bar and Figma tokens
 * - User footer with Avatar initial circle (Figma ID 120:8) and role color
 * - Accessible keyboard navigation and data-testid attributes
 */
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  standalone: true,
  imports: [
    IonIcon,
    RouterLink, RouterLinkActive, AsyncPipe, TranslocoPipe,
  ],
})
export class SidebarComponent implements OnDestroy {

  /** Signal controlling whether the sidebar is collapsed (64px) or expanded (220px). */
  readonly isCollapsed = signal<boolean>(false);

  /** Observable emitting the currently authenticated user from the NgRx auth store. */
  readonly currentUser$: Observable<User | null>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    public readonly navigationService: NavigationService,
  ) {
    addIcons({
      homeOutline, restaurantOutline, gridOutline, beerOutline,
      statsChartOutline, receiptOutline, wineOutline, cardOutline,
      nutritionOutline, settingsOutline, documentTextOutline, chevronBackOutline,
      chevronForwardOutline, logOutOutline, personOutline, peopleOutline
    });

    this.currentUser$ = this.store.select(selectCurrentUser);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Toggles the collapse state of the sidebar between 64px and 220px. */
  toggleCollapse(): void {
    this.isCollapsed.update(val => !val);
  }

  /**
   * Filters the list of navigation items according to the authenticated user's assigned roles.
   *
   * @param user - The authenticated user or null.
   * @param section - The section group ('main' or 'admin').
   * @returns Array of navigation item definitions accessible to the user.
   */
  getNavItemsForUser(user: User | null, section: 'main' | 'admin'): NavItemDef[] {
    if (!user) return [];
    return SIDEBAR_NAV_ITEMS.filter(item => {
      if (item.section !== section) return false;
      if (!item.roles || item.roles.length === 0) return true;
      return item.roles.some(role => user.roles?.includes(role));
    });
  }

  /**
   * Returns the primary role of the given user according to role hierarchy.
   *
   * @param user - The authenticated user.
   * @returns Primary role string or empty string.
   */
  getPrimaryRole(user: User | null): string {
    if (!user?.roles?.length) return '';
    const precedence = ['ADMIN', 'MANAGER', 'BARMAN', 'SERVEUR'];
    return precedence.find(r => user.roles.includes(r)) ?? user.roles[0];
  }

  /**
   * Generates the single initial letter for the User Avatar (Figma ID 120:8).
   *
   * @param user - The authenticated user.
   * @returns Uppercase initial letter or 'U' fallback.
   */
  getUserInitial(user: User | null): string {
    if (!user?.username) return 'U';
    return user.username.charAt(0).toUpperCase();
  }

  /**
   * Returns the Figma hex color code for the given user's primary role.
   *
   * @param user - The authenticated user.
   * @returns Hex color string.
   */
  getRoleColor(user: User | null): string {
    const role = this.getPrimaryRole(user);
    return ROLE_COLORS[role] ?? '#9b8af2';
  }

  /** Dispatches the logout action to the NgRx store. */
  onLogout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
