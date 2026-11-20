import {Component, ChangeDetectionStrategy} from '@angular/core';
import {TranslocoPipe} from '@jsverse/transloco';
import {BrandLogoComponent} from '../ui/brand-logo/brand-logo.component';

/**
 * Application footer component displaying copyright, versioning, and legal links.
 */
@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslocoPipe, BrandLogoComponent]
})
export class FooterComponent {
}
