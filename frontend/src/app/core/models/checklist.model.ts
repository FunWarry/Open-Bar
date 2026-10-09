/**
 * Domain models and DTO interfaces for operational checklists and SOP procedures.
 */

/**
 * Operational category of a checklist procedure.
 */
export type ChecklistCategory =
  | 'OPENING'
  | 'CLOSING'
  | 'MID_SHIFT'
  | 'CLEANING_HYGIENE'
  | 'SAFETY_MAINTENANCE'
  | 'OTHER';

/**
 * Type of attached media instruction.
 */
export type ChecklistMediaType = 'NONE' | 'IMAGE' | 'VIDEO' | 'EXTERNAL_LINK';

/**
 * Lifecycle execution state of a checklist run.
 */
export type ChecklistRunStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/**
 * Structured intermediate procedural step within a checklist task.
 */
export interface ChecklistStepItem {
  stepNumber: number;
  title: string;
  description?: string;
  mediaUrl?: string;
}

/**
 * Media attachment (image, local video, or external tutorial link).
 */
export interface ChecklistMediaAttachment {
  type: ChecklistMediaType;
  url: string;
  title?: string;
}

/**
 * Discrete item or step definition within a reusable checklist template.
 */
export interface ChecklistTemplateItem {
  id?: number;
  title: string;
  description?: string;
  isMandatory: boolean;
  orderIndex: number;
  targetRole?: string;
  assignedRoles?: string[];
  assignedUserIds?: number[];
  assignedUsernames?: string[];
  mediaType: ChecklistMediaType;
  mediaUrl?: string;
  videoEmbedUrl?: string;
  mediaAttachments?: ChecklistMediaAttachment[];
  mediaAttachmentsJson?: string;
  steps?: ChecklistStepItem[];
  stepsJson?: string;
}

/**
 * Reusable SOP template defining a standard operational procedure.
 */
export interface ChecklistTemplate {
  id: number;
  title: string;
  description?: string;
  category: ChecklistCategory;
  estimatedDurationMinutes?: number;
  icon?: string;
  color?: string;
  isActive: boolean;
  items: ChecklistTemplateItem[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Concrete task item inside an active or historical checklist run.
 */
export interface ChecklistRunItem {
  id: number;
  templateItemId?: number;
  title: string;
  description?: string;
  isMandatory: boolean;
  orderIndex: number;
  targetRole?: string;
  assignedRoles?: string[];
  assignedUserIds?: number[];
  assignedUsernames?: string[];
  mediaType: ChecklistMediaType;
  mediaUrl?: string;
  videoEmbedUrl?: string;
  mediaAttachments?: ChecklistMediaAttachment[];
  mediaAttachmentsJson?: string;
  steps?: ChecklistStepItem[];
  stepsJson?: string;
  isCompleted: boolean;
  completedAt?: string;
  completedById?: number;
  completedByName?: string;
  comment?: string;
  photoProofUrl?: string;
}

/**
 * Active, completed, or cancelled checklist execution run session.
 */
export interface ChecklistRun {
  id: number;
  templateId?: number;
  templateTitle: string;
  category: ChecklistCategory;
  status: ChecklistRunStatus;
  startedAt: string;
  completedAt?: string;
  createdById?: number;
  createdByName?: string;
  completedById?: number;
  completedByName?: string;
  notes?: string;
  items: ChecklistRunItem[];
  totalItemsCount: number;
  completedItemsCount: number;
  mandatoryPendingCount: number;
  progressPercentage: number;
  completionPercentage?: number;
}

/**
 * Operational statistics overview for the checklists dashboard.
 */
export interface ChecklistStats {
  activeRunsCount: number;
  completedTodayCount: number;
  totalTemplatesCount: number;
  completionRateToday: number;
}

/**
 * Request payload to create or update a checklist template.
 */
export interface CreateChecklistTemplateRequest {
  title: string;
  description?: string;
  category: ChecklistCategory;
  estimatedDurationMinutes?: number;
  icon?: string;
  color?: string;
  items: Array<{
    title: string;
    description?: string;
    isMandatory?: boolean;
    orderIndex?: number;
    targetRole?: string;
    assignedRoles?: string[];
    assignedUserIds?: number[];
    assignedUsernames?: string[];
    mediaType?: ChecklistMediaType;
    mediaUrl?: string;
    videoEmbedUrl?: string;
    mediaAttachmentsJson?: string;
    stepsJson?: string;
  }>;
}

/**
 * Request payload to start an execution run.
 */
export interface StartChecklistRunRequest {
  templateId: number;
  notes?: string;
}

/**
 * Request payload to toggle completion of a checklist run item.
 */
export interface ToggleChecklistRunItemRequest {
  completed: boolean;
  isCompleted?: boolean;
  comment?: string;
  photoProofUrl?: string;
}

/**
 * Request payload to finalize a checklist run session.
 */
export interface CompleteChecklistRunRequest {
  notes?: string;
}

/**
 * Real-time WebSocket event received on /topic/checklists.
 */
export interface ChecklistEvent {
  eventType: 'RUN_STARTED' | 'ITEM_UPDATED' | 'RUN_COMPLETED' | 'RUN_CANCELLED' | 'TEMPLATE_UPDATED';
  runId?: number;
  run?: ChecklistRun;
  templateId?: number;
  template?: ChecklistTemplate;
  timestamp: string;
  userId?: number;
  username?: string;
}
