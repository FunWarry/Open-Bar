import { Injectable, signal, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import { selectIsAdmin, selectIsAuthenticated } from '../store/auth.selectors';

/** Responsive breakpoint in pixels below which the navigation sidebar is automatically collapsed. */
export const SIDEBAR_COLLAPSE_BREAKPOINT_PX = 1200;

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

  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly ngZone = inject(NgZone);

  constructor() {
    this.initResponsiveListener();
  }

  /**
   * Initializes a window resize listener to automatically adjust sidebar state
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
              this.router.navigate(['/app-home']).then();
            })
          ).subscribe();
        } else {
          this.router.navigate(['/auth/login']).then();
        }
      })
    ).subscribe();
  }

  /**
   * Navigates to the authentication login view.
   */
  navigateToLogin(): void {
    this.router.navigate(['/auth/login']).then();
  }

  /**
   * Navigates to the user registration view.
   */
  navigateToRegister(): void {
    this.router.navigate(['/auth/register']).then();
  }

  /**
   * Navigates to the admin panel if authorized, otherwise to the home view.
   */
  navigateToAdmin(): void {
    this.store.select(selectIsAdmin).pipe(
      take(1),
      map(isAdmin => {
        if (isAdmin) {
          this.router.navigate(['/admin']).then();
        } else {
          this.router.navigate(['/app-home']).then();
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
          this.router.navigate(['/profile']).then();
        } else {
          this.router.navigate(['/auth/login']).then();
        }
      })
    ).subscribe();
  }
}

