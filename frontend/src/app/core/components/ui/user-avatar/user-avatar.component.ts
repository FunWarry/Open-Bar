import { Component, Input } from '@angular/core';

import { IonAvatar, IonIcon } from '@ionic/angular/standalone';
import { UserRoleType } from '../role-badge/role-badge.component';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [IonAvatar, IonIcon],
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.css']
})
export class UserAvatarComponent {
  @Input() name?: string;
  @Input() avatarUrl?: string;
  @Input() role?: UserRoleType;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  get initials(): string {
    if (!this.name) return '?';
    const parts = this.name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  get roleColor(): string {
    if (!this.role) return 'var(--primary)';
    const r = this.role.toLowerCase();
    if (r === 'admin') return 'var(--role-admin)';
    if (r === 'manager') return 'var(--role-manager)';
    if (r === 'barman') return 'var(--role-barman)';
    return 'var(--role-serveur)';
  }

  get roleIcon(): string {
    if (!this.role) return 'person';
    const r = this.role.toUpperCase();
    if (r === 'ADMIN') return 'shield-checkmark';
    if (r === 'MANAGER') return 'briefcase';
    if (r === 'BARMAN') return 'wine';
    return 'restaurant';
  }
}

