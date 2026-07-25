import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { IonBadge, IonIcon } from '@ionic/angular/standalone';

export type UserRoleType = 'ADMIN' | 'MANAGER' | 'SERVEUR' | 'BARMAN' | 'WAITER';

@Component({
  selector: 'app-role-badge',
  standalone: true,
  imports: [IonBadge, IonIcon, NgIf],
  templateUrl: './role-badge.component.html',
  styleUrls: ['./role-badge.component.css']
})
export class RoleBadgeComponent {
  @Input() role: UserRoleType = 'SERVEUR';
  @Input() folded = false;

  get badgeColor(): string {
    const r = this.role.toUpperCase();
    if (r === 'ADMIN') return 'danger';
    if (r === 'MANAGER') return 'warning';
    if (r === 'BARMAN') return 'tertiary';
    return 'primary'; // SERVEUR / WAITER
  }

  get icon(): string {
    const r = this.role.toUpperCase();
    if (r === 'ADMIN') return 'shield-checkmark';
    if (r === 'MANAGER') return 'briefcase';
    if (r === 'BARMAN') return 'wine';
    return 'restaurant'; // SERVEUR / WAITER
  }

  get label(): string {
    const r = this.role.toUpperCase();
    if (r === 'ADMIN') return 'Admin';
    if (r === 'MANAGER') return 'Manager';
    if (r === 'BARMAN') return 'Barman';
    return 'Serveur';
  }
}
