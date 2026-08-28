import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { AuditLogsComponent } from '../../../../app/features/admin/audit-logs/audit-logs.component';
import { AuditLogService } from '../../../../app/core/services/audit-log.service';
import { AuditLog } from '../../../../app/core/models/audit-log.model';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('AuditLogsComponent', () => {
  let component: AuditLogsComponent;
  let fixture: ComponentFixture<AuditLogsComponent>;
  let auditLogServiceSpy: jasmine.SpyObj<AuditLogService>;

  const nowIso = new Date().toISOString();
  const twoDaysAgoIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const mockLogs: AuditLog[] = [
    {
      id: 1,
      userId: 10,
      userUsername: 'admin_user',
      action: 'CREATE',
      entityType: 'Cocktail',
      entityId: 101,
      details: 'Mojito added to catalog',
      timestamp: nowIso
    },
    {
      id: 2,
      userId: 11,
      userUsername: 'serveur_john',
      action: 'TRANSFERT_TABLE',
      entityType: 'Table',
      entityId: 5,
      details: 'Transferred table 5 to table 8',
      timestamp: nowIso
    },
    {
      id: 3,
      userId: null,
      userUsername: 'SYSTEM',
      action: 'DELETE',
      entityType: 'User',
      entityId: 99,
      details: 'Incomplete user deleted',
      timestamp: twoDaysAgoIso
    },
    {
      id: 4,
      userId: 10,
      userUsername: 'admin_user',
      action: 'REGLEMENT_FACTURE',
      entityType: 'Facture',
      entityId: 53,
      details: 'Settled invoice 53 (CARTE)',
      timestamp: nowIso
    },
    {
      id: 5,
      userId: 10,
      userUsername: 'admin_user',
      action: 'LOGIN',
      entityType: 'User',
      entityId: 10,
      details: 'Successful user authentication',
      timestamp: nowIso
    }
  ];

  beforeEach(async () => {
    auditLogServiceSpy = jasmine.createSpyObj('AuditLogService', ['getAuditLogs']);
    auditLogServiceSpy.getAuditLogs.and.returnValue(of(mockLogs));

    await TestBed.configureTestingModule({
      imports: [
        AuditLogsComponent,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: AuditLogService, useValue: auditLogServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and load logs on init', () => {
    expect(component).toBeTruthy();
    expect(auditLogServiceSpy.getAuditLogs).toHaveBeenCalled();
    expect(component.logs()).toHaveSize(5);
    expect(component.loading()).toBeFalse();
    expect(component.errorMessage()).toBeNull();
  });

  it('should calculate live KPI metrics correctly', () => {
    expect(component.kpiTotal()).toBe(5);
    expect(component.kpiToday()).toBe(4); // 4 in the last 24h, 1 is 48h ago
    expect(component.kpiCritical()).toBe(1); // 1 DELETE
    expect(component.kpiUniqueUsers()).toBe(3); // admin_user, serveur_john, SYSTEM
  });

  it('should filter logs by quick category', () => {
    component.setQuickCategory('BILLING');
    expect(component.filteredLogs()).toHaveSize(1);
    expect(component.filteredLogs()[0].action).toBe('REGLEMENT_FACTURE');

    component.setQuickCategory('STOCK_TABLES');
    expect(component.filteredLogs()).toHaveSize(2); // Cocktail (id 1) & Table (id 2)

    component.setQuickCategory('SECURITY');
    expect(component.filteredLogs()).toHaveSize(2); // User DELETE & User LOGIN

    component.setQuickCategory('CREATE');
    expect(component.filteredLogs()).toHaveSize(1);

    component.setQuickCategory('DELETE');
    expect(component.filteredLogs()).toHaveSize(1);

    component.setQuickCategory('ALL');
    expect(component.filteredLogs()).toHaveSize(5);
  });

  it('should filter logs by action and entity type', () => {
    component.selectedAction.set('CREATE');
    expect(component.filteredLogs()).toHaveSize(1);
    expect(component.filteredLogs()[0].action).toBe('CREATE');

    component.selectedAction.set('ALL');
    component.selectedEntityType.set('Facture');
    expect(component.filteredLogs()).toHaveSize(1);
    expect(component.filteredLogs()[0].entityType).toBe('Facture');
  });

  it('should filter logs by date timeframe', () => {
    component.dateFilter.set('TODAY');
    expect(component.filteredLogs()).toHaveSize(4);

    component.dateFilter.set('ALL');
    expect(component.filteredLogs()).toHaveSize(5);
  });

  it('should filter logs by search query matching details, user, action or ID', () => {
    component.searchQuery.set('Mojito');
    expect(component.filteredLogs()).toHaveSize(1);
    expect(component.filteredLogs()[0].userUsername).toBe('admin_user');

    component.searchQuery.set('53');
    expect(component.filteredLogs()).toHaveSize(1);
    expect(component.filteredLogs()[0].entityId).toBe(53);
  });

  it('should handle pagination correctly', () => {
    component.pageSize.set(2);
    expect(component.totalPages()).toBe(3);

    expect(component.paginatedLogs()).toHaveSize(2);
    expect(component.paginationStart()).toBe(1);
    expect(component.paginationEnd()).toBe(2);

    component.goToPage(2);
    expect(component.currentPage()).toBe(2);
    expect(component.paginatedLogs()).toHaveSize(2);
    expect(component.paginationStart()).toBe(3);
    expect(component.paginationEnd()).toBe(4);

    component.goToPage(3);
    expect(component.paginatedLogs()).toHaveSize(1);
    expect(component.paginationStart()).toBe(5);
    expect(component.paginationEnd()).toBe(5);
  });

  it('should reset all filters when resetFilters() is called', () => {
    component.searchQuery.set('Mojito');
    component.selectedAction.set('CREATE');
    component.selectedEntityType.set('Cocktail');
    component.quickCategory.set('CREATE');
    component.dateFilter.set('TODAY');
    component.currentPage.set(2);

    component.resetFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.selectedAction()).toBe('ALL');
    expect(component.selectedEntityType()).toBe('ALL');
    expect(component.quickCategory()).toBe('ALL');
    expect(component.dateFilter()).toBe('ALL');
    expect(component.currentPage()).toBe(1);
    expect(component.filteredLogs()).toHaveSize(5);
  });

  it('should manage log modal inspector lifecycle', () => {
    expect(component.selectedLogForModal()).toBeNull();

    component.openLogModal(mockLogs[0]);
    expect(component.selectedLogForModal()).toEqual(mockLogs[0]);

    component.closeLogModal();
    expect(component.selectedLogForModal()).toBeNull();
  });

  it('should copy JSON payload to clipboard', () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      if (!jasmine.isSpy(navigator.clipboard.writeText)) {
        spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      }
    }

    component.copyJsonPayload(mockLogs[0]);
    expect(component.copiedJson()).toBeTrue();
  });

  it('should export to CSV and JSON without errors', () => {
    spyOn(document.body, 'appendChild');

    expect(() => component.exportToCsv()).not.toThrow();
    expect(() => component.exportToJson()).not.toThrow();
  });

  it('should return correct badge colors and action icons', () => {
    expect(component.getActionBadgeColor('CREATE')).toBe('success');
    expect(component.getActionBadgeColor('UPDATE')).toBe('warning');
    expect(component.getActionBadgeColor('DELETE')).toBe('danger');
    expect(component.getActionBadgeColor('LOGIN')).toBe('tertiary');
    expect(component.getActionBadgeColor('REGLEMENT_FACTURE')).toBe('secondary');

    expect(component.getActionIcon('DELETE', 'User')).toBe('trash-outline');
    expect(component.getActionIcon('CREATE', 'Cocktail')).toBe('add-circle-outline');
    expect(component.getActionIcon('LOGIN', 'User')).toBe('lock-closed-outline');
    expect(component.getActionIcon('REGLEMENT', 'Facture')).toBe('receipt-outline');
    expect(component.getActionIcon('READ', 'Cocktail')).toBe('wine-outline');
    expect(component.getActionIcon('READ', 'Ingredient')).toBe('cube-outline');
  });

  it('should compute relative time strings', () => {
    const justNow = new Date().toISOString();
    expect(component.getRelativeTime(justNow)).toBeTruthy();

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(component.getRelativeTime(tenMinutesAgo)).toBeTruthy();

    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    expect(component.getRelativeTime(fiveHoursAgo)).toBeTruthy();

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(component.getRelativeTime(threeDaysAgo)).toBeTruthy();
  });

  it('should handle service errors gracefully', () => {
    spyOn(console, 'error');
    auditLogServiceSpy.getAuditLogs.and.returnValue(throwError(() => new Error('API Error')));
    component.loadLogs();

    expect(component.loading()).toBeFalse();
    expect(component.errorMessage()).toBe('ERRORS.NETWORK');
  });

  it('should refresh logs when handleRefresh is called', () => {
    auditLogServiceSpy.getAuditLogs.and.returnValue(of(mockLogs));
    component.handleRefresh();

    expect(auditLogServiceSpy.getAuditLogs).toHaveBeenCalled();
    expect(component.isRefreshing()).toBeFalse();
    expect(component.logs()).toHaveSize(5);
  });

  it('should return localized labels for actions and entities', () => {
    expect(component.getActionLabel('CREATE')).toBeTruthy();
    expect(component.getActionLabel('REGLEMENT_FACTURE')).toBeTruthy();
    expect(component.getActionLabel('')).toBe('');

    expect(component.getEntityLabel('Facture')).toBeTruthy();
    expect(component.getEntityLabel('Commande')).toBeTruthy();
    expect(component.getEntityLabel('')).toBe('');
  });

  it('should provide dynamic localized select options', () => {
    expect(component.actionOptions().length).toBeGreaterThan(0);
    expect(component.entityTypeOptions().length).toBeGreaterThan(0);
    expect(component.dateFilterOptions().length).toBeGreaterThan(0);
  });
});
