import {Component} from '@angular/core';
import {TranslocoPipe} from '@jsverse/transloco';

/**
 * Application footer component displaying copyright, versioning, and legal links.
 */
@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [TranslocoPipe]
})
export class FooterComponent {
}
