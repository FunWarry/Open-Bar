import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {NavbarComponent} from './core/components/navbar/navbar.component';
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
  ) {
  }

  ngOnInit() {
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
