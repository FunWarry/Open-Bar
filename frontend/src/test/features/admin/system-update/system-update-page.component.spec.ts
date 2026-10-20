import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Store } from '@ngrx/store';
import { ToastController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';
import { SystemUpdatePageComponent } from '../../../../app/features/admin/system-update/system-update-page.component';
import { SystemUpdateService } from '../../../../app/core/services/system-update.service';
import {
  SystemVersionInfo,
  SystemUpdateCheck,
  SystemPreFlight,
  SystemUpdateStatus,
  SystemSnapshot,
} from '../../../../app/core/models/system-update.model';
import { User } from '../../../../app/core/models/user.model';

describe('SystemUpdatePageComponent', () => {
  let component: SystemUpdatePageComponent;
  let fixture: ComponentFixture<SystemUpdatePageComponent>;
  let systemUpdateServiceSpy: jasmine.SpyObj<SystemUpdateService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let storeSpy: jasmine.SpyObj<Store>;

  const mockVersion: SystemVersionInfo = {
    currentVersion: '0.8.0',
    javaVersion: '22',
    osName: 'Linux (amd64)',
    uptimeSeconds: 7200,
    freeDiskBytes: 25000000000,
    totalDiskBytes: 100000000000,
  };

  const mockCheck: SystemUpdateCheck = {
    hasUpdate: true,
    currentVersion: '0.8.0',
    latestVersion: '0.8.1',
    channel: 'STABLE',
    releaseTitle: 'Release v0.8.1',
    releaseNotes: 'OTA Updates enabled',
    publishedAt: '2026-10-18T10:00:00Z',
    downloadUrl: 'https://github.com/FunWarry/Open-Bar/releases/tag/v0.8.1',
    isOffline: false,
    statusMessage: 'Update available',
  };

  const mockPreFlight: SystemPreFlight = {
    canProceed: true,
    freeDiskBytes: 25000000000,
    requiredDiskBytes: 1073741824,
    hasSufficientDisk: true,
    occupiedTablesCount: 0,
    activeOrdersCount: 0,
    warnings: [],
  };

  const mockSnapshots: SystemSnapshot[] = [
    {
      snapshotId: 'snap_test_1',
      filename: 'snap_test_1.sql.gz',
      sizeBytes: 14000000,
      createdAt: '2026-10-15T02:00:00Z',
      fromVersion: '0.7.2',
      targetVersion: '0.8.0',
      status: 'VALID',
    },
  ];

  const mockAdminUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@openbar.fr',
    roles: ['ADMIN'],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    systemUpdateServiceSpy = jasmine.createSpyObj('SystemUpdateService', [
      'getVersionInfo',
      'checkForUpdates',
      'getPreFlight',
      'getUpdateStatus',
      'triggerUpdate',
      'listSnapshots',
      'restoreSnapshot',
      'deleteSnapshot',
    ]);

    systemUpdateServiceSpy.getVersionInfo.and.returnValue(of(mockVersion));
    systemUpdateServiceSpy.checkForUpdates.and.returnValue(of(mockCheck));
    systemUpdateServiceSpy.getPreFlight.and.returnValue(of(mockPreFlight));
    systemUpdateServiceSpy.getUpdateStatus.and.returnValue(of(null as unknown as SystemUpdateStatus));
    systemUpdateServiceSpy.listSnapshots.and.returnValue(of(mockSnapshots));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve({
      present: () => Promise.resolve(),
    } as unknown as HTMLIonToastElement));

    storeSpy = jasmine.createSpyObj('Store', ['select']);
    storeSpy.select.and.returnValue(of(mockAdminUser));

    await TestBed.configureTestingModule({
      imports: [SystemUpdatePageComponent, getTranslocoTestingModule()],
      providers: [
        provideRouter([]),
        { provide: SystemUpdateService, useValue: systemUpdateServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: Store, useValue: storeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SystemUpdatePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load version, updates, and snapshots on init', () => {
    expect(component).toBeTruthy();
    expect(component.versionInfo()).toEqual(mockVersion);
    expect(component.updateCheck()).toEqual(mockCheck);
    expect(component.snapshots()).toEqual(mockSnapshots);
    expect(component.isAdmin()).toBeTrue();
  });

  it('should compute formatted disk space strings correctly', () => {
    expect(component.freeDiskGb()).toBe('23.3');
    expect(component.totalDiskGb()).toBe('93.1');
  });

  it('setChannel() should switch selected channel and re-query updates', () => {
    component.setChannel('BETA');
    expect(component.selectedChannel()).toBe('BETA');
    expect(systemUpdateServiceSpy.checkForUpdates).toHaveBeenCalledWith('BETA');
  });

  it('openPreFlightModal() should fetch preflight checks and display modal', () => {
    component.openPreFlightModal();
    expect(systemUpdateServiceSpy.getPreFlight).toHaveBeenCalled();
    expect(component.isPreFlightModalOpen()).toBeTrue();
    expect(component.preFlight()).toEqual(mockPreFlight);

    component.closePreFlightModal();
    expect(component.isPreFlightModalOpen()).toBeFalse();
  });

  it('confirmAndLaunchUpdate() should trigger update API and launch modal', () => {
    const runningStatus: SystemUpdateStatus = {
      status: 'RUNNING',
      step: 'PREFLIGHT',
      progressPercent: 10,
      message: 'Starting update...',
      currentVersion: '0.8.0',
      targetVersion: '0.8.1',
      channel: 'STABLE',
      snapshotId: 'snap_running',
      startedAt: '2026-10-20T12:00:00Z',
      completedAt: undefined,
      error: undefined,
      logs: [],
    };
    systemUpdateServiceSpy.triggerUpdate.and.returnValue(of(runningStatus));

    component.confirmAndLaunchUpdate();

    expect(systemUpdateServiceSpy.triggerUpdate).toHaveBeenCalledWith({
      targetVersion: '0.8.1',
      channel: 'STABLE',
    });
    expect(component.isUpdateModalOpen()).toBeTrue();
    expect(component.updateStatus()).toEqual(runningStatus);
  });

  it('openRestoreModal() and confirmRestoreSnapshot() should execute disaster recovery restore', () => {
    systemUpdateServiceSpy.restoreSnapshot.and.returnValue(of({ message: 'Restored', snapshotId: 'snap_test_1' }));

    component.openRestoreModal(mockSnapshots[0]);
    expect(component.isRestoreModalOpen()).toBeTrue();
    expect(component.targetRestoreSnapshot()).toEqual(mockSnapshots[0]);

    component.confirmRestoreSnapshot();
    expect(systemUpdateServiceSpy.restoreSnapshot).toHaveBeenCalledWith('snap_test_1');
    expect(component.isRestoreModalOpen()).toBeFalse();
  });

  it('deleteSnapshot() should call service and refresh snapshots list', () => {
    systemUpdateServiceSpy.deleteSnapshot.and.returnValue(of(void 0));
    systemUpdateServiceSpy.listSnapshots.and.returnValue(of([]));

    component.deleteSnapshot(mockSnapshots[0]);
    expect(systemUpdateServiceSpy.deleteSnapshot).toHaveBeenCalledWith('snap_test_1');
    expect(systemUpdateServiceSpy.listSnapshots).toHaveBeenCalled();
  });

  it('formatBytes() should correctly format values in Mo and Go', () => {
    expect(component.formatBytes(0)).toBe('0 Mo');
    expect(component.formatBytes(50 * 1024 * 1024)).toBe('50.0 Mo');
    expect(component.formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.50 Go');
  });
});
