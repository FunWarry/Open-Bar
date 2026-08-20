import { Component, OnInit, OnDestroy, Optional, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest, of, interval } from 'rxjs';
import { takeUntil, filter, map, startWith, distinctUntilChanged } from 'rxjs/operators';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';
import { selectCurrentUser, selectIsAdmin, selectIsAuthenticated } from '../../store/auth.selectors';
import { NavigationService } from '../../services/navigation.service';
import { NotificationService } from '../../services/notification.service';
import { SoundService } from '../../services/sound.service';
import { LanguageService } from '../../services/language.service';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonPopover, IonList, IonItem, IonLabel, IonBadge,
  PopoverController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  home, settings, personCircle, person, logOut, chevronDown,
  notificationsOutline, volumeHighOutline, volumeMuteOutline, timeOutline, globeOutline
} from 'ionicons/icons';
import { AsyncPipe, UpperCasePipe } from '@angular/common';
import * as AuthActions from '../../store/auth.actions';
import { User } from '../../models/user.model';

/** Map from URL prefix to translation key for page titles. */
const ROUTE_TITLE_MAP: Record<string, string> = {
  '/admin/audit-logs': 'NAV.TOPBAR.PAGE_TITLES.AUDIT_LOGS',
  '/admin/users': 'NAV.TOPBAR.PAGE_TITLES.ADMIN',
  '/admin/personnalisation': 'NAV.TOPBAR.PAGE_TITLES.ADMIN',
  '/admin/etablissement': 'NAV.TOPBAR.PAGE_TITLES.ADMIN',
  '/admin': 'NAV.TOPBAR.PAGE_TITLES.ADMIN',
  '/barman': 'NAV.TOPBAR.PAGE_TITLES.BARMAN',
  '/serveur': 'NAV.TOPBAR.PAGE_TITLES.SERVEUR',
  '/plan-salle': 'NAV.TOPBAR.PAGE_TITLES.PLAN_SALLE',
  '/manager': 'NAV.TOPBAR.PAGE_TITLES.MANAGER',
  '/cocktails': 'NAV.TOPBAR.PAGE_TITLES.COCKTAILS',
  '/ingredients': 'NAV.TOPBAR.PAGE_TITLES.INGREDIENTS',
  '/commandes': 'NAV.TOPBAR.PAGE_TITLES.COMMANDES',
  '/tables': 'NAV.TOPBAR.PAGE_TITLES.TABLES',
  '/factures': 'NAV.TOPBAR.PAGE_TITLES.FACTURES',
  '/profile': 'NAV.TOPBAR.PAGE_TITLES.PROFILE',
  '/app-home': 'NAV.TOPBAR.PAGE_TITLES.HOME',
};

/** Figma role colors from the Design System `Roles` collection. */
const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#9b8af2',
  MANAGER: '#f0a33b',
  SERVEUR: '#34c77b',
  BARMAN: '#4fc3f7',
};

/**
 * Global TopBar component displayed on all authenticated routes.
 *
 * Features:
 * - Dynamic page title derived from the current route
 * - Role badge chip showing the active user role with Figma color coding
 * - Establishment local time updated every minute
 * - Notification bell with unread count badge
 * - Sound toggle for audio notifications
 * - User popover menu with profile and logout
 */
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonPopover, IonList, IonItem, IonLabel, IonBadge,
    AsyncPipe, UpperCasePipe, TranslocoPipe,
  ],
})
export class NavbarComponent implements OnInit, OnDestroy {

  /** Whether the navbar should be displayed (authenticated and not on an auth/setup route). */
  readonly shouldShowNavbar$: Observable<boolean>;

  /** Whether the current user has the ADMIN role. */
  readonly isAdmin$: Observable<boolean>;

  /** The currently authenticated user (null when unauthenticated). */
  readonly currentUser$: Observable<User | null>;

  /** Transloco translation key for the page title derived from active route. */
  readonly pageTitleKey$: Observable<string>;

  /** Reactive signal for the number of unread notifications from NotificationService. */
  readonly unreadCount = this.notifService.unreadCount ?? signal(0);

  /** Backwards compatible getter for the unread notifications count. */
  get nonLues(): number {
    return this.unreadCount();
  }

