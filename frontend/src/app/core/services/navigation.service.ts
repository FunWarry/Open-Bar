import { Injectable, signal, NgZone, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take, filter } from 'rxjs/operators';
import { selectIsAdmin, selectIsAuthenticated } from '../store/auth.selectors';

/** Responsive breakpoint in pixels below which the navigation sidebar is automatically collapsed. */
export const SIDEBAR_COLLAPSE_BREAKPOINT_PX = 1200;

/** Canonical responsive breakpoint in pixels for mobile viewports (< 768px). */
export const MOBILE_BREAKPOINT_PX = 768;

/**
 * Service managing application-wide navigation state, route redirects,
 * and responsive sidebar collapse behavior.
 */
@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  /** Reactive signal holding the collapsed state of the navigation sidebar. */
  readonly isSidebarCollapsed = signal<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < SIDEBAR_COLLAPSE_BREAKPOINT_PX : false
  );

  /** Reactive signal holding whether the active viewport is a mobile screen (< 768px). */
  readonly isMobile = signal<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT_PX : false
  );

  /** Reactive signal holding the open state of the off-canvas navigation sidebar on mobile (< 768px). */
  readonly isMobileSidebarOpen = signal<boolean>(false);

  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly ngZone = inject(NgZone);

  constructor() {
    this.initResponsiveListener();
    this.router?.events?.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeMobileSidebar();
    });
  }

  /**
   * Initializes a window resize and media query listener to automatically adjust sidebar state
   * on responsive viewport changes.
   */
  private initResponsiveListener(): void {
    if (typeof window === 'undefined') return;

    // Listen to media query match changes for smooth breakpoint handling
    const mediaQuery = window.matchMedia(`(max-width: ${SIDEBAR_COLLAPSE_BREAKPOINT_PX - 1}px)`);
    const handleViewportChange = (e: MediaQueryListEvent | MediaQueryList) => {
      this.ngZone.run(() => {
        if (e.matches) {
          this.isSidebarCollapsed.set(true);
        }
      });
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleViewportChange);
    }

    const updateMobile = () => {
      this.ngZone.run(() => {
        this.isMobile.set(window.innerWidth < MOBILE_BREAKPOINT_PX);
      });
    };
    window.addEventListener('resize', updateMobile, { passive: true });
  }

  /**
   * Toggles the collapse state of the sidebar between folded (64px) and expanded (220px).
   */
  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed.update(val => !val);
  }

  /**
   * Explicitly sets the collapse state of the sidebar.
   *
   * @param collapsed - Boolean indicating whether the sidebar should be collapsed.
   */
  setSidebarCollapsed(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }

  /**
   * Toggles the off-canvas mobile navigation sidebar drawer.
   */
  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(val => !val);
  }

  /**
   * Explicitly opens the off-canvas mobile navigation sidebar drawer.
   */
  openMobileSidebar(): void {
    this.isMobileSidebarOpen.set(true);
  }

  /**
   * Explicitly closes the off-canvas mobile navigation sidebar drawer.
   */
  closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }

  /**
   * Navigates to the appropriate home view based on user authentication and role.
   */
  navigateToHome(): void {
    this.store.select(selectIsAuthenticated).pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          this.store.select(selectIsAdmin).pipe(
            take(1),
            map(() => {
              void this.router.navigate(['/app-home']);
            })
          ).subscribe();
        } else {
          void this.router.navigate(['/auth/login']);
        }
      })
    ).subscribe();
  }

  /**
   * Navigates to the authentication login view.
   */
  navigateToLogin(): void {
    this.ngZone.run(() => {
      this.router.navigate(['/auth/login']).then(navigated => {
        if (!navigated && typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login';
        }
      }).catch(() => {
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login';
        }
      });
    });
  }

  /**
   * Navigates to the user registration view.
   */
  navigateToRegister(): void {
    void this.router.navigate(['/auth/register']);
  }

  /**
   * Navigates to the admin panel if authorized, otherwise to the home view.
   */
  navigateToAdmin(): void {
    this.store.select(selectIsAdmin).pipe(
      take(1),
      map(isAdmin => {
        if (isAdmin) {
          void this.router.navigate(['/admin']);
        } else {
          void this.router.navigate(['/app-home']);
        }
      })
    ).subscribe();
  }

  /**
   * Navigates to the user profile view if authenticated, otherwise to login.
   */
  navigateToUserProfile(): void {
    this.store.select(selectIsAuthenticated).pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          void this.router.navigate(['/profile']);
        } else {
          void this.router.navigate(['/auth/login']);
        }
      })
    ).subscribe();
  }
}

