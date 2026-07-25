import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';

@Component({
  selector: 'app-error-404',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, ActionButtonComponent],
  templateUrl: './error-404.component.html',
  styleUrl: './error-404.component.css'
})
export class Error404Component {

}

