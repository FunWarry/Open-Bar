import { GitHubRelease, OfficialReleaseInfo } from '../models/app-update.model';

/**
 * Parsed semantic version components.
 */
export interface SemverParts {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/** Regular expression for standard Semantic Versioning 2.0 (e.g. 1.2.3, v1.2.3, 1.2.3-beta.1). */
const SEMVER_REGEX = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/**
 * Parses a semantic version string into structured numeric components.
 *
 * @param version Version string to parse (e.g., 'v1.2.3' or '2.0.0')
 * @returns Structured SemverParts or null if invalid format
 */
export function parseSemver(version: string | null | undefined): SemverParts | null {
  if (!version || typeof version !== 'string') {
    return null;
  }
  const match = SEMVER_REGEX.exec(version.trim());
  if (!match) {
    return null;
  }
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4]
  };
}

/**
 * Determines whether a version tag represents a pre-release or beta build.
 *
 * @param tagOrVersion Tag or version string
 * @returns True if the string indicates a pre-release (beta, alpha, rc, dev)
 */
export function isPreRelease(tagOrVersion: string | null | undefined): boolean {
  if (!tagOrVersion || typeof tagOrVersion !== 'string') {
    return true;
  }
  const clean = tagOrVersion.trim().toLowerCase();
  if (clean.includes('-beta') || clean.includes('-alpha') || clean.includes('-rc') || clean.includes('-dev')) {
    return true;
  }
  const parsed = parseSemver(tagOrVersion);
  if (!parsed) {
    return true; // Non-semver tags (e.g., 'v-beta.1') are considered non-official/pre-release
  }
  return !!parsed.prerelease;
}

/**
 * Compares two semantic version strings.
 *
 * @param v1 First version string
 * @param v2 Second version string
 * @returns Positive number if v1 > v2, negative if v1 < v2, or 0 if equal
 */
export function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (!p1 && !p2) return 0;
  if (!p1) return -1;
  if (!p2) return 1;

  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  if (p1.patch !== p2.patch) return p1.patch - p2.patch;

  return 0;
}

/**
 * Checks whether a candidate release version is strictly newer than the current application version.
 *
 * @param candidate Version to evaluate
 * @param current Currently running version
 * @returns True if candidate is a stable, strictly higher semantic version
 */
export function isNewerVersion(candidate: string, current: string): boolean {
  if (isPreRelease(candidate)) {
    return false;
  }
  return compareSemver(candidate, current) > 0;
}

/**
 * Filters a list of GitHub releases to retain only valid official releases,
 * excluding drafts, pre-releases, and beta builds, ordered from newest to oldest.
 *
 * @param releases Raw list of releases from GitHub API
 * @returns Sorted list of official release information
 */
export function filterOfficialReleases(releases: GitHubRelease[]): OfficialReleaseInfo[] {
  if (!Array.isArray(releases)) {
    return [];
  }

  return releases
    .filter((r) => !r.draft && !r.prerelease && !isPreRelease(r.tag_name))
    .map((r) => {
      const parsed = parseSemver(r.tag_name);
      const cleanVersion = parsed ? `${parsed.major}.${parsed.minor}.${parsed.patch}` : r.tag_name.replace(/^v/, '');
      return {
        version: cleanVersion,
        tagName: r.tag_name,
        title: r.name || r.tag_name,
        releaseNotes: r.body || '',
        publishedAt: r.published_at,
        htmlUrl: r.html_url
      };
    })
    .sort((a, b) => compareSemver(b.version, a.version));
}
