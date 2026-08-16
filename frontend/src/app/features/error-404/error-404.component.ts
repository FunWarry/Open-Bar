import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';

/**
 * 404 Error Component displayed when navigating to non-existing routes.
 * Aligned with Figma Common system view 404 specs (`540:1040`).
 */
@Component({
  selector: 'app-error-404',
  standalone: true,
  imports: [RouterLink, TranslocoModule, ActionButtonComponent],
  templateUrl: './error-404.component.html',
  styleUrl: './error-404.component.css'
})
export class Error404Component {}
