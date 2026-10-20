/**
 * Release channel for Over-The-Air software updates.
 */
export type UpdateChannel = 'STABLE' | 'BETA';

/**
 * Diagnostic metrics and version info for the host running OpenBar.
 */
export interface SystemVersionInfo {
  currentVersion: string;
  javaVersion: string;
  osName: string;
  uptimeSeconds: number;
  freeDiskBytes: number;
  totalDiskBytes: number;
}

/**
 * Result of release discovery lookup against GitHub.
 */
export interface SystemUpdateCheck {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  channel: UpdateChannel;
  releaseTitle?: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  isOffline: boolean;
  statusMessage?: string;
}

/**
 * Live execution progression of an active or recent OTA update.
 */
export interface SystemUpdateStatus {
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED_ROLLED_BACK' | 'ROLLING_BACK';
  step: 'IDLE' | 'PREFLIGHT' | 'DATABASE_SNAPSHOT' | 'DOCKER_PULL' | 'CONTAINER_RESTART' | 'HEALTHCHECK' | 'COMPLETED' | 'ROLLBACK' | 'FAILED';
  progressPercent: number;
  message: string;
  currentVersion: string;
  targetVersion?: string;
  channel: UpdateChannel;
  snapshotId?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  logs: string[];
}

/**
 * Pre-flight validation metrics before starting an update.
 */
export interface SystemPreFlight {
  canProceed: boolean;
  freeDiskBytes: number;
  requiredDiskBytes: number;
  hasSufficientDisk: boolean;
  occupiedTablesCount: number;
  activeOrdersCount: number;
  warnings: string[];
}

/**
 * Archived database and container rollback snapshot.
 */
export interface SystemSnapshot {
  snapshotId: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  fromVersion: string;
  targetVersion?: string;
  status: string;
}

/**
 * Request payload to initiate an Over-The-Air update.
 */
export interface SystemUpdateRequest {
  targetVersion?: string;
  channel: UpdateChannel;
}
