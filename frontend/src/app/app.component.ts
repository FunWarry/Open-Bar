import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {NavbarComponent} from './core/components/navbar/navbar.component';
import {AppSettingsService} from './core/services/app-settings.service';
import {filter} from "rxjs";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [RouterOutlet, NavbarComponent],
  standalone: true
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router,
    private appSettingsService: AppSettingsService,
  ) {
  }

  ngOnInit() {
    // Applique la personnalisation admin (couleurs) dès le chargement — nécessaire dès l'écran de login
    this.appSettingsService.getSettings().subscribe({
      error: () => { /* Réglages par défaut du design system conservés si l'API est indisponible */ },
    });

    // Écouter les changements de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (event.url.includes('/auth/login')) {
        console.log('Navigation vers la page de login');
      }
    });
  }
}
