import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { of, Subject } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ChecklistsComponent } from '../../../app/features/checklists/checklists.component';
import { ChecklistService } from '../../../app/core/services/checklist.service';
import { AuthService } from '../../../app/core/services/auth.service';
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
    } as any);

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
    component.startRun(sampleTemplate);
    expect(mockChecklistService.startRun).toHaveBeenCalledWith({ templateId: 1 });
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
});
