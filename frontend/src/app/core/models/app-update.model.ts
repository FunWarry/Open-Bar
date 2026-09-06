/**
 * Represents the raw GitHub release payload schema returned by GitHub REST API.
 */
export interface GitHubRelease {
  /** GitHub unique release identifier */
  id: number;
  /** Git tag name associated with the release (e.g., 'v1.1.0' or 'v0.2.0-beta.1') */
  tag_name: string;
  /** Release title */
  name: string | null;
  /** Markdown release notes and changelog body */
  body: string | null;
  /** Flag indicating whether the release is marked as a pre-release / beta on GitHub */
  prerelease: boolean;
  /** Flag indicating whether the release is still an unpublished draft */
  draft: boolean;
  /** ISO 8601 publication timestamp */
  published_at: string;
  /** Web URL to view the release details on GitHub */
  html_url: string;
}

/**
 * Normalized representation of an official OpenBar release.
 */
export interface OfficialReleaseInfo {
  /** Clean semantic version number without 'v' prefix (e.g., '1.1.0') */
  version: string;
  /** Original Git tag name (e.g., 'v1.1.0') */
  tagName: string;
  /** Display title of the release */
  title: string;
  /** Changelog content or release description */
  releaseNotes: string;
  /** Publication date string */
  publishedAt: string;
  /** Web URL on GitHub */
  htmlUrl: string;
}

/**
 * Result of an application update check.
 */
export interface UpdateCheckResult {
  /** Flag indicating whether a newer official release is available */
  hasUpdate: boolean;
  /** Currently executing application version */
  currentVersion: string;
  /** Detailed metadata of the latest official release, or null if up to date */
  latestRelease: OfficialReleaseInfo | null;
}
