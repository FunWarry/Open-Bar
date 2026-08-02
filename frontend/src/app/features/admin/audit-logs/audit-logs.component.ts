import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  IonSpinner,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonRefresher,
  IonRefresherContent,
  IonButtons,
  IonBackButton,
  IonGrid,
  IonRow,
  IonCol,
  IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  clipboardOutline,
  refreshOutline,
  searchOutline,
  filterOutline,
  personOutline,
  timeOutline,
  cubeOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  warningOutline,
  trashOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

import { AuditLogService } from '../../../core/services/audit-log.service';
import { AuditLog } from '../../../core/models/audit-log.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

/**
 * Component for consulting and filtering system audit logs in the Admin area.
 * Displays real-time operational logs, user actions, and system traceability events.
 */
@Component({
  selector: 'app-audit-logs',
  templateUrl: './audit-logs.component.html',
  styleUrls: ['./audit-logs.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslocoPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonSpinner,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonRefresher,
    IonRefresherContent,
    IonButtons,
    IonBackButton,
    IonGrid,
    IonRow,
    IonCol,
    IonChip
  ]
})
export class AuditLogsComponent implements OnInit {
  /** Signal containing all retrieved audit logs. */
  logs = signal<AuditLog[]>([]);
  /** Signal for global loading state. */
  loading = signal<boolean>(true);
  /** Signal containing potential error messages. */
  errorMessage = signal<string | null>(null);

  /** Signal holding current search text. */
  searchQuery = signal<string>('');
  /** Signal holding selected action filter. */
  selectedAction = signal<string>('ALL');
  /** Signal holding selected entity type filter. */
  selectedEntityType = signal<string>('ALL');

  /** Available action options for filter select. */
  readonly actionOptions = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'TRANSFERT_TABLE', 'FUSION_FACTURES', 'SETUP'];
  /** Available entity type options for filter select. */
  readonly entityTypeOptions = ['ALL', 'User', 'Cocktail', 'Ingredient', 'Commande', 'Facture', 'Table', 'TableEntity'];

  /** Computed list of logs filtered by current user criteria. */
  filteredLogs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const action = this.selectedAction();
    const entityType = this.selectedEntityType();

    return this.logs().filter(log => {
      // Filter by Action
      if (action !== 'ALL' && log.action !== action) {
        return false;
      }
      // Filter by Entity Type
      if (entityType !== 'ALL' && log.entityType !== entityType) {
        return false;
      }
      // Search query matching
      if (query.length > 0) {
        const username = (log.userUsername || '').toLowerCase();
        const actionText = (log.action || '').toLowerCase();
        const entityTypeText = (log.entityType || '').toLowerCase();
        const detailsText = (log.details || '').toLowerCase();
        const entityIdText = log.entityId !== null ? String(log.entityId) : '';

        return username.includes(query) ||
               actionText.includes(query) ||
               entityTypeText.includes(query) ||
               detailsText.includes(query) ||
               entityIdText.includes(query);
      }
      return true;
    });
  });

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly translocoService: TranslocoService
  ) {
    addIcons({
      clipboardOutline,
      refreshOutline,
      searchOutline,
      filterOutline,
      personOutline,
      timeOutline,
      cubeOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      warningOutline,
      trashOutline,
      shieldCheckmarkOutline
    });
  }

  ngOnInit(): void {
    this.loadLogs();
  }

  /**
   * Fetches audit logs from backend service.
   */
  loadLogs(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auditLogService.getAuditLogs().subscribe({
      next: (data) => {
        this.logs.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching audit logs:', err);
        this.errorMessage.set('ERRORS.NETWORK');
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles pull-to-refresh event.
   *
   * @param event Ionic refresher event object
   */
  handleRefresh(event: any): void {
    this.auditLogService.getAuditLogs().subscribe({
      next: (data) => {
        this.logs.set(data || []);
        safeCompleteRefresher(event);
      },
      error: (err) => {
        console.error('Error refreshing audit logs:', err);
        safeCompleteRefresher(event);
      }
    });
  }

  /**
   * Resets all search and select filters to default values.
   */
  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedAction.set('ALL');
    this.selectedEntityType.set('ALL');
  }

  /**
   * Determines badge color based on action type.
   *
   * @param action Action string
   * @returns Ionic color name
   */
  getActionBadgeColor(action: string): string {
    if (!action) return 'medium';
    const upper = action.toUpperCase();
    if (upper.includes('CREATE') || upper.includes('SETUP')) return 'success';
    if (upper.includes('UPDATE') || upper.includes('TRANSFERT')) return 'warning';
    if (upper.includes('DELETE') || upper.includes('CANCEL')) return 'danger';
    if (upper.includes('LOGIN') || upper.includes('AUTH')) return 'tertiary';
    return 'primary';
  }
}
