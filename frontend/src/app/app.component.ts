import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';
import { NotificationPanelComponent } from './core/components/notification-panel/notification-panel.component';
import { AppSettingsService } from './core/services/app-settings.service';
import { NotificationService } from './core/services/notification.service';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { AppUpdateService } from './core/services/app-update.service';
import { filter, map, combineLatest, startWith, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectIsAuthenticated } from './core/store/auth.selectors';
import { AsyncPipe, UpperCasePipe } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';

/**
 * Root component of the OpenBar application.
 * Manages responsive layout shells (Navbar, Sidebar, Notification Panel),
 * icon registries, theme initialization, and PWA update checks.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    RouterOutlet, NavbarComponent, SidebarComponent, NotificationPanelComponent,
    AsyncPipe, UpperCasePipe, TranslocoModule, IonIcon
  ],
  standalone: true
})
export class AppComponent implements OnInit {
  showNavbar$: Observable<boolean>;

  constructor(
    private readonly router: Router,
    private readonly appSettingsService: AppSettingsService,
    public readonly notifService: NotificationService,
    public readonly languageService: LanguageService,
    private readonly store: Store,
    private readonly themeService: ThemeService,
    private readonly appUpdateService: AppUpdateService
  ) {
    addIcons(allIcons);
    const isAuth$ = this.store.select(selectIsAuthenticated);
    const isStandaloneRoute = (url: string): boolean => {
      return (
        url.includes('/login') ||
        url.includes('/register') ||
        url.includes('/setup') ||
        url.includes('/client') ||
        url.includes('/qr-client') ||
        url.includes('/404')
      );
    };

    const initialUrl = this.router.url || '';
    const isInitialStandaloneRoute = isStandaloneRoute(initialUrl);

    const isStandaloneRoute$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        return isStandaloneRoute(url);
      }),
      startWith(isInitialStandaloneRoute)
    );

    this.showNavbar$ = combineLatest([isAuth$, isStandaloneRoute$]).pipe(
      map(([isAuth, isStandalone]) => isAuth && !isStandalone)
    );
  }

  ngOnInit() {
    this.appSettingsService.getSettings().subscribe({
      error: () => { /* Preserve default design system settings if the backend API is unreachable */ },
    });
    this.appUpdateService.initStartupCheck();
  }
}
