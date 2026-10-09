import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { ChecklistService } from '../../../app/core/services/checklist.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { environment } from '../../../environments/environment';
import {
  ChecklistEvent,
  ChecklistRun,
  ChecklistStats,
  ChecklistTemplate,
  CreateChecklistTemplateRequest,
  StartChecklistRunRequest,
  ToggleChecklistRunItemRequest
} from '../../../app/core/models/checklist.model';

describe('ChecklistService', () => {
  let service: ChecklistService;
  let httpMock: HttpTestingController;
  let wsMock: jasmine.SpyObj<WebSocketService>;
  let wsSubject: Subject<any>;
  const baseUrl = `${environment.apiUrl}/checklists`;

  const sampleTemplate: ChecklistTemplate = {
    id: 1,
    title: 'Opening Checklist',
    description: 'Daily opening tasks',
    category: 'OPENING',
    estimatedDurationMinutes: 15,
    icon: 'sunny-outline',
    color: 'var(--primary)',
    isActive: true,
    items: [
      {
        id: 10,
        title: 'Check Refrigerators',
        description: 'Verify temperatures',
        isMandatory: true,
        orderIndex: 1,
        targetRole: 'BARMAN',
        mediaType: 'NONE'
      }
    ]
  };

  const sampleRun: ChecklistRun = {
    id: 100,
    templateId: 1,
    templateTitle: 'Opening Checklist',
    category: 'OPENING',
    status: 'IN_PROGRESS',
    startedAt: '2026-10-10T08:00:00Z',
    createdByName: 'testuser',
    totalItemsCount: 1,
    completedItemsCount: 0,
    progressPercentage: 0,
    completionPercentage: 0,
    mandatoryPendingCount: 1,
    items: [
      {
        id: 200,
        templateItemId: 10,
        title: 'Check Refrigerators',
        isMandatory: true,
        targetRole: 'BARMAN',
        isCompleted: false,
        orderIndex: 1,
        mediaType: 'NONE'
      }
    ]
  };

  const sampleStats: ChecklistStats = {
    activeRunsCount: 1,
    completedTodayCount: 2,
    totalTemplatesCount: 3,
    completionRateToday: 80
  };

  beforeEach(() => {
    wsSubject = new Subject<any>();
    wsMock = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsMock.watch.and.returnValue(wsSubject.asObservable());

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ChecklistService,
        { provide: WebSocketService, useValue: wsMock }
      ]
    });

    service = TestBed.inject(ChecklistService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and connect to WebSocket topic', () => {
    expect(service).toBeTruthy();
    expect(wsMock.watch).toHaveBeenCalledWith('/topic/checklists');
  });

  describe('Template Management', () => {
    it('should load templates with default activeOnly parameter', () => {
      service.loadTemplates().subscribe(templates => {
        expect(templates).toHaveSize(1);
        expect(templates[0].id).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/templates?activeOnly=false`);
      expect(req.request.method).toBe('GET');
      req.flush([sampleTemplate]);

      expect(service.templates()).toEqual([sampleTemplate]);
    });

    it('should load templates filtered by category', () => {
      service.loadTemplates('CLOSING', true).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/templates?activeOnly=true&category=CLOSING`);
      expect(req.request.method).toBe('GET');
      req.flush([sampleTemplate]);
    });

    it('should handle template loading error gracefully', () => {
      service.loadTemplates().subscribe(res => {
        expect(res).toEqual([]);
      });

      const req = httpMock.expectOne(`${baseUrl}/templates?activeOnly=false`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should get a single template by id', () => {
      service.getTemplate(1).subscribe(res => {
        expect(res.id).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/templates/1`);
      expect(req.request.method).toBe('GET');
      req.flush(sampleTemplate);
    });

    it('should create a new template and prepend to signal', () => {
      const request: CreateChecklistTemplateRequest = {
        title: 'New Template',
        description: 'New Description',
        category: 'SAFETY_MAINTENANCE',
        estimatedDurationMinutes: 10,
        items: []
      };

      service.createTemplate(request).subscribe(created => {
        expect(created.id).toBe(2);
      });

      const req = httpMock.expectOne(`${baseUrl}/templates`);
      expect(req.request.method).toBe('POST');
      const createdTemplate = { ...sampleTemplate, id: 2, title: 'New Template' };
      req.flush(createdTemplate);

      expect(service.templates()[0].id).toBe(2);
    });

    it('should update an existing template in signal', () => {
      service.templates.set([sampleTemplate]);
      const updateReq: CreateChecklistTemplateRequest = {
        title: 'Updated Title',
        category: 'OPENING',
        estimatedDurationMinutes: 25,
        items: []
      };

      service.updateTemplate(1, updateReq).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/templates/1`);
      expect(req.request.method).toBe('PUT');
      const updatedTemplate = { ...sampleTemplate, title: 'Updated Title' };
      req.flush(updatedTemplate);

      expect(service.templates()[0].title).toBe('Updated Title');
    });

    it('should delete template and remove from signal', () => {
      service.templates.set([sampleTemplate]);

      service.deleteTemplate(1).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/templates/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(service.templates()).toHaveSize(0);
    });
  });

  describe('Run Lifecycle Management', () => {
    it('should load runs and compute active and completed runs', () => {
      service.loadRuns('IN_PROGRESS', 'OPENING').subscribe(runs => {
        expect(runs).toHaveSize(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/runs?status=IN_PROGRESS&category=OPENING`);
      expect(req.request.method).toBe('GET');
      req.flush([sampleRun]);

      expect(service.activeRuns()).toHaveSize(1);
      expect(service.completedRuns()).toHaveSize(0);
    });

    it('should handle run loading error gracefully', () => {
      service.loadRuns().subscribe(res => {
        expect(res).toEqual([]);
      });

      const req = httpMock.expectOne(`${baseUrl}/runs`);
      req.error(new ProgressEvent('Network error'));
      expect(service.isLoading()).toBeFalse();
    });

    it('should get run by id and set selectedRun signal', () => {
      service.getRun(100).subscribe(run => {
        expect(run.id).toBe(100);
      });

      const req = httpMock.expectOne(`${baseUrl}/runs/100`);
      req.flush(sampleRun);

      expect(service.selectedRun()?.id).toBe(100);
    });

    it('should start a run, add to signals, and refresh stats', () => {
      const launchReq: StartChecklistRunRequest = { templateId: 1 };

      service.startRun(launchReq).subscribe(run => {
        expect(run.id).toBe(100);
      });

      const runHttp = httpMock.expectOne(`${baseUrl}/runs`);
      expect(runHttp.request.method).toBe('POST');
      runHttp.flush(sampleRun);

      const statsHttp = httpMock.expectOne(`${baseUrl}/stats`);
      statsHttp.flush(sampleStats);

      expect(service.runs()).toHaveSize(1);
      expect(service.selectedRun()?.id).toBe(100);
    });

    it('should toggle run item and update run signals', () => {
      service.runs.set([sampleRun]);
      service.selectedRun.set(sampleRun);

      const toggleReq: ToggleChecklistRunItemRequest = {
        completed: true,
        isCompleted: true,
        comment: 'Clean and cold',
        photoProofUrl: '/uploads/checklists/proof.jpg'
      };

      service.toggleRunItem(100, 200, toggleReq).subscribe();

      const toggleHttp = httpMock.expectOne(`${baseUrl}/runs/100/items/200`);
      expect(toggleHttp.request.method).toBe('PUT');
      const updatedRun: ChecklistRun = {
        ...sampleRun,
        completedItemsCount: 1,
        progressPercentage: 100,
        items: [{ ...sampleRun.items![0], isCompleted: true }]
      };
      toggleHttp.flush(updatedRun);

      const statsHttp = httpMock.expectOne(`${baseUrl}/stats`);
      statsHttp.flush(sampleStats);

      expect(service.selectedRun()?.completedItemsCount).toBe(1);
    });

    it('should complete a run and update status', () => {
      service.runs.set([sampleRun]);
      service.selectedRun.set(sampleRun);

      service.completeRun(100, { notes: 'All good' }).subscribe();

      const compHttp = httpMock.expectOne(`${baseUrl}/runs/100/complete`);
      expect(compHttp.request.method).toBe('POST');
      const completedRun: ChecklistRun = { ...sampleRun, status: 'COMPLETED' };
      compHttp.flush(completedRun);

      const statsHttp = httpMock.expectOne(`${baseUrl}/stats`);
      statsHttp.flush(sampleStats);

      expect(service.selectedRun()?.status).toBe('COMPLETED');
      expect(service.completedRuns()).toHaveSize(1);
    });

    it('should cancel a run session', () => {
      service.runs.set([sampleRun]);
      service.selectedRun.set(sampleRun);

      service.cancelRun(100).subscribe();

      const cancelHttp = httpMock.expectOne(`${baseUrl}/runs/100/cancel`);
      expect(cancelHttp.request.method).toBe('POST');
      const cancelledRun: ChecklistRun = { ...sampleRun, status: 'CANCELLED' };
      cancelHttp.flush(cancelledRun);

      const statsHttp = httpMock.expectOne(`${baseUrl}/stats`);
      statsHttp.flush(sampleStats);

      expect(service.selectedRun()?.status).toBe('CANCELLED');
    });
  });

  describe('Media Upload & Stats', () => {
    it('should upload media file via multipart FormData', () => {
      const file = new File(['dummy-image'], 'photo.jpg', { type: 'image/jpeg' });

      service.uploadMedia(file).subscribe(res => {
        expect(res.url).toBe('/uploads/checklists/photo.jpg');
        expect(res.mediaType).toBe('IMAGE');
      });

      const req = httpMock.expectOne(`${baseUrl}/media/upload`);
      expect(req.request.method).toBe('POST');
      req.flush({ url: '/uploads/checklists/photo.jpg', mediaType: 'IMAGE' });
    });

    it('should load dashboard statistics', () => {
      service.loadStats().subscribe(stats => {
        expect(stats.activeRunsCount).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/stats`);
      req.flush(sampleStats);
      expect(service.stats()).toEqual(sampleStats);
    });
  });

  describe('WebSocket Event Handling', () => {
    it('should process RUN_STARTED event and prepend to runs', () => {
      const event: ChecklistEvent = {
        eventType: 'RUN_STARTED',
        runId: 100,
        run: sampleRun,
        timestamp: '2026-10-10T12:00:00Z'
      };

      wsSubject.next({ body: JSON.stringify(event) });
      const statsReq = httpMock.expectOne(`${baseUrl}/stats`);
      statsReq.flush(sampleStats);

      expect(service.runs()).toHaveSize(1);
      expect(service.runs()[0].id).toBe(100);
    });

    it('should process ITEM_UPDATED event and update run in state', () => {
      service.runs.set([sampleRun]);
      service.selectedRun.set(sampleRun);

      const updatedRun: ChecklistRun = {
        ...sampleRun,
        completedItemsCount: 1,
        progressPercentage: 100
      };

      const event: ChecklistEvent = {
        eventType: 'ITEM_UPDATED',
        runId: 100,
        run: updatedRun,
        timestamp: '2026-10-10T12:00:00Z'
      };

      wsSubject.next({ body: JSON.stringify(event) });

      expect(service.selectedRun()?.completedItemsCount).toBe(1);
    });

    it('should process TEMPLATE_UPDATED event', () => {
      service.templates.set([sampleTemplate]);

      const updatedTemplate: ChecklistTemplate = {
        ...sampleTemplate,
        title: 'New Realtime Title'
      };

      const event: ChecklistEvent = {
        eventType: 'TEMPLATE_UPDATED',
        templateId: 1,
        template: updatedTemplate,
        timestamp: '2026-10-10T12:00:00Z'
      };

      wsSubject.next({ body: JSON.stringify(event) });

      expect(service.templates()[0].title).toBe('New Realtime Title');
    });

    it('should handle malformed WebSocket JSON payload gracefully without error', () => {
      expect(() => {
        wsSubject.next({ body: 'invalid-json{' });
      }).not.toThrow();
    });
  });
});
