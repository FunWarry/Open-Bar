import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { AppSettingsService } from './core/services/app-settings.service';
import { filter, map, combineLatest, startWith, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectIsAuthenticated } from './core/store/auth.selectors';
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [RouterOutlet, NavbarComponent, NgIf, AsyncPipe],
  standalone: true
})
export class AppComponent implements OnInit {
  showNavbar$: Observable<boolean>;

  constructor(
    private readonly router: Router,
    private readonly appSettingsService: AppSettingsService,
    private readonly store: Store
  ) {
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
