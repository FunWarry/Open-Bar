import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import {
  AlertController,
  IonIcon,
  IonModal,
  ToastController,
} from '@ionic/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  cameraOutline,
  calendarOutline,
  chatbubbleOutline,
  checkboxOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
  closeCircleOutline,
  closeOutline,
  cloudUploadOutline,
  createOutline,
  documentTextOutline,
  ellipseOutline,
  eyeOutline,
  filterOutline,
  imageOutline,
  linkOutline,
  listOutline,
  moonOutline,
  openOutline,
  peopleOutline,
  personOutline,
  playCircleOutline,
  playOutline,
  refreshOutline,
  restaurantOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  sunnyOutline,
  timeOutline,
  trashOutline,
  videocamOutline,
  wineOutline,
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import {
  ChecklistCategory,
  ChecklistMediaAttachment,
  ChecklistMediaType,
  ChecklistRun,
  ChecklistRunItem,
  ChecklistStepItem,
  ChecklistRunStatus,
  ChecklistTemplate,
  ChecklistTemplateItem,
  CreateChecklistTemplateRequest,
  StartChecklistRunRequest,
  ToggleChecklistRunItemRequest,
} from '../../core/models/checklist.model';
import { ChecklistService } from '../../core/services/checklist.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { SearchableSelectComponent, SearchableOption } from '../../core/components/ui/searchable-select/searchable-select.component';
import { CheckboxFieldComponent } from '../../core/components/ui/checkbox-field/checkbox-field.component';
import { InputFieldComponent } from '../../core/components/ui/input-field/input-field.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { ModalComponent } from '../../core/components/ui/modal/modal.component';
import { FilterChipComponent } from '../../core/components/ui/filter-chip/filter-chip.component';
import { environment } from '../../../environments/environment';

/** Active tabs presentation mode. */
export type ChecklistTab = 'active' | 'templates' | 'history';

/**
 * Operational Checklists & SOP Procedures Component.
 * Enables staff to launch, execute, audit, and manage standard operating procedures (Opening, Closing, Hygiene HACCP).
 * Supports media guides (images and videos) and provides real-time STOMP synchronization and audit trail.
 */
