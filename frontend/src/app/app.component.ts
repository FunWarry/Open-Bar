import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {NavbarComponent} from './core/components/navbar/navbar.component';

@Component({
    selector: 'app-root',
    template: `
    <app-navbar></app-navbar>
    <div class="content">
      <router-outlet></router-outlet>
    </div>
  `,
    styles: [`
    .content {
      padding-top: 64px; /* Hauteur de la barre de navigation */
      min-height: calc(100vh - 64px);
      background-color: #f5f5f5;
    }
  `],
    imports: [RouterOutlet, NavbarComponent],
    standalone: true
})
export class AppComponent {
  title = 'Gestion Cocktail';
}
