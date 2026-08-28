import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonIcon,
  IonContent,
  IonSpinner,
  IonSearchbar,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  timeOutline,
  playOutline,
  filterOutline,
  personOutline,
  peopleOutline,
  calendarOutline,
  createOutline,
  trashOutline,
  addCircleOutline,
  informationCircleOutline,
  chevronDownOutline,
  chevronForwardOutline,
  arrowForwardOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ShiftService } from '../../../core/services/shift.service';
import { EmployeeShift, ShiftAuditAction, ShiftAuditLog } from '../../../core/models/shift.model';
import { User } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Modal displaying the weekly immutable audit log of employee shift modifications.
 * Allows filtering by employee and action, inspecting JSON before/after snapshots,
 * and triggering historical time-travel replay at any logged instant.
 */
@Component({
  selector: 'app-schedule-history-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    SearchableSelectComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonIcon,
    IonContent,
    IonSpinner,
    IonSearchbar
  ],
  templateUrl: './schedule-history-modal.component.html',
  styleUrls: ['./schedule-history-modal.component.scss']
})
export class ScheduleHistoryModalComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly shiftService = inject(ShiftService);
  private readonly userService = inject(UserService);
  private readonly transloco = inject(TranslocoService);

  /** Start of the target week in YYYY-MM-DD format */
  @Input() weekISO!: string;

  logs: ShiftAuditLog[] = [];
  users: User[] = [];
  loading = true;

  selectedUserId: number | 'ALL' = 'ALL';
  selectedAction: ShiftAuditAction | 'ALL' = 'ALL';
  searchQuery = '';

  expandedLogIds = new Set<number>();

  get employeeOptions(): SearchableOption[] {
    const allOption: SearchableOption = {
      value: 'ALL',
      label: this.transloco.translate('SHIFTS.AUDIT.ALL_EMPLOYEES'),
      icon: 'people-outline'
    };
    const userOptions: SearchableOption[] = (this.users || []).map((u) => ({
      value: u.id,
      label: `${u.prenom || ''} ${u.nom ? u.nom.charAt(0) + '.' : ''}`.trim() || u.username,
      icon: 'person-outline'
    }));
    return [allOption, ...userOptions];
  }

  get actionOptions(): SearchableOption[] {
    return [
      {
        value: 'ALL',
        label: this.transloco.translate('SHIFTS.AUDIT.ALL_ACTIONS'),
        icon: 'filter-outline'
      },
      {
        value: 'CREATED',
        label: this.transloco.translate('SHIFTS.AUDIT.ACTION_CREATED'),
        icon: 'add-circle-outline',
        badge: this.transloco.translate('SHIFTS.AUDIT.ACTION_CREATED'),
        badgeType: 'success'
      },
      {
        value: 'UPDATED',
        label: this.transloco.translate('SHIFTS.AUDIT.ACTION_UPDATED'),
        icon: 'create-outline',
        badge: this.transloco.translate('SHIFTS.AUDIT.ACTION_UPDATED'),
        badgeType: 'warning'
      },
      {
        value: 'DELETED',
        label: this.transloco.translate('SHIFTS.AUDIT.ACTION_DELETED'),
        icon: 'trash-outline',
        badge: this.transloco.translate('SHIFTS.AUDIT.ACTION_DELETED'),
        badgeType: 'danger'
      }
    ];
  }

  constructor() {
    addIcons({
      closeOutline,
      timeOutline,
      playOutline,
      filterOutline,
      personOutline,
      peopleOutline,
      calendarOutline,
      createOutline,
      trashOutline,
      addCircleOutline,
      informationCircleOutline,
      chevronDownOutline,
      chevronForwardOutline,
      arrowForwardOutline
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadAuditLogs();
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (list) => {
        this.users = list;
      },
      error: () => {}
    });
  }

  loadAuditLogs(): void {
    this.loading = true;
    const userIdParam = this.selectedUserId === 'ALL' ? undefined : this.selectedUserId;
    this.shiftService.getWeekAuditLog(this.weekISO, userIdParam).subscribe({
      next: (data) => {
        this.logs = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
    this.loadAuditLogs();
  }

  get filteredLogs(): ShiftAuditLog[] {
    return this.logs.filter((log) => {
      if (this.selectedAction !== 'ALL' && log.action !== this.selectedAction) {
        return false;
      }
      if (this.searchQuery && this.searchQuery.trim() !== '') {
        const q = this.searchQuery.toLowerCase().trim();
        const authorMatch = log.changedBy?.toLowerCase().includes(q);
        const nameMatch = `${log.userPrenom || ''} ${log.userNom || ''}`.toLowerCase().includes(q);
        const dateMatch = log.dateShift?.includes(q);
        if (!authorMatch && !nameMatch && !dateMatch) {
          return false;
        }
      }
      return true;
    });
  }

  toggleExpand(id: number): void {
    if (this.expandedLogIds.has(id)) {
      this.expandedLogIds.delete(id);
    } else {
      this.expandedLogIds.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedLogIds.has(id);
  }

  parseSnapshot(json?: string): Partial<EmployeeShift> | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  getActionBadgeColor(action: ShiftAuditAction): string {
    switch (action) {
      case 'CREATED':
        return 'success';
      case 'UPDATED':
        return 'warning';
      case 'DELETED':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getActionIcon(action: ShiftAuditAction): string {
    switch (action) {
      case 'CREATED':
        return 'add-circle-outline';
      case 'UPDATED':
        return 'create-outline';
      case 'DELETED':
        return 'trash-outline';
      default:
        return 'time-outline';
    }
  }

  replayAtInstant(timestamp: string): void {
    this.modalCtrl.dismiss({ action: 'replay', timestamp });
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
