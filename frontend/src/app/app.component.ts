import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';
import { NotificationPanelComponent } from './core/components/notification-panel/notification-panel.component';
import { AppSettingsService } from './core/services/app-settings.service';
import { NotificationService } from './core/services/notification.service';
import { ThemeService } from './core/services/theme.service';
import { filter, map, combineLatest, startWith, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectIsAuthenticated } from './core/store/auth.selectors';
import { AsyncPipe } from '@angular/common';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [RouterOutlet, NavbarComponent, SidebarComponent, NotificationPanelComponent, AsyncPipe],
  standalone: true
})
export class AppComponent implements OnInit {
  showNavbar$: Observable<boolean>;

  constructor(
    private readonly router: Router,
    private readonly appSettingsService: AppSettingsService,
    public readonly notifService: NotificationService,
    private readonly store: Store,
    private readonly themeService: ThemeService
  ) {
    addIcons(allIcons);
    const isAuth$ = this.store.select(selectIsAuthenticated);
    const initialUrl = this.router.url || '';
    const isInitialAuthRoute = initialUrl.includes('/login') || initialUrl.includes('/register') || initialUrl.includes('/setup') || initialUrl.includes('/qr-client');

    const isAuthRoute$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => {
        const url = event.urlAfterRedirects || event.url;
        return url.includes('/login') || url.includes('/register') || url.includes('/setup') || url.includes('/qr-client');
      }),
      startWith(isInitialAuthRoute)
    );

    this.showNavbar$ = combineLatest([isAuth$, isAuthRoute$]).pipe(
      map(([isAuth, isAuthRoute]) => isAuth && !isAuthRoute)
    );
  }

  ngOnInit() {
    this.appSettingsService.getSettings().subscribe({
      error: () => { /* Réglages par défaut du design system conservés si l'API est indisponible */ },
    });
  }
}
