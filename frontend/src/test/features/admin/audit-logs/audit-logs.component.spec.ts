import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { AuditLogsComponent } from '../../../../app/features/admin/audit-logs/audit-logs.component';
import { AuditLogService } from '../../../../app/core/services/audit-log.service';
import { AuditLog } from '../../../../app/core/models/audit-log.model';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('AuditLogsComponent', () => {
  let component: AuditLogsComponent;
  let fixture: ComponentFixture<AuditLogsComponent>;
  let auditLogServiceSpy: jasmine.SpyObj<AuditLogService>;

  const mockLogs: AuditLog[] = [
    {
      id: 1,
      userId: 10,
      userUsername: 'admin_user',
      action: 'CREATE',
      entityType: 'Cocktail',
      entityId: 101,
      details: 'Mojito added to catalog',
      timestamp: '2026-07-30T10:00:00Z'
    },
    {
      id: 2,
      userId: 11,
      userUsername: 'serveur_john',
      action: 'TRANSFERT_TABLE',
      entityType: 'Table',
      entityId: 5,
      details: 'Transferred table 5 to table 8',
      timestamp: '2026-07-30T09:30:00Z'
    },
    {
      id: 3,
      userId: null,
      userUsername: 'SYSTEM',
      action: 'DELETE',
      entityType: 'User',
      entityId: 99,
      details: 'Incomplete user deleted',
      timestamp: '2026-07-30T09:00:00Z'
    }
  ];

  beforeEach(async () => {
    auditLogServiceSpy = jasmine.createSpyObj('AuditLogService', ['getAuditLogs']);
    auditLogServiceSpy.getAuditLogs.and.returnValue(of(mockLogs));

    await TestBed.configureTestingModule({
      imports: [
        AuditLogsComponent,
        IonicModule.forRoot(),
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
    expect(component.logs()).toHaveSize(3);
    expect(component.loading()).toBeFalse();
    expect(component.errorMessage()).toBeNull();
  });

  it('should filter logs by action', () => {
    component.selectedAction.set('CREATE');
    expect(component.filteredLogs()).toHaveSize(1);
    expect(component.filteredLogs()[0].action).toBe('CREATE');
  });

  it('should filter logs by entity type', () => {
    component.selectedEntityType.set('Table');
    expect(component.filteredLogs()).toHaveSize(1);
    expect(component.filteredLogs()[0].entityType).toBe('Table');
  });

  it('should filter logs by search query matching details or user', () => {
    component.searchQuery.set('Mojito');
    expect(component.filteredLogs()).toHaveSize(1);
    expect(component.filteredLogs()[0].userUsername).toBe('admin_user');

    component.searchQuery.set('john');
    expect(component.filteredLogs()).toHaveSize(1);
    expect(component.filteredLogs()[0].userUsername).toBe('serveur_john');
  });

  it('should reset all filters when resetFilters() is called', () => {
    component.searchQuery.set('Mojito');
    component.selectedAction.set('CREATE');
    component.selectedEntityType.set('Cocktail');

    component.resetFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.selectedAction()).toBe('ALL');
    expect(component.selectedEntityType()).toBe('ALL');
    expect(component.filteredLogs()).toHaveSize(3);
  });

  it('should handle service error gracefully', () => {
    auditLogServiceSpy.getAuditLogs.and.returnValue(throwError(() => new Error('API Error')));
    component.loadLogs();

    expect(component.loading()).toBeFalse();
    expect(component.errorMessage()).toBe('ERRORS.NETWORK');
    auditLogServiceSpy.getAuditLogs.and.returnValue(of(mockLogs));
  });

  it('should complete refresh event when handleRefresh is triggered', () => {
    const eventMock = {
      target: {
        complete: jasmine.createSpy('complete')
      }
    };

    component.handleRefresh(eventMock);

    expect(auditLogServiceSpy.getAuditLogs).toHaveBeenCalled();
    expect(eventMock.target.complete).toHaveBeenCalled();
  });

  it('should return correct badge colors for action types', () => {
    expect(component.getActionBadgeColor('CREATE')).toBe('success');
    expect(component.getActionBadgeColor('UPDATE')).toBe('warning');
    expect(component.getActionBadgeColor('DELETE')).toBe('danger');
    expect(component.getActionBadgeColor('LOGIN')).toBe('tertiary');
    expect(component.getActionBadgeColor('UNKNOWN')).toBe('primary');
  });
});
