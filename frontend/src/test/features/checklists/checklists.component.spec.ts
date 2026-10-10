import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { of, Subject } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ChecklistsComponent } from '../../../app/features/checklists/checklists.component';
import { ChecklistService } from '../../../app/core/services/checklist.service';
import { AuthService } from '../../../app/core/services/auth.service';
import { UserService } from '../../../app/core/services/user.service';
import { User } from '../../../app/core/models/user.model';
import {
  ChecklistEvent,
  ChecklistMediaType,
  ChecklistRun,
  ChecklistRunItem,
  ChecklistRunStatus,
  ChecklistStats,
  ChecklistTemplate,
} from '../../../app/core/models/checklist.model';

describe('ChecklistsComponent', () => {
  let component: ChecklistsComponent;
  let fixture: ComponentFixture<ChecklistsComponent>;
  let mockChecklistService: Partial<ChecklistService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockUserService: Partial<UserService>;
  let mockToastCtrl: jasmine.SpyObj<ToastController>;
  let mockAlertCtrl: jasmine.SpyObj<AlertController>;

  const templatesSignal = signal<ChecklistTemplate[]>([]);
  const runsSignal = signal<ChecklistRun[]>([]);
  const statsSignal = signal<ChecklistStats>({
    activeRunsCount: 1,
    completedTodayCount: 2,
    totalTemplatesCount: 3,
    completionRateToday: 80,
  });
  const events$ = new Subject<ChecklistEvent>();

  const sampleUsers: User[] = [
    { id: 10, username: 'bob', prenom: 'Bob', nom: 'Martin', role: 'BARMAN', roles: ['BARMAN'] } as any,
    { id: 20, username: 'carol', prenom: 'Carol', nom: 'Dupont', role: 'SERVEUR', roles: ['SERVEUR'] } as any,
  ];

  const sampleTemplate: ChecklistTemplate = {
    id: 1,
    title: 'Bar Opening Routine',
    description: 'SOP opening tasks',
    category: 'OPENING',
    estimatedDurationMinutes: 20,
    icon: 'sunny-outline',
    color: 'var(--primary)',
    isActive: true,
    items: [
      {
        id: 10,
        title: 'Check Ice Machine',
        description: 'Verify ice supply and water filters',
        isMandatory: true,
        orderIndex: 1,
        targetRole: 'BARMAN',
        mediaType: 'NONE',
      },
    ],
  };

  const sampleRunItem: ChecklistRunItem = {
    id: 201,
    templateItemId: 10,
    title: 'Check Ice Machine',
    description: 'Verify ice supply and water filters',
    isMandatory: true,
    orderIndex: 1,
    targetRole: 'BARMAN',
    mediaType: 'NONE',
    isCompleted: false,
  };

  const sampleRun: ChecklistRun = {
    id: 50,
    templateId: 1,
    templateTitle: 'Bar Opening Routine',
    category: 'OPENING',
    status: 'IN_PROGRESS',
    startedAt: '2026-10-09T08:00:00',
    createdById: 1,
    createdByName: 'Alice Smith',
    totalItemsCount: 1,
    completedItemsCount: 0,
    progressPercentage: 0,
    mandatoryPendingCount: 1,
    items: [sampleRunItem],
  };

  beforeEach(async () => {
    templatesSignal.set([sampleTemplate]);
    runsSignal.set([sampleRun]);

    mockChecklistService = {
      templates: templatesSignal,
      runs: runsSignal,
      stats: statsSignal,
      activeRuns: computed(() => runsSignal().filter(r => r.status === 'IN_PROGRESS')),
      events$,
      loadStats: jasmine.createSpy('loadStats').and.returnValue(of(statsSignal())),
      loadTemplates: jasmine.createSpy('loadTemplates').and.returnValue(of([sampleTemplate])),
      loadRuns: jasmine.createSpy('loadRuns').and.returnValue(of([sampleRun])),
      startRun: jasmine.createSpy('startRun').and.returnValue(of(sampleRun)),
      toggleRunItem: jasmine.createSpy('toggleRunItem').and.returnValue(
        of({ ...sampleRun, completedItemsCount: 1, progressPercentage: 100, mandatoryPendingCount: 0 })
      ),
      completeRun: jasmine.createSpy('completeRun').and.returnValue(
        of({ ...sampleRun, status: 'COMPLETED' as ChecklistRunStatus })
      ),
      cancelRun: jasmine.createSpy('cancelRun').and.returnValue(
        of({ ...sampleRun, status: 'CANCELLED' as ChecklistRunStatus })
      ),
      createTemplate: jasmine.createSpy('createTemplate').and.returnValue(of(sampleTemplate)),
      updateTemplate: jasmine.createSpy('updateTemplate').and.returnValue(of(sampleTemplate)),
      deleteTemplate: jasmine.createSpy('deleteTemplate').and.returnValue(of(void 0)),
      uploadMedia: jasmine.createSpy('uploadMedia').and.returnValue(
        of({ url: '/uploads/guide.jpg', mediaType: 'IMAGE' as ChecklistMediaType })
      ),
    };

    mockAuthService = jasmine.createSpyObj('AuthService', ['getStoredUser']);
    mockAuthService.getStoredUser.and.returnValue({
      id: 1,
      username: 'alice',
      role: 'MANAGER',
      roles: ['MANAGER'],
    } as any);

    mockUserService = {
      getUsers: jasmine.createSpy('getUsers').and.returnValue(of(sampleUsers)),
    };

    mockToastCtrl = jasmine.createSpyObj('ToastController', ['create']);
    mockToastCtrl.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    mockAlertCtrl = jasmine.createSpyObj('AlertController', ['create']);
    mockAlertCtrl.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    await TestBed.configureTestingModule({
      imports: [
        ChecklistsComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              CHECKLISTS: {
                TITLE: 'Checklists & Procedures',
                SUBTITLE: 'Operational checklists',
                TABS: { ACTIVE: 'Active', TEMPLATES: 'Templates', HISTORY: 'History' },
                CATEGORIES: {
                  ALL: 'All',
                  OPENING: 'Opening',
                  CLOSING: 'Closing',
                  MID_SHIFT: 'Mid-Shift',
                  CLEANING_HYGIENE: 'Cleaning & HACCP',
                  SAFETY_MAINTENANCE: 'Safety & Maintenance',
                  OTHER: 'Other',
                },
                ROLES: { ALL: 'All Roles', BARMAN: 'Bartender', SERVEUR: 'Server', MANAGER: 'Manager' },
                MEDIA_TYPES: { NONE: 'None', IMAGE: 'Photo', VIDEO: 'Video', EXTERNAL_LINK: 'Link' },
                ACTIONS: {
                  START_RUN: 'Start Routine',
                  LAUNCH: 'Launch',
                  COMPLETE_RUN: 'Complete Procedure',
                  CANCEL_RUN: 'Cancel Session',
                  CREATE_TEMPLATE: 'Create Template',
                  ADD_ITEM: 'Add Task',
                },
                LABELS: {
                  TEMPLATE_TITLE: 'Title',
                  TEMPLATE_TITLE_PLACEHOLDER: 'Title...',
                  TEMPLATE_DESCRIPTION: 'Description',
                  TEMPLATE_DESC_PLACEHOLDER: 'Desc...',
                  CATEGORY: 'Category',
                  DURATION: 'Duration',
                  MINUTES: 'min',
                  TASK_TITLE_PLACEHOLDER: 'Task title...',
                  TARGET_ROLE: 'Role',
                  MANDATORY: 'Required',
                  MEDIA_GUIDE: 'Guide',
                  VIDEO_URL_PLACEHOLDER: 'https://...',
                  UPLOAD_PHOTO: 'Upload photo',
                },
                ALERTS: {
                  TEMPLATE_SAVED_SUCCESS: 'Template saved',
                  RUN_COMPLETED_SUCCESS: 'Run completed',
                },
              },
              COMMON: {
                SUCCESS: 'Success',
                ERROR: 'Error',
                CANCEL: 'Cancel',
                CLOSE: 'Close',
                SAVE: 'Save',
                EDIT: 'Edit',
                DELETE: 'Delete',
                CONFIRM: 'Confirm',
                ALL: 'All',
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: ChecklistService, useValue: mockChecklistService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: ToastController, useValue: mockToastCtrl },
        { provide: AlertController, useValue: mockAlertCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChecklistsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize component and automatically select first active run', () => {
    expect(component).toBeTruthy();
    expect(mockChecklistService.loadStats).toHaveBeenCalled();
    expect(mockChecklistService.loadTemplates).toHaveBeenCalled();
    expect(mockChecklistService.loadRuns).toHaveBeenCalled();
    expect(component.selectedRun()?.id).toBe(50);
  });

  it('should switch tabs smoothly between active, templates, and history', () => {
    component.switchTab('templates');
    expect(component.currentTab()).toBe('templates');

    component.switchTab('history');
    expect(component.currentTab()).toBe('history');

    component.switchTab('active');
    expect(component.currentTab()).toBe('active');
  });

  it('should open and initialize template creation modal with one default item', () => {
    component.openCreateTemplateModal();
    expect(component.isTemplateModalOpen()).toBeTrue();
    expect(component.editingTemplateId).toBeNull();
    expect(component.templateItems).toHaveSize(1);
    expect(component.templateForm.get('category')?.value).toBe('OPENING');
  });

  it('should close template modal when requested', () => {
    component.openCreateTemplateModal();
    expect(component.isTemplateModalOpen()).toBeTrue();

    component.closeTemplateModal();
    expect(component.isTemplateModalOpen()).toBeFalse();
  });

  it('should toggle an item in an active run session with actor attribution', () => {
    component.toggleItem(sampleRunItem);
    expect(mockChecklistService.toggleRunItem).toHaveBeenCalledWith(
      50,
      201,
      jasmine.objectContaining({ isCompleted: true })
    );
  });

  it('should start a run when clicking launch on a template', () => {
    runsSignal.set([]);
    component.startRun(sampleTemplate);
    expect(mockChecklistService.startRun).toHaveBeenCalledWith({ templateId: 1 });
    expect(component.currentTab()).toBe('active');
  });

  it('should focus existing run and not start a duplicate when template is already active', () => {
    runsSignal.set([sampleRun]);
    component.startRun(sampleTemplate);
    expect(mockChecklistService.startRun).not.toHaveBeenCalled();
    expect(component.selectedRun()?.id).toBe(sampleRun.id);
    expect(component.currentTab()).toBe('active');
  });

  it('should add and remove items in the template builder', () => {
    component.openCreateTemplateModal();
    expect(component.templateItems).toHaveSize(1);

    component.addTemplateItemForm();
    expect(component.templateItems).toHaveSize(2);

    component.removeTemplateItemForm(1);
    expect(component.templateItems).toHaveSize(1);
  });

  it('should validate form and save template when valid', () => {
    component.openCreateTemplateModal();
    component.templateForm.patchValue({
      title: 'Closing Checklist',
      description: 'Standard closing procedures',
      category: 'CLOSING',
      estimatedDurationMinutes: 30,
    });
    component.templateItems.at(0).patchValue({
      title: 'Lock safe',
      isMandatory: true,
      targetRole: 'MANAGER',
    });

    component.saveTemplate();
    expect(mockChecklistService.createTemplate).toHaveBeenCalled();
    expect(component.isTemplateModalOpen()).toBeFalse();
  });

  it('should open edit template modal with existing values', () => {
    component.openEditTemplateModal(sampleTemplate);
    expect(component.isTemplateModalOpen()).toBeTrue();
    expect(component.editingTemplateId).toBe(1);
    expect(component.templateForm.get('title')?.value).toBe('Bar Opening Routine');
    expect(component.templateItems).toHaveSize(1);
  });

  it('should save template update when editingTemplateId is set', () => {
    component.openEditTemplateModal(sampleTemplate);
    component.saveTemplate();
    expect(mockChecklistService.updateTemplate).toHaveBeenCalledWith(1, jasmine.any(Object));
    expect(component.isTemplateModalOpen()).toBeFalse();
  });

  it('should prompt and delete template when confirmed', async () => {
    spyOn(component, 'confirmDeleteTemplate').and.callThrough();
    await component.confirmDeleteTemplate(sampleTemplate);
    expect(mockAlertCtrl.create).toHaveBeenCalled();
  });

  it('should prompt and complete active run session', async () => {
    await component.confirmCompleteRun();
    expect(mockAlertCtrl.create).toHaveBeenCalled();
  });

  it('should prompt and cancel active run session', async () => {
    await component.confirmCancelRun();
    expect(mockAlertCtrl.create).toHaveBeenCalled();
  });

  it('should select an execution run and update selectedRun signal', () => {
    component.selectRun(sampleRun);
    expect(component.selectedRun()?.id).toBe(50);
  });

  it('should open and close SOP media guide modal', () => {
    component.openMediaViewer('SOP Guide', 'IMAGE', '/uploads/guide.jpg');
    expect(component.mediaModalState().isOpen).toBeTrue();
    expect(component.mediaModalState().url).toBe('/uploads/guide.jpg');

    component.closeMediaViewer();
    expect(component.mediaModalState().isOpen).toBeFalse();
  });

  it('should open and close comment and photo modal', () => {
    component.openCommentModal(sampleRunItem);
    expect(component.commentModalState().isOpen).toBeTrue();
    expect(component.commentModalState().item?.id).toBe(201);

    component.closeCommentModal();
    expect(component.commentModalState().isOpen).toBeFalse();
  });

  it('should save item comment from modal', () => {
    component.openCommentModal(sampleRunItem);
    component.commentModalState.update(s => ({
      ...s,
      comment: 'Refrigerators at 3°C',
      photoProofUrl: '/uploads/fridge.jpg'
    }));

    component.saveItemComment();
    expect(mockChecklistService.toggleRunItem).toHaveBeenCalledWith(
      50,
      201,
      jasmine.objectContaining({
        comment: 'Refrigerators at 3°C',
        photoProofUrl: '/uploads/fridge.jpg'
      })
    );
    expect(component.commentModalState().isOpen).toBeFalse();
  });

  it('should filter items by category and toggle history audit', () => {
    component.selectedCategory.set('OPENING');
    expect(component.selectedCategory()).toBe('OPENING');

    component.toggleHistoryAudit(50);
    expect(component.expandedHistoryRunId()).toBe(50);
  });

  it('should add and remove procedural SOP sub-steps in template builder', () => {
    component.openCreateTemplateModal();
    expect(component.getStepsArray(0)).toHaveSize(0);

    component.addStepToItem(0);
    expect(component.getStepsArray(0)).toHaveSize(1);

    component.removeStepFromItem(0, 0);
    expect(component.getStepsArray(0)).toHaveSize(0);
  });

  it('should toggle task detail expansion in active run view', () => {
    expect(component.isTaskExpanded(201)).toBeFalse();
    component.toggleTaskExpand(201);
    expect(component.isTaskExpanded(201)).toBeTrue();
    component.toggleTaskExpand(201);
    expect(component.isTaskExpanded(201)).toBeFalse();
  });

  it('should resolve item media list with attachments, json and fallbacks', () => {
    const itemWithAttachments: ChecklistRunItem = {
      ...sampleRunItem,
      mediaAttachments: [{ type: 'IMAGE', url: '/uploads/custom.jpg', title: 'Proof' }],
    };
    expect(component.getItemMediaList(itemWithAttachments)).toHaveSize(1);

    const itemWithJson: ChecklistRunItem = {
      ...sampleRunItem,
      mediaAttachmentsJson: JSON.stringify([{ type: 'VIDEO', url: '/uploads/vid.mp4', title: 'Video' }]),
    };
    expect(component.getItemMediaList(itemWithJson)).toHaveSize(1);

    const itemWithInvalidJson: ChecklistRunItem = {
      ...sampleRunItem,
      mediaAttachmentsJson: 'invalid-json{',
      mediaType: 'IMAGE',
      mediaUrl: '/uploads/fallback.jpg',
    };
    const list = component.getItemMediaList(itemWithInvalidJson);
    expect(list).toHaveSize(1);
    expect(list[0].url).toBe('/uploads/fallback.jpg');

    const itemWithVideoFallback: ChecklistRunItem = {
      ...sampleRunItem,
      mediaType: 'VIDEO',
      videoEmbedUrl: 'https://vimeo.com/12345',
    };
    expect(component.getItemMediaList(itemWithVideoFallback)).toHaveSize(1);

    const itemWithLinkFallback: ChecklistRunItem = {
      ...sampleRunItem,
      mediaType: 'EXTERNAL_LINK',
      videoEmbedUrl: 'https://example.com/sop',
    };
    expect(component.getItemMediaList(itemWithLinkFallback)).toHaveSize(1);
  });

  it('should resolve item steps list with array, json and invalid fallbacks', () => {
    const itemWithSteps: ChecklistRunItem = {
      ...sampleRunItem,
      steps: [{ stepNumber: 1, title: 'Step 1' }],
    };
    expect(component.getItemStepsList(itemWithSteps)).toHaveSize(1);

    const itemWithJson: ChecklistRunItem = {
      ...sampleRunItem,
      stepsJson: JSON.stringify([{ stepNumber: 1, title: 'Step 1' }]),
    };
    expect(component.getItemStepsList(itemWithJson)).toHaveSize(1);

    const itemWithInvalidJson: ChecklistRunItem = {
      ...sampleRunItem,
      stepsJson: 'invalid-json{',
    };
    expect(component.getItemStepsList(itemWithInvalidJson)).toHaveSize(0);
  });

  it('should detect direct playable video URLs correctly', () => {
    expect(component.isVideoUrlDirect(undefined)).toBeFalse();
    expect(component.isVideoUrlDirect('/uploads/guide.mp4')).toBeTrue();
    expect(component.isVideoUrlDirect('/uploads/guide.webm')).toBeTrue();
    expect(component.isVideoUrlDirect('/uploads/guide.mov')).toBeTrue();
    expect(component.isVideoUrlDirect('/uploads/guide.ogg')).toBeTrue();
    expect(component.isVideoUrlDirect('/api/checklists/media/123')).toBeTrue();
    expect(component.isVideoUrlDirect('blob:http://localhost/xyz')).toBeTrue();
    expect(component.isVideoUrlDirect('https://youtube.com/watch?v=123')).toBeFalse();
  });

  it('should resolve image URLs accurately', () => {
    expect(component.resolveImageUrl(undefined)).toBe('');
    expect(component.resolveImageUrl('/uploads/pic.jpg')).toContain('/uploads/pic.jpg');
    expect(component.resolveImageUrl('https://cdn.example.com/pic.jpg')).toBe('https://cdn.example.com/pic.jpg');
  });

  it('should update and remove modal comment photo', () => {
    component.openCommentModal(sampleRunItem);
    component.updateCommentModalText('Updated note');
    expect(component.commentModalState().comment).toBe('Updated note');

    component.commentModalState.update(s => ({ ...s, photoProofUrl: '/uploads/temp.jpg' }));
    component.removeCommentModalPhoto();
    expect(component.commentModalState().photoProofUrl).toBeUndefined();
  });

  it('should handle modal photo selection via file input', () => {
    component.openCommentModal(sampleRunItem);
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const event = {
      target: {
        files: [mockFile],
        value: 'test.jpg',
      },
    } as unknown as Event;

    component.onCommentModalPhotoSelected(event);
    expect(mockChecklistService.uploadMedia).toHaveBeenCalledWith(mockFile);
    expect(component.commentModalState().photoProofUrl).toBe('/uploads/guide.jpg');
  });

  it('should toggle and assign roles for a template item', () => {
    component.openCreateTemplateModal();
    expect(component.isRoleSelectedForItem(0, 'BARMAN')).toBeFalse();

    component.toggleRoleForItem(0, 'BARMAN');
    expect(component.isRoleSelectedForItem(0, 'BARMAN')).toBeTrue();

    component.toggleRoleForItem(0, 'BARMAN');
    expect(component.isRoleSelectedForItem(0, 'BARMAN')).toBeFalse();
  });

  it('should assign and unassign staff users for a template item', () => {
    component.openCreateTemplateModal();
    component.assignUserToItem(0, { value: 10, label: 'Bob Martin (BARMAN)' });
    expect(component.getAssignedUsersList(0)).toHaveSize(1);

    component.assignUserToItem(0, null);
    expect(component.getAssignedUsersList(0)).toHaveSize(1);

    component.removeAssignedUserFromItem(0, 10);
    expect(component.getAssignedUsersList(0)).toHaveSize(0);
  });

  it('should upload media and videos in template builder and remove them', () => {
    component.openCreateTemplateModal();
    const mockFile = new File(['data'], 'guide.jpg', { type: 'image/jpeg' });

    const imageEvent = {
      target: { files: [mockFile], value: 'guide.jpg' },
    } as unknown as Event;
    component.onTemplateMediaSelected(imageEvent, 0);
    expect(component.templateItems.at(0).get('mediaUrl')?.value).toBe('/uploads/guide.jpg');

    const videoEvent = {
      target: { files: [mockFile], value: 'guide.mp4' },
    } as unknown as Event;
    component.onTemplateVideoSelected(videoEvent, 0);
    expect(component.templateItems.at(0).get('mediaType')?.value).toBe('VIDEO');

    component.removeTemplateItemMedia(0);
    expect(component.templateItems.at(0).get('mediaUrl')?.value).toBe('');
  });

  it('should upload and remove step photo in template builder', () => {
    component.openCreateTemplateModal();
    component.addStepToItem(0);
    const mockFile = new File(['data'], 'step.jpg', { type: 'image/jpeg' });

    const stepEvent = {
      target: { files: [mockFile], value: 'step.jpg' },
    } as unknown as Event;
    component.onStepPhotoSelected(stepEvent, 0, 0);
    expect(component.getStepsArray(0).at(0).get('mediaUrl')?.value).toBe('/uploads/guide.jpg');

    component.removeStepPhoto(0, 0);
    expect(component.getStepsArray(0).at(0).get('mediaUrl')?.value).toBe('');
  });

  it('should prevent template saving when form is invalid', () => {
    component.openCreateTemplateModal();
    component.templateForm.patchValue({ title: '' }); // Invalid
    component.saveTemplate();

    expect(mockChecklistService.createTemplate).not.toHaveBeenCalled();
    expect(component.isTemplateModalOpen()).toBeTrue();
  });

  it('should trigger alert handler when confirming template deletion', async () => {
    let capturedHandler: (() => void) | undefined;
    mockAlertCtrl.create.and.callFake((opts: any) => {
      capturedHandler = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return Promise.resolve({ present: () => Promise.resolve() } as any);
    });

    await component.confirmDeleteTemplate(sampleTemplate);
    expect(mockAlertCtrl.create).toHaveBeenCalled();
    capturedHandler?.();
    expect(mockChecklistService.deleteTemplate).toHaveBeenCalledWith(1);
  });

  it('should trigger alert handler when completing run session', async () => {
    const completeRunCopy: ChecklistRun = {
      ...sampleRun,
      mandatoryPendingCount: 0,
    };
    component.selectedRun.set(completeRunCopy);

    let capturedHandler: ((data: any) => void) | undefined;
    mockAlertCtrl.create.and.callFake((opts: any) => {
      capturedHandler = opts.buttons.find((b: any) => b.handler)?.handler;
      return Promise.resolve({ present: () => Promise.resolve() } as any);
    });

    await component.confirmCompleteRun();
    expect(mockAlertCtrl.create).toHaveBeenCalled();
    capturedHandler?.({ notes: 'All clear' });
    expect(mockChecklistService.completeRun).toHaveBeenCalledWith(50, { notes: 'All clear' });
  });

  it('should display warning alert when completing run with pending mandatory tasks', async () => {
    const runWithPending: ChecklistRun = {
      ...sampleRun,
      mandatoryPendingCount: 2,
    };
    component.selectedRun.set(runWithPending);

    await component.confirmCompleteRun();
    expect(mockAlertCtrl.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        buttons: ['Close'],
      })
    );
    expect(mockChecklistService.completeRun).not.toHaveBeenCalled();
  });

  it('should trigger alert handler when cancelling run session', async () => {
    let capturedHandler: (() => void) | undefined;
    mockAlertCtrl.create.and.callFake((opts: any) => {
      capturedHandler = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return Promise.resolve({ present: () => Promise.resolve() } as any);
    });

    await component.confirmCancelRun();
    expect(mockAlertCtrl.create).toHaveBeenCalled();
    capturedHandler?.();
    expect(mockChecklistService.cancelRun).toHaveBeenCalledWith(50);
  });

  it('should update selectedRun when a matching real-time event is received', () => {
    const updatedRun: ChecklistRun = {
      ...sampleRun,
      completedItemsCount: 1,
      progressPercentage: 100,
    };
    events$.next({
      eventType: 'ITEM_UPDATED',
      runId: 50,
      run: updatedRun,
      timestamp: '2026-10-10T12:00:00Z',
    });

    expect(component.selectedRun()?.progressPercentage).toBe(100);
  });

  it('should compute staffUserOptions and filtered lists correctly', () => {
    expect(component.staffUserOptions()).toHaveSize(2);
    expect(component.canManageTemplates()).toBeTrue();

    component.selectedCategory.set('OPENING');
    expect(component.activeRuns()).toHaveSize(1);
    expect(component.filteredTemplates()).toHaveSize(1);

    component.selectedCategory.set('CLOSING');
    expect(component.activeRuns()).toHaveSize(0);
    expect(component.filteredTemplates()).toHaveSize(0);
  });

  it('should filter history runs by status and category', () => {
    const completedRun: ChecklistRun = {
      ...sampleRun,
      id: 51,
      status: 'COMPLETED',
      category: 'OPENING',
    };
    runsSignal.set([completedRun]);

    component.selectedCategory.set('OPENING');
    component.selectedStatus.set('COMPLETED');
    expect(component.filteredHistoryRuns()).toHaveSize(1);

    component.selectedCategory.set('CLOSING');
    expect(component.filteredHistoryRuns()).toHaveSize(0);
  });

  it('should handle switchTab to active when selectedRun is initially null', () => {
    component.selectedRun.set(null);
    runsSignal.set([sampleRun]);
    component.switchTab('active');
    expect(component.selectedRun()?.id).toBe(50);
  });

  it('should trigger proof file input programmatically', () => {
    const input = document.createElement('input');
    input.id = 'proof-photo-file-input';
    document.body.appendChild(input);
    spyOn(input, 'click');

    component.triggerProofFileInput();
    expect(input.click).toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('should trigger item file input by element id programmatically', () => {
    const input = document.createElement('input');
    input.id = 'item-file-input-0';
    document.body.appendChild(input);
    spyOn(input, 'click');

    component.triggerItemFileInput('item-file-input-0');
    expect(input.click).toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('should stop active camera tracks when stopping camera in modal', () => {
    const mockTrack = jasmine.createSpyObj('MediaStreamTrack', ['stop']);
    const mockStream = {
      getTracks: () => [mockTrack],
    } as unknown as MediaStream;

    (component as any).cameraStream = mockStream;
    component.stopInModalCamera();
    expect(mockTrack.stop).toHaveBeenCalled();
    expect((component as any).cameraStream).toBeNull();
  });

  it('should clean up camera stream on destroy', () => {
    const mockTrack = jasmine.createSpyObj('MediaStreamTrack', ['stop']);
    const mockStream = {
      getTracks: () => [mockTrack],
    } as unknown as MediaStream;

    (component as any).cameraStream = mockStream;
    component.ngOnDestroy();
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('should handle camera video metadata loaded event', () => {
    const mockVideo = jasmine.createSpyObj('HTMLVideoElement', ['play']);
    mockVideo.play.and.returnValue(Promise.resolve());
    const event = { target: mockVideo } as unknown as Event;

    component.onCameraVideoLoaded(event);
    expect(mockVideo.play).toHaveBeenCalled();
  });

  it('should handle startRun error gracefully', () => {
    mockChecklistService.startRun = jasmine.createSpy('startRun').and.returnValue(
      new Subject<any>().asObservable()
    );
    // trigger error observable
    const errSub = new Subject<any>();
    mockChecklistService.startRun = jasmine.createSpy('startRun').and.returnValue(errSub.asObservable());

    component.startRun(sampleTemplate);
    errSub.error(new Error('Failed'));
    expect(mockToastCtrl.create).toHaveBeenCalled();
  });

  it('should handle toggleItem error gracefully', () => {
    const errSub = new Subject<any>();
    mockChecklistService.toggleRunItem = jasmine.createSpy('toggleRunItem').and.returnValue(errSub.asObservable());

    component.toggleItem(sampleRunItem);
    errSub.error(new Error('Failed'));
    expect(mockToastCtrl.create).toHaveBeenCalled();
  });

  it('should handle template media upload error gracefully', () => {
    const errSub = new Subject<any>();
    mockChecklistService.uploadMedia = jasmine.createSpy('uploadMedia').and.returnValue(errSub.asObservable());

    component.openCreateTemplateModal();
    const event = {
      target: { files: [new File([''], 'err.jpg', { type: 'image/jpeg' })], value: 'err.jpg' },
    } as unknown as Event;

    component.onTemplateMediaSelected(event, 0);
    errSub.error(new Error('Upload failed'));
    expect(component.uploadingMediaState()).toBeNull();
    expect(mockToastCtrl.create).toHaveBeenCalled();
  });

  it('should populate template items with steps and roles in addTemplateItemForm', () => {
    component.openCreateTemplateModal();
    const complexItem: any = {
      title: 'Detailed task',
      assignedRoles: ['BARMAN', 'SERVEUR'],
      steps: [
        { stepNumber: 1, title: 'Step A', description: 'Desc A' },
        { stepNumber: 2, title: 'Step B', description: 'Desc B' },
      ],
      isMandatory: true,
      orderIndex: 2,
    };

    component.addTemplateItemForm(complexItem);
    expect(component.templateItems).toHaveSize(2);
    expect(component.getStepsArray(1)).toHaveSize(2);
    expect(component.isRoleSelectedForItem(1, 'BARMAN')).toBeTrue();
  });

  it('should save template with mapped procedural steps and assigned roles', () => {
    component.openCreateTemplateModal();
    component.templateForm.patchValue({
      title: 'Opening Routine With Steps',
      category: 'OPENING',
    });
    component.templateItems.at(0).patchValue({
      title: 'Check Refrigeration',
      assignedRoles: ['BARMAN'],
      assignedUserIds: [10],
    });
    component.addStepToItem(0);
    component.getStepsArray(0).at(0).patchValue({
      title: 'Verify Thermometer',
      description: 'Must read between 2-4 C',
    });

    component.saveTemplate();
    expect(mockChecklistService.createTemplate).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Opening Routine With Steps',
        items: jasmine.arrayContaining([
          jasmine.objectContaining({
            title: 'Check Refrigeration',
            stepsJson: jasmine.stringContaining('Verify Thermometer'),
          }),
        ]),
      })
    );
  });
});
