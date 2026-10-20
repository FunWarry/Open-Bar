import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SystemUpdateService } from '../../../app/core/services/system-update.service';
import {
  SystemVersionInfo,
  SystemUpdateCheck,
  SystemPreFlight,
  SystemUpdateStatus,
  SystemSnapshot,
  SystemUpdateRequest,
} from '../../../app/core/models/system-update.model';
import { environment } from '../../../environments/environment';

describe('SystemUpdateService', () => {
  let service: SystemUpdateService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/admin/system`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SystemUpdateService],
    });
    service = TestBed.inject(SystemUpdateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getVersionInfo() should fetch current runtime version metrics via GET', () => {
    const mockVersion: SystemVersionInfo = {
      currentVersion: '0.8.0',
      javaVersion: '22',
      osName: 'Linux (amd64)',
      uptimeSeconds: 3600,
      freeDiskBytes: 50000000000,
      totalDiskBytes: 100000000000,
    };

    service.getVersionInfo().subscribe((info) => {
      expect(info).toEqual(mockVersion);
      expect(info.currentVersion).toBe('0.8.0');
    });

    const req = httpMock.expectOne(`${baseUrl}/version`);
    expect(req.request.method).toBe('GET');
    req.flush(mockVersion);
  });

  it('checkForUpdates() should query updates with channel query parameter', () => {
    const mockCheck: SystemUpdateCheck = {
      hasUpdate: true,
      currentVersion: '0.8.0',
      latestVersion: '0.8.1',
      channel: 'STABLE',
      releaseTitle: 'Release v0.8.1',
      releaseNotes: 'Performance improvements',
      publishedAt: '2026-10-18T10:00:00Z',
      downloadUrl: 'https://github.com/FunWarry/Open-Bar/releases/tag/v0.8.1',
      isOffline: false,
      statusMessage: 'Update available',
    };

    service.checkForUpdates('STABLE').subscribe((check) => {
      expect(check.hasUpdate).toBeTrue();
      expect(check.latestVersion).toBe('0.8.1');
    });

    const req = httpMock.expectOne(`${baseUrl}/check-update?channel=STABLE`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCheck);
  });

  it('getPreFlight() should query safety preconditions via GET', () => {
    const mockPreflight: SystemPreFlight = {
      canProceed: true,
      freeDiskBytes: 50000000000,
      requiredDiskBytes: 1073741824,
      hasSufficientDisk: true,
      occupiedTablesCount: 0,
      activeOrdersCount: 0,
      warnings: [],
    };

    service.getPreFlight().subscribe((pf) => {
      expect(pf.canProceed).toBeTrue();
      expect(pf.warnings).toHaveSize(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/preflight`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPreflight);
  });

  it('getUpdateStatus() should poll orchestrator status via GET', () => {
    const mockStatus: SystemUpdateStatus = {
      status: 'RUNNING',
      step: 'DATABASE_SNAPSHOT',
      progressPercent: 25,
      message: 'Creating database snapshot...',
      currentVersion: '0.8.0',
      targetVersion: '0.8.1',
      channel: 'STABLE',
      snapshotId: 'openbar_pre_update_0.8.0_20261020',
      startedAt: '2026-10-20T12:00:00Z',
      completedAt: undefined,
      error: undefined,
      logs: ['[12:00:00] Initialisation...'],
    };

    service.getUpdateStatus().subscribe((status) => {
      expect(status.status).toBe('RUNNING');
      expect(status.progressPercent).toBe(25);
    });

    const req = httpMock.expectOne(`${baseUrl}/status`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStatus);
  });

  it('triggerUpdate() should post update request and return status DTO', () => {
    const request: SystemUpdateRequest = {
      targetVersion: '0.8.1',
      channel: 'STABLE',
    };
    const mockStatus: SystemUpdateStatus = {
      status: 'RUNNING',
      step: 'PREFLIGHT',
      progressPercent: 10,
      message: 'Starting update...',
      currentVersion: '0.8.0',
      targetVersion: '0.8.1',
      channel: 'STABLE',
      snapshotId: 'openbar_pre_update_0.8.0',
      startedAt: '2026-10-20T12:00:00Z',
      completedAt: undefined,
      error: undefined,
      logs: [],
    };

    service.triggerUpdate(request).subscribe((res) => {
      expect(res.status).toBe('RUNNING');
    });

    const req = httpMock.expectOne(`${baseUrl}/update`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockStatus);
  });

  it('listSnapshots() should fetch archived snapshots list via GET', () => {
    const mockSnapshots: SystemSnapshot[] = [
      {
        snapshotId: 'snap_1',
        filename: 'snap_1.sql.gz',
        sizeBytes: 15000000,
        createdAt: '2026-10-15T02:00:00Z',
        fromVersion: '0.7.2',
        targetVersion: '0.8.0',
        status: 'VALID',
      },
    ];

    service.listSnapshots().subscribe((snapshots) => {
      expect(snapshots).toHaveSize(1);
      expect(snapshots[0].snapshotId).toBe('snap_1');
    });

    const req = httpMock.expectOne(`${baseUrl}/snapshots`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSnapshots);
  });

  it('restoreSnapshot() should post disaster recovery restore request', () => {
    service.restoreSnapshot('snap_1').subscribe((res) => {
      expect(res.snapshotId).toBe('snap_1');
    });

    const req = httpMock.expectOne(`${baseUrl}/snapshots/snap_1/restore`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Restore initiated', snapshotId: 'snap_1' });
  });

  it('deleteSnapshot() should send DELETE request to remove snapshot', () => {
    service.deleteSnapshot('snap_1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/snapshots/snap_1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
