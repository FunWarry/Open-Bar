import { Component, Input } from '@angular/core';
import { IonAvatar, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmark, briefcase, wine, restaurant, person } from 'ionicons/icons';
import { UserRoleType } from '../role-badge/role-badge.component';

/**
 * User Avatar component conforming to Figma Design System Avatar (ID 120:8).
 *
 * Displays an image avatar or a colored initial circle matching the user's role.
 */
@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [IonAvatar, IonIcon],
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.css']
})
export class UserAvatarComponent {
  constructor() {
    addIcons({
      shieldCheckmark,
      briefcase,
      wine,
      restaurant,
      person
    });
  }
  /** User's full name or username. */
  @Input() name?: string;

  /** Optional direct URL for an image avatar. */
  @Input() avatarUrl?: string;

  /** User's role determining the fallback circle background color. */
  @Input() role?: UserRoleType;

  /** Size variant ('small' = 32px, 'medium' = 44px, 'large' = 64px). */
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  /** Custom data-testid attribute for testing. */
  @Input() testId = 'user-avatar';

  /** Generates 1-2 uppercase initials from the user's name. */
  get initials(): string {
    if (!this.name) return '?';
    const parts = this.name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  /** Gets the role-specific CSS color token for fallback background. */
  get roleColor(): string {
    if (!this.role) return 'var(--primary)';
    const r = this.role.toLowerCase();
    if (r === 'admin') return 'var(--role-admin)';
    if (r === 'manager') return 'var(--role-manager)';
    if (r === 'barman') return 'var(--role-barman)';
    return 'var(--role-serveur)';
  }

  /** Gets the corresponding role icon identifier. */
  get roleIcon(): string {
    if (!this.role) return 'person';
    const r = this.role.toUpperCase();
    if (r === 'ADMIN') return 'shield-checkmark';
    if (r === 'MANAGER') return 'briefcase';
    if (r === 'BARMAN') return 'wine';
    return 'restaurant';
  }
}