@Component({
  selector: 'app-checklists',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonIcon,
    IonModal,
    TranslocoPipe,
    EmptyStateComponent,
    SearchableSelectComponent,
    CheckboxFieldComponent,
    InputFieldComponent,
    ActionButtonComponent,
    ModalComponent,
    FilterChipComponent,
  ],
  templateUrl: './checklists.component.html',
  styleUrls: ['./checklists.component.scss'],
})
export class ChecklistsComponent implements OnInit, OnDestroy {
  private readonly checklistService = inject(ChecklistService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('modalCameraVideo') modalCameraVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('fallbackFileInput') fallbackFileInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('proofFileInput') proofFileInputRef?: ElementRef<HTMLInputElement>;
  private cameraStream: MediaStream | null = null;

  /** Observation and proof photo modal state. */
  readonly commentModalState = signal<{
    isOpen: boolean;
    item: ChecklistRunItem | null;
    comment: string;
    photoProofUrl?: string;
    isUploadingPhoto: boolean;
    isCameraLive: boolean;
    isStartingCamera: boolean;
  }>({
    isOpen: false,
    item: null,
    comment: '',
    photoProofUrl: undefined,
    isUploadingPhoto: false,
    isCameraLive: false,
    isStartingCamera: false,
  });

  /** Current active navigation tab. */
  readonly currentTab = signal<ChecklistTab>('active');

  /** All staff users for task attribution. */
  readonly allUsers = signal<User[]>([]);

  /** Expanded task IDs for drilldown details in the active execution tab. */
  readonly expandedTaskIds = signal<Set<number>>(new Set());

  /** Operational category select options for template builder. */
  readonly categoryOptions = computed<SearchableOption<ChecklistCategory>[]>(() => [
    { value: 'OPENING', label: this.transloco.translate('CHECKLISTS.CATEGORIES.OPENING'), icon: 'sunny-outline' },
    { value: 'CLOSING', label: this.transloco.translate('CHECKLISTS.CATEGORIES.CLOSING'), icon: 'moon-outline' },
    { value: 'MID_SHIFT', label: this.transloco.translate('CHECKLISTS.CATEGORIES.MID_SHIFT'), icon: 'sparkles-outline' },
    { value: 'CLEANING_HYGIENE', label: this.transloco.translate('CHECKLISTS.CATEGORIES.CLEANING_HYGIENE'), icon: 'shield-checkmark-outline' },
    { value: 'SAFETY_MAINTENANCE', label: this.transloco.translate('CHECKLISTS.CATEGORIES.SAFETY_MAINTENANCE'), icon: 'alert-circle-outline' },
    { value: 'OTHER', label: this.transloco.translate('CHECKLISTS.CATEGORIES.OTHER'), icon: 'list-outline' },
  ]);

  /** Target staff role select options for template task builder. */
  readonly roleOptions = computed<SearchableOption<string>[]>(() => [
    { value: 'ALL', label: this.transloco.translate('CHECKLISTS.ROLES.ALL'), icon: 'person-outline' },
    { value: 'BARMAN', label: this.transloco.translate('CHECKLISTS.ROLES.BARMAN'), icon: 'person-outline' },
    { value: 'SERVEUR', label: this.transloco.translate('CHECKLISTS.ROLES.SERVEUR'), icon: 'person-outline' },
    { value: 'MANAGER', label: this.transloco.translate('CHECKLISTS.ROLES.MANAGER'), icon: 'shield-checkmark-outline' },
  ]);

  /** Media guide type options for template task builder. */
  readonly mediaTypeOptions = computed<SearchableOption<ChecklistMediaType>[]>(() => [
    { value: 'NONE', label: this.transloco.translate('CHECKLISTS.MEDIA_TYPES.NONE'), icon: 'ellipse-outline' },
    { value: 'IMAGE', label: this.transloco.translate('CHECKLISTS.MEDIA_TYPES.IMAGE'), icon: 'image-outline' },
    { value: 'VIDEO', label: this.transloco.translate('CHECKLISTS.MEDIA_TYPES.VIDEO'), icon: 'videocam-outline' },
    { value: 'EXTERNAL_LINK', label: this.transloco.translate('CHECKLISTS.MEDIA_TYPES.EXTERNAL_LINK'), icon: 'link-outline' },
  ]);

  /** Predefined operational roles available for multi-assignment in template builder. */
  readonly availableBuilderRoles = ['BARMAN', 'SERVEUR', 'CUISINIER', 'MANAGER', 'HYGIENE'] as const;

  /** Staff user options for nominative task assignment in the builder. */
  readonly staffUserOptions = computed<SearchableOption<number>[]>(() =>
    this.allUsers().map(u => {
      const name = [u.prenom, u.nom].filter(Boolean).join(' ') || u.username;
      const role = u.roles && u.roles.length > 0 ? u.roles.join(', ') : 'STAFF';
      return {
        value: u.id,
        label: `${name} (${role})`,
        icon: 'person-outline',
      };
    })
  );

  /** Loading state for media uploads in template builder. */
  readonly uploadingMediaState = signal<{ itemIndex: number; type: 'IMAGE' | 'VIDEO' } | null>(null);

  /** Filter applied to templates or history category. */
  readonly selectedCategory = signal<ChecklistCategory | 'ALL'>('ALL');

  /** Filter applied to execution run status in history tab. */
  readonly selectedStatus = signal<ChecklistRunStatus | 'ALL'>('ALL');

  /** Currently selected run for the active inspector pane. */
  readonly selectedRun = signal<ChecklistRun | null>(null);

  /** Expanded run ID in the history audit trail. */
  readonly expandedHistoryRunId = signal<number | null>(null);

  /** Template creation / edition modal visibility. */
  readonly isTemplateModalOpen = signal<boolean>(false);

  /** Media viewer modal state. */
  readonly mediaModalState = signal<{
    isOpen: boolean;
    title: string;
    mediaType: ChecklistMediaType;
    url: string;
  }>({
    isOpen: false,
    title: '',
    mediaType: 'NONE',
    url: '',
  });

  /** Loading indicator. */
  readonly isLoading = computed(() => this.checklistService.isLoading());

  /** Dashboard KPI stats. */
  readonly stats = computed(() => this.checklistService.stats());

  /** Reactive list of templates. */
  readonly templates = computed(() => this.checklistService.templates());

  /** Reactive list of execution runs. */
  readonly runs = computed(() => this.checklistService.runs());

  /** Filtered active in-progress runs. */
  readonly activeRuns = computed(() => {
    const list = this.checklistService.activeRuns();
    const cat = this.selectedCategory();
    if (cat === 'ALL') return list;
    return list.filter(r => r.category === cat);
  });

  /** Filtered templates catalog. */
  readonly filteredTemplates = computed(() => {
    const list = this.templates();
    const cat = this.selectedCategory();
    if (cat === 'ALL') return list;
    return list.filter(t => t.category === cat);
  });

  /** Filtered history runs. */
  readonly filteredHistoryRuns = computed(() => {
    const list = this.runs().filter(r => r.status !== 'IN_PROGRESS');
    const cat = this.selectedCategory();
    const stat = this.selectedStatus();
    return list.filter(r => {
      const matchCat = cat === 'ALL' || r.category === cat;
      const matchStat = stat === 'ALL' || r.status === stat;
      return matchCat && matchStat;
    });
  });

  /** Current logged-in user profile. */
  readonly currentUser = computed(() => this.authService.getStoredUser());

  /** Whether the user has manager or admin rights to manage templates. */
  readonly canManageTemplates = computed(() => {
    const user = this.currentUser();
    if (!user?.roles) return false;
    return user.roles.includes('ADMIN') || user.roles.includes('MANAGER');
  });

  /** Reactive form for template creation and modification. */
  templateForm!: FormGroup;

  /** Editing template ID if in update mode. */
  editingTemplateId: number | null = null;

  constructor() {
    addIcons({
      addOutline,
      alertCircleOutline,
      cameraOutline,
      calendarOutline,
      chatbubbleOutline,
      checkboxOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      chevronBackOutline,
      chevronDownOutline,
      chevronForwardOutline,
      chevronUpOutline,
      closeCircleOutline,
      closeOutline,
      cloudUploadOutline,
      createOutline,
      documentTextOutline,
      ellipseOutline,
      eyeOutline,
      filterOutline,
      imageOutline,
      linkOutline,
      listOutline,
      moonOutline,
      openOutline,
      peopleOutline,
      personOutline,
      playCircleOutline,
      playOutline,
      refreshOutline,
      restaurantOutline,
      shieldCheckmarkOutline,
      sparklesOutline,
      sunnyOutline,
      timeOutline,
      trashOutline,
      videocamOutline,
      wineOutline,
    });
    this.initTemplateForm();
  }

  ngOnInit(): void {
    this.loadData();
    this.loadUsers();

    // Listen to real-time events to update selectedRun and view
    this.checklistService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        const activeId = this.selectedRun()?.id;
        if (activeId !== undefined && event.run?.id === activeId) {
          this.selectedRun.set(event.run ?? null);
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all active staff users from backend for procedure assignment.
   */
  private loadUsers(): void {
    this.userService
      .getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: users => this.allUsers.set(users || []),
        error: err => console.warn('[Checklists] Could not load staff users', err),
      });
  }

  /**
   * Refreshes all checklist templates, runs, and dashboard stats.
   */
  loadData(): void {
    this.checklistService.loadStats().subscribe();
    this.checklistService.loadTemplates().subscribe();
    this.checklistService.loadRuns().subscribe({
      next: runs => {
        // Automatically select the first active run if none is selected
        const active = runs.filter(r => r.status === 'IN_PROGRESS');
        if (active.length > 0 && !this.selectedRun()) {
          this.selectedRun.set(active[0]);
        }
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Switches the active navigation tab.
   *
   * @param tab Target tab identifier
   */
  switchTab(tab: ChecklistTab): void {
    this.currentTab.set(tab);
    if (tab === 'active' && !this.selectedRun()) {
      const active = this.activeRuns();
      if (active.length > 0) {
        this.selectedRun.set(active[0]);
      }
    }
  }

  /**
   * Selects an active execution run to view and interact with in the detail pane.
   *
   * @param run Run entity
   */
  selectRun(run: ChecklistRun): void {
    this.selectedRun.set(run);
    this.currentTab.set('active');
  }

  /**
   * Launches a new checklist run session from a template.
   *
   * @param template Template definition
   */
  startRun(template: ChecklistTemplate): void {
    const req: StartChecklistRunRequest = {
      templateId: template.id,
    };

    this.checklistService.startRun(req).subscribe({
      next: run => {
        this.selectedRun.set(run);
        this.currentTab.set('active');
        void this.showToast(this.transloco.translate('CHECKLISTS.ALERTS.RUN_COMPLETED_SUCCESS'));
      },
      error: () => {
        void this.showToast(this.transloco.translate('COMMON.ERROR'));
      },
    });
  }

  /**
   * Toggles task detail expansion in the active execution view.
   *
   * @param taskId Task identifier
   */
  toggleTaskExpand(taskId: number): void {
    this.expandedTaskIds.update(current => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  /**
   * Checks whether a task item's details are currently expanded.
   *
   * @param taskId Task identifier
   * @returns True if expanded
   */
  isTaskExpanded(taskId: number): boolean {
    return this.expandedTaskIds().has(taskId);
  }

  /**
   * Helper extracting list of media attachments for a task item.
   *
   * @param item Target task item
   * @returns List of media attachments
   */
  getItemMediaList(item: ChecklistRunItem): ChecklistMediaAttachment[] {
    if (item.mediaAttachments && item.mediaAttachments.length > 0) {
      return item.mediaAttachments;
    }
    if (item.mediaAttachmentsJson) {
      try {
        return JSON.parse(item.mediaAttachmentsJson);
      } catch {
        // ignore
      }
    }
    const fallback: ChecklistMediaAttachment[] = [];
    if (item.mediaType === 'IMAGE' && item.mediaUrl) {
      fallback.push({ type: 'IMAGE', url: item.mediaUrl, title: item.title });
    } else if (item.mediaType === 'VIDEO' && (item.videoEmbedUrl || item.mediaUrl)) {
      fallback.push({ type: 'VIDEO', url: item.videoEmbedUrl || item.mediaUrl!, title: item.title });
    } else if (item.mediaType === 'EXTERNAL_LINK' && item.videoEmbedUrl) {
      fallback.push({ type: 'EXTERNAL_LINK', url: item.videoEmbedUrl, title: item.title });
    }
    return fallback;
  }

  /**
   * Helper extracting list of procedural steps for a task item.
   *
   * @param item Target task item
   * @returns List of step items
   */
  getItemStepsList(item: ChecklistRunItem): ChecklistStepItem[] {
    if (item.steps && item.steps.length > 0) {
      return item.steps;
    }
    if (item.stepsJson) {
      try {
        return JSON.parse(item.stepsJson);
      } catch {
        // ignore
      }
    }
    return [];
  }

  /**
   * Detects whether a media URL is a directly playable local or direct video file.
   *
   * @param url Media URL
   * @returns True if direct playable video
   */
  isVideoUrlDirect(url?: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.ogg') ||
      url.includes('/api/checklists/media') ||
      url.startsWith('blob:')
    );
  }

  /**
   * Toggles completion status of a checklist run task item.
   *
   * @param item Target task item
   */
  toggleItem(item: ChecklistRunItem): void {
    const run = this.selectedRun();
    if (run?.status !== 'IN_PROGRESS') return;

    const newCompleted = !item.isCompleted;
    const req: ToggleChecklistRunItemRequest = {
      completed: newCompleted,
      isCompleted: newCompleted,
      comment: item.comment,
      photoProofUrl: item.photoProofUrl,
    };

    this.checklistService.toggleRunItem(run.id, item.id, req).subscribe({
      next: updatedRun => {
        this.selectedRun.set(updatedRun);
        this.cdr.markForCheck();
      },
      error: () => {
        void this.showToast(this.transloco.translate('COMMON.ERROR'));
      },
    });
  }

  /**
   * Opens the sleek observation / comment modal for a task item.
   *
   * @param item Target task item
   */
  openCommentModal(item: ChecklistRunItem): void {
    this.commentModalState.set({
      isOpen: true,
      item,
      comment: item.comment || '',
      photoProofUrl: item.photoProofUrl || undefined,
      isUploadingPhoto: false,
      isCameraLive: false,
      isStartingCamera: false,
    });
  }

  /**
   * Closes the observation / comment modal and ensures camera stream is stopped.
   */
  closeCommentModal(): void {
    this.stopInModalCamera();
    this.commentModalState.set({
      isOpen: false,
      item: null,
      comment: '',
      photoProofUrl: undefined,
      isUploadingPhoto: false,
      isCameraLive: false,
      isStartingCamera: false,
    });
  }

  /**
   * Updates current comment text in modal state.
   *
   * @param text New comment string
   */
  updateCommentModalText(text: string): void {
    this.commentModalState.update(s => ({ ...s, comment: text }));
  }

  /**
   * Removes current proof photo attached to the modal.
   */
  removeCommentModalPhoto(): void {
    this.commentModalState.update(s => ({ ...s, photoProofUrl: undefined }));
  }

  /**
   * Resolves a media or image URL to a fully qualified URL if it starts with /uploads/.
   *
   * @param url Relative or absolute image URL
   * @returns Fully qualified or untouched URL
   */
  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${baseUrl}${url}`;
    }
    return url;
  }

  /**
   * Attaches active camera stream to the video DOM element and initiates playback.
   */
  private attachCameraStream(): boolean {
    if (!this.cameraStream) return false;

    const videoEl: HTMLVideoElement | null =
      this.modalCameraVideoRef?.nativeElement ||
      (document.getElementById('modal-camera-video') as HTMLVideoElement | null) ||
      document.querySelector('video.camera-video-feed');

    if (videoEl) {
      videoEl.muted = true;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      if (videoEl.srcObject !== this.cameraStream) {
        videoEl.srcObject = this.cameraStream;
      }
      void videoEl.play().catch(err => {
        console.warn('[Checklists] Video playback warning:', err);
      });
      return true;
    }
    return false;
  }

  /**
   * Triggered when video metadata has loaded to guarantee playback.
   *
   * @param event Video loadedmetadata event
   */
  onCameraVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    if (video) {
      video.muted = true;
      video.playsInline = true;
      void video.play().catch(err => console.warn('[Checklists] play error on metadata load', err));
    }
  }

  /**
   * Starts device camera video stream directly inside the observation modal.
   */
  async startInModalCamera(): Promise<void> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia unsupported');
      }
      this.commentModalState.update(s => ({ ...s, isCameraLive: true, isStartingCamera: true }));
      this.cdr.detectChanges();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      }).catch(() =>
        navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      );

      this.cameraStream = stream;
      this.commentModalState.update(s => ({ ...s, isStartingCamera: false }));
      this.cdr.detectChanges();

      const tryAttach = (attempts: number) => {
        if (this.attachCameraStream() || attempts <= 0) return;
        setTimeout(() => tryAttach(attempts - 1), 60);
      };
      tryAttach(5);
    } catch (err) {
      console.warn('[Checklists] Camera access failed', err);
      this.stopInModalCamera();
      void this.showToast(this.transloco.translate('CHECKLISTS.ALERTS.CAMERA_NOT_ACCESSIBLE'));
      this.fallbackFileInputRef?.nativeElement?.click();
    }
  }

  /**
   * Stops active camera video stream inside the observation modal.
   */
  stopInModalCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.commentModalState.update(s => ({ ...s, isCameraLive: false, isStartingCamera: false }));
    this.cdr.markForCheck();
  }

  /**
   * Programmatically triggers the hidden file input for photo/video upload in comment modal.
   */
  triggerProofFileInput(): void {
    if (this.proofFileInputRef?.nativeElement) {
      this.proofFileInputRef.nativeElement.click();
    } else {
      const el = document.getElementById('proof-photo-file-input') as HTMLInputElement | null;
      el?.click();
    }
  }

  /**
   * Captures the current camera video frame, uploads it, and stores the resulting photo proof URL.
   */
  captureInModalPhoto(): void {
    const video: HTMLVideoElement | null =
      this.modalCameraVideoRef?.nativeElement ||
      (document.getElementById('modal-camera-video') as HTMLVideoElement | null) ||
      document.querySelector('video.camera-video-feed');

    if (!video) return;

    this.commentModalState.update(s => ({ ...s, isUploadingPhoto: true }));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.commentModalState.update(s => ({ ...s, isUploadingPhoto: false }));
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) {
        this.commentModalState.update(s => ({ ...s, isUploadingPhoto: false }));
        return;
      }
      const file = new File([blob], `proof_${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.stopInModalCamera();
      this.uploadProofPhoto(file);
    }, 'image/jpeg', 0.92);
  }

  /**
   * Handles user photo selection from file picker when chosen from gallery or fallback.
   *
   * @param event Input change event
   */
  onCommentModalPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.uploadProofPhoto(file);
    input.value = '';
  }

  /**
   * Uploads a photo proof file and stores the returned URL in modal state.
   *
   * @param file Image file to upload
   */
  private uploadProofPhoto(file: File): void {
    this.commentModalState.update(s => ({ ...s, isUploadingPhoto: true }));

    this.checklistService.uploadMedia(file).subscribe({
      next: res => {
        this.commentModalState.update(s => ({
          ...s,
          photoProofUrl: res.url,
          isUploadingPhoto: false,
        }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.commentModalState.update(s => ({ ...s, isUploadingPhoto: false }));
        void this.showToast(this.transloco.translate('COMMON.ERROR'));
      },
    });
  }

  /**
   * Saves task comment and proof photo in a single operation.
   */
  saveItemComment(): void {
    const state = this.commentModalState();
    const run = this.selectedRun();
    if (!state.item || !run) return;

    const req: ToggleChecklistRunItemRequest = {
      completed: state.item.isCompleted,
      isCompleted: state.item.isCompleted,
      comment: state.comment.trim(),
      photoProofUrl: state.photoProofUrl || '',
    };

    this.checklistService.toggleRunItem(run.id, state.item.id, req).subscribe({
      next: updatedRun => {
        this.selectedRun.set(updatedRun);
        this.closeCommentModal();
        this.cdr.markForCheck();
        void this.showToast(this.transloco.translate('COMMON.SUCCESS'));
      },
      error: () => {
        void this.showToast(this.transloco.translate('COMMON.ERROR'));
      },
    });
  }

  /**
   * Finalizes and completes the currently selected checklist run session.
   */
  async confirmCompleteRun(): Promise<void> {
    const run = this.selectedRun();
    if (!run) return;

    if (run.mandatoryPendingCount > 0) {
      const warningAlert = await this.alertCtrl.create({
        header: this.transloco.translate('CHECKLISTS.ACTIONS.COMPLETE_RUN'),
        message: this.transloco.translate('CHECKLISTS.ALERTS.MANDATORY_TASKS_LEFT'),
        buttons: [this.transloco.translate('COMMON.CLOSE')],
      });
      await warningAlert.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: this.transloco.translate('CHECKLISTS.ALERTS.CONFIRM_COMPLETE_TITLE'),
      message: this.transloco.translate('CHECKLISTS.ALERTS.CONFIRM_COMPLETE_MESSAGE'),
      inputs: [
        {
          name: 'notes',
          type: 'textarea',
          placeholder: this.transloco.translate('CHECKLISTS.LABELS.EXECUTION_NOTES_PLACEHOLDER'),
        },
      ],
      buttons: [
        { text: this.transloco.translate('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.transloco.translate('CHECKLISTS.ACTIONS.SUBMIT_COMPLETION'),
          handler: data => {
            this.checklistService.completeRun(run.id, { notes: data.notes }).subscribe({
              next: () => {
                void this.showToast(this.transloco.translate('CHECKLISTS.ALERTS.RUN_COMPLETED_SUCCESS'));
                this.cdr.markForCheck();
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Cancels the currently selected run session.
   */
  async confirmCancelRun(): Promise<void> {
    const run = this.selectedRun();
    if (!run) return;

    const alert = await this.alertCtrl.create({
      header: this.transloco.translate('CHECKLISTS.ALERTS.CONFIRM_CANCEL_TITLE'),
      message: this.transloco.translate('CHECKLISTS.ALERTS.CONFIRM_CANCEL_MESSAGE'),
      buttons: [
        { text: this.transloco.translate('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.transloco.translate('CHECKLISTS.ACTIONS.CANCEL_RUN'),
          role: 'destructive',
          handler: () => {
            this.checklistService.cancelRun(run.id).subscribe({
              next: () => {
                void this.showToast(this.transloco.translate('CHECKLISTS.ALERTS.RUN_CANCELLED_SUCCESS'));
                this.cdr.markForCheck();
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Opens the media preview modal for a task guide photo or video.
   *
   * @param title Task or guide title
   * @param mediaType Attached media type
   * @param url Media URL
   */
  openMediaViewer(title: string, mediaType: ChecklistMediaType, url?: string): void {
    if (!url) return;
    this.mediaModalState.set({
      isOpen: true,
      title,
      mediaType,
      url,
    });
    this.cdr.markForCheck();
  }

  /** Closes the media preview modal. */
  closeMediaViewer(): void {
    this.mediaModalState.update(s => ({ ...s, isOpen: false }));
    this.cdr.markForCheck();
  }

  /**
   * Toggles expanded item audit log for a run in the history tab.
   *
   * @param runId Target run ID
   */
  toggleHistoryAudit(runId: number): void {
    this.expandedHistoryRunId.update(current => (current === runId ? null : runId));
  }

  // ==========================================
  // Template Creation & Management Logic
  // ==========================================

  get templateItems(): FormArray {
    return this.templateForm.get('items') as FormArray;
  }

  private initTemplateForm(): void {
    this.templateForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      description: [''],
      category: ['OPENING' as ChecklistCategory, Validators.required],
      estimatedDurationMinutes: [15, [Validators.min(1), Validators.max(240)]],
      icon: ['checkbox-outline'],
      color: ['var(--primary)'],
      items: this.fb.array([]),
    });
  }

  /** Opens modal to create a brand new template. */
  openCreateTemplateModal(): void {
    this.editingTemplateId = null;
    this.templateForm.reset({
      title: '',
      description: '',
      category: 'OPENING',
      estimatedDurationMinutes: 15,
      icon: 'checkbox-outline',
      color: 'var(--primary)',
    });
    this.templateItems.clear();
    this.addTemplateItemForm(); // Add at least one default task
    this.isTemplateModalOpen.set(true);
  }

  /**
   * Opens modal to edit an existing template.
   *
   * @param template Template to edit
   */
  openEditTemplateModal(template: ChecklistTemplate): void {
    this.editingTemplateId = template.id;
    this.templateForm.patchValue({
      title: template.title,
      description: template.description || '',
      category: template.category,
      estimatedDurationMinutes: template.estimatedDurationMinutes || 15,
      icon: template.icon || 'checkbox-outline',
      color: template.color || 'var(--primary)',
    });
    this.templateItems.clear();
    for (const it of template.items) {
      this.addTemplateItemForm(it);
    }
    this.isTemplateModalOpen.set(true);
  }

  /** Closes template creator modal. */
  closeTemplateModal(): void {
    this.isTemplateModalOpen.set(false);
  }

  /**
   * Appends an item form group to the template items form array with multi-role, user assignment, and sub-steps.
   *
   * @param item Optional initial item values
   */
  addTemplateItemForm(item?: ChecklistTemplateItem): void {
    let initialRoles: string[] = [];
    if (item?.assignedRoles && item.assignedRoles.length > 0) {
      initialRoles = [...item.assignedRoles];
    } else if (item?.targetRole && item.targetRole !== 'ALL') {
      initialRoles = [item.targetRole];
    }

    let initialSteps: ChecklistStepItem[] = [];
    if (item?.steps && item.steps.length > 0) {
      initialSteps = item.steps;
    } else if (item?.stepsJson) {
      try {
        initialSteps = JSON.parse(item.stepsJson);
      } catch {
        initialSteps = [];
      }
    }

    const stepsArray = this.fb.array(
      initialSteps.map((s, idx) =>
        this.fb.group({
          stepNumber: [s.stepNumber || idx + 1],
          title: [s.title || '', [Validators.required, Validators.maxLength(150)]],
          description: [s.description || ''],
          mediaUrl: [s.mediaUrl || ''],
        })
      )
    );

    const itemGroup = this.fb.group({
      title: [item?.title || '', [Validators.required, Validators.maxLength(200)]],
      description: [item?.description || ''],
      isMandatory: [item ? item.isMandatory : true],
      orderIndex: [item?.orderIndex || this.templateItems.length + 1],
      targetRole: [item?.targetRole || 'ALL'],
      assignedRoles: [initialRoles],
      assignedUserIds: [item?.assignedUserIds || []],
      mediaType: [item?.mediaType || ('NONE' as ChecklistMediaType)],
      mediaUrl: [item?.mediaUrl || ''],
      videoEmbedUrl: [item?.videoEmbedUrl || ''],
      steps: stepsArray,
    });
    this.templateItems.push(itemGroup);
  }

  /**
   * Removes an item from the template builder.
   *
   * @param index Item index
   */
  removeTemplateItemForm(index: number): void {
    if (this.templateItems.length > 1) {
      this.templateItems.removeAt(index);
    }
  }

  /**
   * Checks whether a role is assigned to a template item.
   *
   * @param itemIndex Item index in form array
   * @param role Role identifier
   * @returns True if assigned
   */
  isRoleSelectedForItem(itemIndex: number, role: string): boolean {
    const itemGroup = this.templateItems.at(itemIndex);
    const roles: string[] = itemGroup.get('assignedRoles')?.value || [];
    return roles.includes(role);
  }

  /**
   * Toggles role assignment for a template item.
   *
   * @param itemIndex Item index in form array
   * @param role Role identifier
   */
  toggleRoleForItem(itemIndex: number, role: string): void {
    const itemGroup = this.templateItems.at(itemIndex);
    const currentRoles: string[] = itemGroup.get('assignedRoles')?.value || [];
    let updated: string[];
    if (currentRoles.includes(role)) {
      updated = currentRoles.filter(r => r !== role);
    } else {
      updated = [...currentRoles, role];
    }
    itemGroup.patchValue({ assignedRoles: updated });
    if (updated.length > 0) {
      itemGroup.patchValue({ targetRole: updated[0] });
    } else {
      itemGroup.patchValue({ targetRole: 'ALL' });
    }
  }

  /**
   * Assigns a specific staff user to a template item.
   *
   * @param itemIndex Item index
   * @param option Selected user option
   */
  assignUserToItem(itemIndex: number, option: SearchableOption<number> | null): void {
    if (!option?.value) return;
    const itemGroup = this.templateItems.at(itemIndex);
    const currentUsers: number[] = itemGroup.get('assignedUserIds')?.value || [];
    if (!currentUsers.includes(option.value)) {
      itemGroup.patchValue({ assignedUserIds: [...currentUsers, option.value] });
    }
  }

  /**
   * Removes an assigned staff user from a template item.
   *
   * @param itemIndex Item index
   * @param userId User identifier to unassign
   */
  removeAssignedUserFromItem(itemIndex: number, userId: number): void {
    const itemGroup = this.templateItems.at(itemIndex);
    const currentUsers: number[] = itemGroup.get('assignedUserIds')?.value || [];
    itemGroup.patchValue({
      assignedUserIds: currentUsers.filter(id => id !== userId),
    });
  }

  /**
   * Resolves User entities for assigned user IDs of an item.
   *
   * @param itemIndex Item index
   * @returns List of User objects
   */
  getAssignedUsersList(itemIndex: number): User[] {
    const itemGroup = this.templateItems.at(itemIndex);
    const userIds: number[] = itemGroup?.get('assignedUserIds')?.value || [];
    if (userIds.length === 0) return [];
    const all = this.allUsers();
    return all.filter(u => userIds.includes(u.id));
  }

  /**
   * Programmatically opens a file input.
   *
   * @param inputId Input element ID
   */
  triggerItemFileInput(inputId: string): void {
    const el = document.getElementById(inputId) as HTMLInputElement | null;
    el?.click();
  }

  /**
   * Handles photo media upload inside the template builder.
   *
   * @param event File input event
   * @param index Item index
   */
  onTemplateMediaSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      this.uploadingMediaState.set({ itemIndex: index, type: 'IMAGE' });
      this.checklistService.uploadMedia(file).subscribe({
        next: res => {
          const itemGroup = this.templateItems.at(index);
          itemGroup.patchValue({
            mediaUrl: res.url,
            mediaType: 'IMAGE',
          });
          this.uploadingMediaState.set(null);
          void this.showToast(this.transloco.translate('COMMON.SUCCESS'));
        },
        error: () => {
          this.uploadingMediaState.set(null);
          void this.showToast(this.transloco.translate('COMMON.ERROR'));
        },
      });
      input.value = '';
    }
  }

  /**
   * Handles local video selection and upload for a template task item.
   *
   * @param event File input change event
   * @param index Item index
   */
  onTemplateVideoSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      this.uploadingMediaState.set({ itemIndex: index, type: 'VIDEO' });
      this.checklistService.uploadMedia(file).subscribe({
        next: res => {
          const itemGroup = this.templateItems.at(index);
          itemGroup.patchValue({
            mediaUrl: res.url,
            mediaType: 'VIDEO',
            videoEmbedUrl: res.url,
          });
          this.uploadingMediaState.set(null);
          void this.showToast(this.transloco.translate('COMMON.SUCCESS'));
        },
        error: () => {
          this.uploadingMediaState.set(null);
          void this.showToast(this.transloco.translate('COMMON.ERROR'));
        },
      });
      input.value = '';
    }
  }

  /**
   * Removes media attachment from a template task item.
   *
   * @param index Item index
   */
  removeTemplateItemMedia(index: number): void {
    const itemGroup = this.templateItems.at(index);
    itemGroup.patchValue({
      mediaUrl: '',
      videoEmbedUrl: '',
    });
  }

  /**
   * Retrieves the FormArray of detailed procedural steps for an item.
   *
   * @param itemIndex Item index
   * @returns Steps FormArray
   */
  getStepsArray(itemIndex: number): FormArray {
    return this.templateItems.at(itemIndex).get('steps') as FormArray;
  }

  /**
   * Adds an operational step to a template item.
   *
   * @param itemIndex Item index
   */
  addStepToItem(itemIndex: number): void {
    const steps = this.getStepsArray(itemIndex);
    const stepNumber = steps.length + 1;
    steps.push(
      this.fb.group({
        stepNumber: [stepNumber],
        title: ['', [Validators.required, Validators.maxLength(150)]],
        description: [''],
        mediaUrl: [''],
      })
    );
  }

  /**
   * Removes an operational step from a template item.
   *
   * @param itemIndex Item index
   * @param stepIndex Step index
   */
  removeStepFromItem(itemIndex: number, stepIndex: number): void {
    const steps = this.getStepsArray(itemIndex);
    steps.removeAt(stepIndex);
    steps.controls.forEach((ctrl, idx) => {
      ctrl.patchValue({ stepNumber: idx + 1 });
    });
  }

  /**
   * Uploads an illustrative photo for a detailed step.
   *
   * @param event Input change event
   * @param itemIndex Item index
   * @param stepIndex Step index
   */
  onStepPhotoSelected(event: Event, itemIndex: number, stepIndex: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      this.checklistService.uploadMedia(file).subscribe({
        next: res => {
          const stepGroup = this.getStepsArray(itemIndex).at(stepIndex);
          stepGroup.patchValue({ mediaUrl: res.url });
          void this.showToast(this.transloco.translate('COMMON.SUCCESS'));
        },
        error: () => {
          void this.showToast(this.transloco.translate('COMMON.ERROR'));
        },
      });
      input.value = '';
    }
  }

  /**
   * Removes illustration photo from an operational step.
   *
   * @param itemIndex Item index
   * @param stepIndex Step index
   */
  removeStepPhoto(itemIndex: number, stepIndex: number): void {
    const stepGroup = this.getStepsArray(itemIndex).at(stepIndex);
    stepGroup.patchValue({ mediaUrl: '' });
  }

  /**
   * Saves or updates the template.
   */
  saveTemplate(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    const formVal = this.templateForm.value;
    const req: CreateChecklistTemplateRequest = {
      title: formVal.title,
      description: formVal.description,
      category: formVal.category,
      estimatedDurationMinutes: formVal.estimatedDurationMinutes,
      icon: formVal.icon,
      color: formVal.color,
      items: formVal.items.map((it: any, idx: number) => {
        const assignedRoles: string[] = it.assignedRoles || [];
        const assignedUserIds: number[] = it.assignedUserIds || [];
        const rawSteps: any[] = it.steps || [];
        const steps: ChecklistStepItem[] = rawSteps
          .filter(s => Boolean(s?.title?.trim()))
          .map((s, sIdx) => ({
            stepNumber: sIdx + 1,
            title: s.title.trim(),
            description: s.description ? s.description.trim() : undefined,
            mediaUrl: s.mediaUrl ? s.mediaUrl.trim() : undefined,
          }));

        let resolvedTargetRole: string | undefined;
        if (assignedRoles.length > 0) {
          resolvedTargetRole = assignedRoles[0];
        } else if (it.targetRole && it.targetRole !== 'ALL') {
          resolvedTargetRole = it.targetRole;
        }

        return {
          title: it.title,
          description: it.description,
          isMandatory: Boolean(it.isMandatory),
          orderIndex: idx + 1,
          targetRole: resolvedTargetRole,
          assignedRoles: assignedRoles.length > 0 ? assignedRoles : undefined,
          assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : undefined,
          mediaType: it.mediaType || 'NONE',
          mediaUrl: it.mediaUrl || undefined,
          videoEmbedUrl: it.videoEmbedUrl || undefined,
          stepsJson: steps.length > 0 ? JSON.stringify(steps) : undefined,
        };
      }),
    };

    if (this.editingTemplateId) {
      this.checklistService.updateTemplate(this.editingTemplateId, req).subscribe({
        next: () => {
          void this.showToast(this.transloco.translate('CHECKLISTS.ALERTS.TEMPLATE_SAVED_SUCCESS'));
          this.closeTemplateModal();
        },
      });
    } else {
      this.checklistService.createTemplate(req).subscribe({
        next: () => {
          void this.showToast(this.transloco.translate('CHECKLISTS.ALERTS.TEMPLATE_SAVED_SUCCESS'));
          this.closeTemplateModal();
        },
      });
    }
  }

  /**
   * Prompts and deletes an existing template.
   *
   * @param template Template to delete
   */
  async confirmDeleteTemplate(template: ChecklistTemplate): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.transloco.translate('COMMON.CONFIRM'),
      message: `${this.transloco.translate('COMMON.DELETE')} "${template.title}" ?`,
      buttons: [
        { text: this.transloco.translate('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.transloco.translate('COMMON.DELETE'),
          role: 'destructive',
          handler: () => {
            this.checklistService.deleteTemplate(template.id).subscribe({
              next: () => {
                void this.showToast(this.transloco.translate('COMMON.SUCCESS'));
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
    });
    await toast.present();
  }
}
