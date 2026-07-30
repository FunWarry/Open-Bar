import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { IonBadge, IonIcon } from '@ionic/angular/standalone';

export type UserRoleType = 'ADMIN' | 'MANAGER' | 'SERVEUR' | 'BARMAN' | 'WAITER';

/**
 * Role Badge component conforming to Figma Design System RoleBadge (ID 120:23).
 *
 * Displays a role chip with icon and role-specific color coding.
 */
@Component({
  selector: 'app-role-badge',
  standalone: true,
  imports: [IonBadge, IonIcon, NgIf],
  templateUrl: './role-badge.component.html',
  styleUrls: ['./role-badge.component.css']
})
export class RoleBadgeComponent {
  /** Assigned role. */
  @Input() role: UserRoleType = 'SERVEUR';

  /** Whether the badge is rendered in compact / folded mode (icon only). */
  @Input() folded = false;

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'role-badge';

  get badgeColor(): string {
    const r = this.role.toUpperCase();
    if (r === 'ADMIN') return 'danger';
    if (r === 'MANAGER') return 'warning';
    if (r === 'BARMAN') return 'tertiary';
    return 'primary';
  }

  get icon(): string {
    const r = this.role.toUpperCase();
    if (r === 'ADMIN') return 'shield-checkmark';
    if (r === 'MANAGER') return 'briefcase';
    if (r === 'BARMAN') return 'wine';
    return 'restaurant';
  }

  get label(): string {
    const r = this.role.toUpperCase();
    if (r === 'ADMIN') return 'Admin';
    if (r === 'MANAGER') return 'Manager';
    if (r === 'BARMAN') return 'Barman';
    return 'Serveur';
  }
}
