import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  IonIcon,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  refreshOutline,
  downloadOutline,
  documentTextOutline,
  codeSlashOutline,
  searchOutline,
  closeCircleOutline,
  filterOutline,
  timeOutline,
  personOutline,
  cubeOutline,
  receiptOutline,
  wineOutline,
  restaurantOutline,
  lockClosedOutline,
  alertCircleOutline,
  trashOutline,
  addCircleOutline,
  createOutline,
  swapHorizontalOutline,
  copyOutline,
  checkmarkOutline,
  chevronBackOutline,
  chevronForwardOutline,
  eyeOutline,
  pulseOutline,
  flashOutline,
  sparklesOutline,
  calendarOutline,
  keyOutline,
  arrowBackOutline,
  layersOutline
} from 'ionicons/icons';

import { AuditLogService } from '../../../core/services/audit-log.service';
import { AuditLog } from '../../../core/models/audit-log.model';
import {
  SearchableSelectComponent,
  SearchableOption
} from '../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Quick category filter type.
 */
export type AuditQuickCategory = 'ALL' | 'BILLING' | 'STOCK_TABLES' | 'SECURITY' | 'CREATE' | 'DELETE';

/**
 * Date range timeframe filter type.
 */
export type AuditDateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';

/**
 * Modern component for consulting, inspecting and exporting system audit logs in the Admin area.
 * Features real-time KPI metrics, rich filtering, timeline visualization, and JSON payload inspection.
 */