  /** Whether the non-modal side drawer notification panel is open. */
  isNotifPanelOpen = false;

  /** Local time string formatted as HH:mm, updated every minute. */
  readonly localTime = signal<string>(this.formatTime(new Date()));

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    public readonly navigationService: NavigationService,
    private readonly notifService: NotificationService,
    public readonly soundService: SoundService,
    public readonly languageService: LanguageService,
    private readonly popoverCtrl: PopoverController,
    private readonly transloco: TranslocoService,
    @Optional() private readonly router?: Router,
  ) {
    addIcons({
      home, settings, personCircle, person, logOut, chevronDown,
      notificationsOutline, volumeHighOutline, volumeMuteOutline, timeOutline, globeOutline,
    });

    this.isAdmin$ = this.store.select(selectIsAdmin);
    this.currentUser$ = this.store.select(selectCurrentUser);

    const initialUrl = (this.router?.url && this.router.url.length > 0) ? this.router.url : '/';

    const currentUrl$ = this.router ? this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects || event.url),
      startWith(initialUrl),
    ) : of('/');

    const isAuth$ = this.store.select(selectIsAuthenticated);
    const isAuthRoute$ = currentUrl$.pipe(
      map(url => this.isAuthRoute(url)),
    );

    this.shouldShowNavbar$ = combineLatest([isAuth$, isAuthRoute$]).pipe(
      map(([isAuth, isAuthRoute]) => Boolean(isAuth) && !isAuthRoute),
    );

    this.pageTitleKey$ = currentUrl$.pipe(
      map(url => this.resolveTitleKey(url)),
      distinctUntilChanged(),
    );
  }

  ngOnInit(): void {
    // Update local time every minute.
    interval(60_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.localTime.set(this.formatTime(new Date()));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Returns the primary role for the given user.
   * Applies the role precedence: ADMIN > MANAGER > BARMAN > SERVEUR.
   *
   * @param user - The authenticated user.
   * @returns The primary role string, or an empty string when no user is provided.
   */
  getPrimaryRole(user: User | null): string {
    if (!user?.roles?.length) return '';
    const precedence = ['ADMIN', 'MANAGER', 'BARMAN', 'SERVEUR'];
    return precedence.find(r => user.roles.includes(r)) ?? user.roles[0];
  }

  /**
   * Returns the Figma Design System hex color for the given role.
   *
   * @param role - The role string (e.g. 'ADMIN', 'BARMAN').
   * @returns The hex color string, defaulting to the primary text color.
   */
  getRoleBadgeColor(role: string): string {
    return ROLE_COLORS[role] ?? '#eceefb';
  }

  /** Toggles the non-modal side drawer notification panel. */
  toggleNotifPanel(): void {
    this.notifService.toggleNotifPanel();
  }

  /** Closes the non-modal side drawer notification panel. */
  closeNotifPanel(): void {
    this.notifService.closeNotifPanel();
  }

  /** Toggles the notification sound on/off. */
  toggleSound(): void {
    this.soundService.toggleSound();
  }

  /** Dispatches the logout action to the NgRx store. */
  onLogout(): void {
    this.store.dispatch(AuthActions.logout());
  }

  /**
   * Determines whether the given URL corresponds to an authentication or
   * setup route where the TopBar should be hidden.
   *
   * @param url - The URL to check.
   * @returns True if the URL is an auth/setup/client route, false otherwise.
   */
  private isAuthRoute(url: string): boolean {
    return url.includes('/auth/') || url.includes('/setup') || url.includes('/client/');
  }

  /**
   * Resolves the i18n translation key for the page title from the given URL.
   * Matches the longest prefix first to handle nested routes correctly.
   *
   * @param url - The full URL path.
   * @returns The Transloco key for the page title.
   */
  private resolveTitleKey(url: string): string {
    const sortedKeys = Object.keys(ROUTE_TITLE_MAP).sort((a, b) => b.length - a.length);
    const match = sortedKeys.find(prefix => url.startsWith(prefix));
    return match ? ROUTE_TITLE_MAP[match] : 'NAV.TOPBAR.PAGE_TITLES.UNKNOWN';
  }

  /**
   * Formats a Date object as a locale time string (HH:mm).
   *
   * @param date - The date to format.
   * @returns A formatted time string such as "14:35".
   */
  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
