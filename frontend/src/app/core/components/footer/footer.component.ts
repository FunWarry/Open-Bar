import {Component} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
@Component({
  selector: 'app-footer',
  template: `
    <footer class="footer">
      <div class="footer-content">
        <span>© 2024 Gestion Cocktail. Tous droits réservés.</span>
        <span class="version">Version 1.0.0</span>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background-color: #f5f5f5;
      padding: 1rem;
      text-align: center;
      font-size: 0.875rem;
      color: #666;
    }
    .footer-content {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
    }
    .version {
      color: #999;
    }
  `],
  standalone: true,
  imports: [MatIconModule]
})
export class FooterComponent {
}