@Component({
  selector: 'app-audit-logs',
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslocoPipe,
    SearchableSelectComponent,
    IonIcon,
    IonSpinner
  ]
})
export class AuditLogsComponent implements OnInit {
  /** Signal tracking active language changes for dynamic option translations. */
  readonly activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang()
  });

  /** Signal containing all retrieved audit logs. */
  readonly logs = signal<AuditLog[]>([]);
  /** Signal for initial loading state. */
  readonly loading = signal<boolean>(true);
  /** Signal for active refreshing state. */
  readonly isRefreshing = signal<boolean>(false);
  /** Signal containing potential error messages. */
  readonly errorMessage = signal<string | null>(null);

  /** Signal holding current search text. */
  readonly searchQuery = signal<string>('');
  /** Signal holding selected action filter. */
  readonly selectedAction = signal<string>('ALL');
  /** Signal holding selected entity type filter. */
  readonly selectedEntityType = signal<string>('ALL');
  /** Signal holding selected quick category filter. */
  readonly quickCategory = signal<AuditQuickCategory>('ALL');
  /** Signal holding selected date timeframe filter. */
  readonly dateFilter = signal<AuditDateFilter>('ALL');

  /** Pagination state signals. */
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(25);

  /** Log modal inspection signals. */
  readonly selectedLogForModal = signal<AuditLog | null>(null);
  readonly copiedJson = signal<boolean>(false);

  /** Dynamic localized action options for SearchableSelect. */
  readonly actionOptions = computed<SearchableOption[]>(() => {
    this.activeLang();
    return [
      { value: 'ALL', label: this.translocoService.translate('AUDIT_LOGS.ACTIONS.ALL'), badge: 'ALL', badgeType: 'neutral' },
      { value: 'CREATE', label: this.translocoService.translate('AUDIT_LOGS.ACTIONS.CREATE'), badge: 'CREATE', badgeType: 'success' },
      { value: 'UPDATE', label: this.translocoService.translate('AUDIT_LOGS.ACTIONS.UPDATE'), badge: 'UPDATE', badgeType: 'warning' },
      { value: 'DELETE', label: this.translocoService.translate('AUDIT_LOGS.ACTIONS.DELETE'), badge: 'DELETE', badgeType: 'danger' },
      { value: 'LOGIN', label: this.translocoService.translate('AUDIT_LOGS.ACTIONS.LOGIN'), badge: 'AUTH', badgeType: 'primary' },
      { value: 'REGLEMENT_FACTURE', label: this.translocoService.translate('AUDIT_LOGS.ACTIONS.REGLEMENT_FACTURE'), badge: 'PAIEMENT', badgeType: 'primary' },
      { value: 'FACTURE_SETTLED_SPLIT', label: this.translocoService.translate('AUDIT_LOGS.ACTIONS.FACTURE_SETTLED_SPLIT'), badge: 'SPLIT', badgeType: 'primary' },
      { value: 'TRANSFERT_TABLE', label: this.translocoService.translate('AUDIT_LOGS.ACTIONS.TRANSFERT_TABLE'), badge: 'TABLE', badgeType: 'warning' },
      { value: 'FUSION_FACTURES', label: this.translocoService.translate('AUDIT_LOGS.ACTIONS.FUSION_FACTURES'), badge: 'FUSION', badgeType: 'warning' },
      { value: 'SETUP', label: this.translocoService.translate('AUDIT_LOGS.ACTIONS.SETUP'), badge: 'SETUP', badgeType: 'success' },
    ];
  });

  /** Dynamic localized entity type options for SearchableSelect. */
  readonly entityTypeOptions = computed<SearchableOption[]>(() => {
    this.activeLang();
    return [
      { value: 'ALL', label: this.translocoService.translate('AUDIT_LOGS.ENTITIES.ALL'), icon: 'layers-outline' },
      { value: 'Facture', label: this.translocoService.translate('AUDIT_LOGS.ENTITIES.Facture'), icon: 'receipt-outline', badge: 'Facture' },
      { value: 'Commande', label: this.translocoService.translate('AUDIT_LOGS.ENTITIES.Commande'), icon: 'restaurant-outline', badge: 'Commande' },
      { value: 'Cocktail', label: this.translocoService.translate('AUDIT_LOGS.ENTITIES.Cocktail'), icon: 'wine-outline', badge: 'Cocktail' },
      { value: 'Ingredient', label: this.translocoService.translate('AUDIT_LOGS.ENTITIES.Ingredient'), icon: 'cube-outline', badge: 'Stock' },
      { value: 'Table', label: this.translocoService.translate('AUDIT_LOGS.ENTITIES.Table'), icon: 'restaurant-outline', badge: 'Table' },
      { value: 'User', label: this.translocoService.translate('AUDIT_LOGS.ENTITIES.User'), icon: 'person-outline', badge: 'Compte' },
    ];
  });

  /** Dynamic localized date filter options for SearchableSelect. */
  readonly dateFilterOptions = computed<SearchableOption[]>(() => {
    this.activeLang();
    return [
      { value: 'ALL', label: this.translocoService.translate('AUDIT_LOGS.DATE_ALL'), icon: 'calendar-outline' },
      { value: 'TODAY', label: this.translocoService.translate('AUDIT_LOGS.DATE_TODAY'), icon: 'time-outline' },
      { value: 'WEEK', label: this.translocoService.translate('AUDIT_LOGS.DATE_WEEK'), icon: 'calendar-outline' },
      { value: 'MONTH', label: this.translocoService.translate('AUDIT_LOGS.DATE_MONTH'), icon: 'calendar-outline' },
    ];
  });

  /** Page size options. */
  readonly pageSizeOptions: SearchableOption[] = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
  ];

  // --- Computed KPI Statistics ---

  /** Total number of recorded logs. */
  readonly kpiTotal = computed(() => this.logs().length);

  /** Number of events within the last 24 hours. */
  readonly kpiToday = computed(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return this.logs().filter((log) => {
      const time = new Date(log.timestamp).getTime();
      return !Number.isNaN(time) && time >= oneDayAgo;
    }).length;
  });

  /** Number of critical actions (deletions, cancellations). */
  readonly kpiCritical = computed(() => {
    return this.logs().filter((log) => {
      const act = (log.action || '').toUpperCase();
      return act.includes('DELETE') || act.includes('CANCEL') || act.includes('SUPPR');
    }).length;
  });

  /** Number of distinct actors in the log history. */
  readonly kpiUniqueUsers = computed(() => {
    const users = new Set<string>();
    for (const log of this.logs()) {
      if (log.userUsername) {
        users.add(log.userUsername);
      }
    }
    return users.size;
  });

  // --- Computed Filtered Logs & Pagination ---

  /** Computed list of logs filtered by current user criteria. */
  readonly filteredLogs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const action = this.selectedAction();
    const entityType = this.selectedEntityType();
    const category = this.quickCategory();
    const dateRange = this.dateFilter();
    const now = Date.now();

    return this.logs().filter((log) => {
      if (!this.matchesQuickCategory(log, category)) {
        return false;
      }
      if (action !== 'ALL' && log.action !== action) {
        return false;
      }
      if (entityType !== 'ALL' && log.entityType !== entityType) {
        return false;
      }
      if (!this.matchesDateRange(log.timestamp, dateRange, now)) {
        return false;
      }
      return this.matchesSearchQuery(log, query);
    });
  });

  /** Total pages based on filtered logs and page size. */
  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredLogs().length / this.pageSize()) || 1;
  });

  /** Current page slice of logs. */
  readonly paginatedLogs = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredLogs().slice(start, start + size);
  });

  /** 1-based index of first item displayed on current page. */
  readonly paginationStart = computed(() => {
    if (this.filteredLogs().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  /** 1-based index of last item displayed on current page. */
  readonly paginationEnd = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredLogs().length);
  });

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly translocoService: TranslocoService
  ) {
    addIcons({
      shieldCheckmarkOutline,
      refreshOutline,
      downloadOutline,
      documentTextOutline,
      codeSlashOutline,
      searchOutline,
      closeCircleOutline,
      filterOutline,
      timeOutline,
      personOutline,
      cubeOutline,
      receiptOutline,
      wineOutline,
      restaurantOutline,
      lockClosedOutline,
      alertCircleOutline,
      trashOutline,
      addCircleOutline,
      createOutline,
      swapHorizontalOutline,
      copyOutline,
      checkmarkOutline,
      chevronBackOutline,
      chevronForwardOutline,
      eyeOutline,
      pulseOutline,
      flashOutline,
      sparklesOutline,
      calendarOutline,
      keyOutline,
      arrowBackOutline,
      layersOutline
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
   * Handles refresh button click.
   */
  handleRefresh(): void {
    this.isRefreshing.set(true);
    this.auditLogService.getAuditLogs().subscribe({
      next: (data) => {
        this.logs.set(data || []);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        console.error('Error refreshing audit logs:', err);
        this.isRefreshing.set(false);
      }
    });
  }

  /**
   * Sets quick category filter and resets pagination to page 1.
   */
  setQuickCategory(category: AuditQuickCategory): void {
    this.quickCategory.set(category);
    this.currentPage.set(1);
  }

  /**
   * Handles page change with boundary checking.
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  /**
   * Resets all search, category, select and date filters to default values.
   */
  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedAction.set('ALL');
    this.selectedEntityType.set('ALL');
    this.quickCategory.set('ALL');
    this.dateFilter.set('ALL');
    this.currentPage.set(1);
  }

  /**
   * Checks whether a log timestamp falls within the selected date range.
   */
  private matchesDateRange(timestamp: string, dateRange: AuditDateFilter, now: number): boolean {
    if (dateRange === 'ALL') return true;

    const logTime = new Date(timestamp).getTime();
    if (Number.isNaN(logTime)) return false;

    if (dateRange === 'TODAY') return logTime >= now - 24 * 60 * 60 * 1000;
    if (dateRange === 'WEEK') return logTime >= now - 7 * 24 * 60 * 60 * 1000;
    if (dateRange === 'MONTH') return logTime >= now - 30 * 24 * 60 * 60 * 1000;
    return true;
  }

  /**
   * Matches a single log entry against the search query.
   */
  private matchesSearchQuery(log: AuditLog, query: string): boolean {
    if (!query) return true;

    const username = (log.userUsername || '').toLowerCase();
    const actionText = (log.action || '').toLowerCase();
    const entityTypeText = (log.entityType || '').toLowerCase();
    const detailsText = (log.details || '').toLowerCase();
    const entityIdText = log.entityId !== null && log.entityId !== undefined ? String(log.entityId) : '';
    const idText = String(log.id);

    return (
      username.includes(query) ||
      actionText.includes(query) ||
      entityTypeText.includes(query) ||
      detailsText.includes(query) ||
      entityIdText.includes(query) ||
      idText.includes(query)
    );
  }

  /**
   * Matches a single log entry against the selected quick category.
   */
  private matchesQuickCategory(log: AuditLog, category: AuditQuickCategory): boolean {
    if (category === 'ALL') return true;

    const action = (log.action || '').toUpperCase();
    const entity = (log.entityType || '').toLowerCase();

    if (category === 'BILLING') {
      return (
        entity.includes('facture') ||
        action.includes('REGLEMENT') ||
        action.includes('SETTLED') ||
        action.includes('FUSION')
      );
    }
    if (category === 'STOCK_TABLES') {
      return (
        entity.includes('cocktail') ||
        entity.includes('ingredient') ||
        entity.includes('table') ||
        entity.includes('commande') ||
        action.includes('TRANSFERT')
      );
    }
    if (category === 'SECURITY') {
      return (
        entity.includes('user') ||
        action.includes('LOGIN') ||
        action.includes('AUTH') ||
        action.includes('SETUP') ||
        action.includes('PASSWORD')
      );
    }
    if (category === 'CREATE') {
      return action.includes('CREATE') || action.includes('SETUP');
    }
    if (category === 'DELETE') {
      return action.includes('DELETE') || action.includes('CANCEL') || action.includes('SUPPR');
    }

    return true;
  }

  /**
   * Determines badge color based on action type.
   */
  getActionBadgeColor(action: string): string {
    if (!action) return 'primary';
    const upper = action.toUpperCase();
    if (upper.includes('CREATE') || upper.includes('SETUP')) return 'success';
    if (upper.includes('UPDATE') || upper.includes('TRANSFERT') || upper.includes('FUSION')) return 'warning';
    if (upper.includes('DELETE') || upper.includes('CANCEL')) return 'danger';
    if (upper.includes('LOGIN') || upper.includes('AUTH')) return 'tertiary';
    if (upper.includes('REGLEMENT') || upper.includes('SETTLED')) return 'secondary';
    return 'primary';
  }

  /**
   * Determines appropriate icon name for a given action and entity.
   */
  getActionIcon(action: string, entityType: string): string {
    const act = (action || '').toUpperCase();
    const ent = (entityType || '').toLowerCase();

    if (act.includes('DELETE') || act.includes('CANCEL')) return 'trash-outline';
    if (act.includes('CREATE') || act.includes('SETUP')) return 'add-circle-outline';
    if (act.includes('LOGIN') || act.includes('AUTH')) return 'lock-closed-outline';
    if (act.includes('TRANSFERT') || act.includes('FUSION')) return 'swap-horizontal-outline';
    if (act.includes('REGLEMENT') || act.includes('SETTLED') || ent.includes('facture')) return 'receipt-outline';
    if (ent.includes('cocktail')) return 'wine-outline';
    if (ent.includes('ingredient')) return 'cube-outline';
    if (ent.includes('table')) return 'restaurant-outline';
    if (ent.includes('user')) return 'person-outline';

    return 'time-outline';
  }

  /**
   * Returns localized human-readable action label.
   */
  getActionLabel(action: string): string {
    if (!action) return '';
    const key = `AUDIT_LOGS.ACTIONS.${action}`;
    const translated = this.translocoService.translate(key);
    return translated !== key ? translated : action;
  }

  /**
   * Returns localized human-readable entity label.
   */
  getEntityLabel(entityType: string): string {
    if (!entityType) return '';
    const key = `AUDIT_LOGS.ENTITIES.${entityType}`;
    const translated = this.translocoService.translate(key);
    return translated !== key ? translated : entityType;
  }

  /**
   * Computes a human-readable relative time representation.
   */
  getRelativeTime(timestamp: string): string {
    const time = new Date(timestamp).getTime();
    if (Number.isNaN(time)) return timestamp;

    const diffSeconds = Math.floor((Date.now() - time) / 1000);
    if (diffSeconds < 60) {
      return this.translocoService.translate('AUDIT_LOGS.RELATIVE_JUST_NOW');
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return this.translocoService.translate('AUDIT_LOGS.RELATIVE_MINUTES_AGO', { count: diffMinutes });
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return this.translocoService.translate('AUDIT_LOGS.RELATIVE_HOURS_AGO', { count: diffHours });
    }

    const diffDays = Math.floor(diffHours / 24);
    return this.translocoService.translate('AUDIT_LOGS.RELATIVE_DAYS_AGO', { count: diffDays });
  }

  /**
   * Opens the detailed log modal inspection view.
   */
  openLogModal(log: AuditLog): void {
    this.selectedLogForModal.set(log);
    this.copiedJson.set(false);
  }

  /**
   * Closes the detailed log inspection modal.
   */
  closeLogModal(): void {
    this.selectedLogForModal.set(null);
    this.copiedJson.set(false);
  }

  /**
   * Copies formatted JSON representation of the target log into user clipboard.
   */
  copyJsonPayload(log: AuditLog): void {
    const jsonStr = JSON.stringify(log, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(jsonStr);
      this.copiedJson.set(true);
      setTimeout(() => this.copiedJson.set(false), 2000);
    }
  }

  /**
   * Exports filtered audit logs to CSV and triggers browser download.
   */
  exportToCsv(): void {
    const list = this.filteredLogs();
    if (!list || list.length === 0) return;

    const headers = ['ID', 'Date_Heure', 'Acteur', 'Action', 'Type_Entite', 'ID_Entite', 'Details'];
    const rows = list.map((log) => [
      log.id,
      `"${log.timestamp}"`,
      `"${log.userUsername || 'SYSTEM'}"`,
      `"${log.action || ''}"`,
      `"${log.entityType || ''}"`,
      log.entityId ?? '',
      `"${(log.details || '').replaceAll('"', '""')}"`
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `openbar_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Exports filtered audit logs to JSON file and triggers download.
   */
  exportToJson(): void {
    const list = this.filteredLogs();
    if (!list || list.length === 0) return;

    const jsonContent = JSON.stringify(list, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `openbar_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
