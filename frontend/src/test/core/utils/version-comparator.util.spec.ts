import {
  parseSemver,
  isPreRelease,
  compareSemver,
  isNewerVersion,
  filterOfficialReleases
} from '../../../app/core/utils/version-comparator.util';
import { GitHubRelease } from '../../../app/core/models/app-update.model';

describe('VersionComparatorUtil', () => {
  describe('parseSemver', () => {
    it('should parse standard semantic version strings', () => {
      expect(parseSemver('1.0.0')).toEqual({ major: 1, minor: 0, patch: 0, prerelease: undefined });
      expect(parseSemver('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: undefined });
      expect(parseSemver('10.20.30')).toEqual({ major: 10, minor: 20, patch: 30, prerelease: undefined });
    });

    it('should parse semantic version with prerelease tag', () => {
      expect(parseSemver('1.2.0-beta.1')).toEqual({ major: 1, minor: 2, patch: 0, prerelease: 'beta.1' });
      expect(parseSemver('v2.0.0-rc.2')).toEqual({ major: 2, minor: 0, patch: 0, prerelease: 'rc.2' });
    });

    it('should return null for invalid, empty, or malformed strings', () => {
      expect(parseSemver(null)).toBeNull();
      expect(parseSemver(undefined)).toBeNull();
      expect(parseSemver('')).toBeNull();
      expect(parseSemver('invalid')).toBeNull();
      expect(parseSemver('v-beta.16')).toBeNull();
    });
  });

  describe('isPreRelease', () => {
    it('should return true for tags containing beta, alpha, rc, or dev', () => {
      expect(isPreRelease('v1.2.0-beta.1')).toBeTrue();
      expect(isPreRelease('1.0.0-alpha')).toBeTrue();
      expect(isPreRelease('v2.0.0-rc.3')).toBeTrue();
      expect(isPreRelease('v-beta.16')).toBeTrue();
      expect(isPreRelease('0.1.0-dev')).toBeTrue();
    });

    it('should return false for official stable semver versions', () => {
      expect(isPreRelease('1.0.0')).toBeFalse();
      expect(isPreRelease('v1.1.0')).toBeFalse();
      expect(isPreRelease('v2.4.15')).toBeFalse();
    });

    it('should return true for null or empty values', () => {
      expect(isPreRelease(null)).toBeTrue();
      expect(isPreRelease(undefined)).toBeTrue();
      expect(isPreRelease('')).toBeTrue();
    });
  });

  describe('compareSemver', () => {
    it('should return 0 for identical versions', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('v1.2.0', '1.2.0')).toBe(0);
    });

    it('should correctly compare major versions', () => {
      expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
    });

    it('should correctly compare minor versions', () => {
      expect(compareSemver('1.2.0', '1.1.9')).toBeGreaterThan(0);
      expect(compareSemver('1.1.0', '1.2.0')).toBeLessThan(0);
    });

    it('should correctly compare patch versions', () => {
      expect(compareSemver('1.0.2', '1.0.1')).toBeGreaterThan(0);
      expect(compareSemver('1.0.1', '1.0.2')).toBeLessThan(0);
    });

    it('should handle unparseable versions gracefully', () => {
      expect(compareSemver('invalid', '1.0.0')).toBeLessThan(0);
      expect(compareSemver('1.0.0', 'invalid')).toBeGreaterThan(0);
      expect(compareSemver('invalid1', 'invalid2')).toBe(0);
    });
  });

  describe('isNewerVersion', () => {
    it('should return true when candidate is strictly newer than current version', () => {
      expect(isNewerVersion('1.1.0', '1.0.0')).toBeTrue();
      expect(isNewerVersion('v1.0.1', '1.0.0')).toBeTrue();
      expect(isNewerVersion('v2.0.0', '1.9.9')).toBeTrue();
    });

    it('should return false when candidate is equal to or older than current version', () => {
      expect(isNewerVersion('1.0.0', '1.0.0')).toBeFalse();
      expect(isNewerVersion('0.9.0', '1.0.0')).toBeFalse();
      expect(isNewerVersion('v1.1.0', '1.2.0')).toBeFalse();
    });

    it('should return false when candidate is a pre-release even with higher version number', () => {
      expect(isNewerVersion('1.2.0-beta.1', '1.0.0')).toBeFalse();
      expect(isNewerVersion('v-beta.16', '1.0.0')).toBeFalse();
    });
  });

  describe('filterOfficialReleases', () => {
    const mockReleases: GitHubRelease[] = [
      {
        id: 1,
        tag_name: 'v-beta.16',
        name: 'Beta 16',
        body: 'Pre-release build',
        prerelease: true,
        draft: false,
        published_at: '2026-09-06T20:00:00Z',
        html_url: 'https://github.com/FunWarry/Open-Bar/releases/tag/v-beta.16'
      },
      {
        id: 2,
        tag_name: 'v1.1.0',
        name: 'OpenBar v1.1.0 Stable',
        body: '## Features\n- New feature A\n- Fix B',
        prerelease: false,
        draft: false,
        published_at: '2026-09-05T12:00:00Z',
        html_url: 'https://github.com/FunWarry/Open-Bar/releases/tag/v1.1.0'
      },
      {
        id: 3,
        tag_name: 'v1.0.1',
        name: 'OpenBar v1.0.1 Maintenance',
        body: 'Bug fix patch',
        prerelease: false,
        draft: false,
        published_at: '2026-09-01T10:00:00Z',
        html_url: 'https://github.com/FunWarry/Open-Bar/releases/tag/v1.0.1'
      },
      {
        id: 4,
        tag_name: 'v1.2.0-beta.1',
        name: 'v1.2.0 Beta',
        body: 'Experimental',
        prerelease: true,
        draft: false,
        published_at: '2026-09-06T18:00:00Z',
        html_url: 'https://github.com/FunWarry/Open-Bar/releases/tag/v1.2.0-beta.1'
      },
      {
        id: 5,
        tag_name: 'v1.3.0',
        name: 'Draft v1.3.0',
        body: 'Unreleased draft',
        prerelease: false,
        draft: true,
        published_at: '2026-09-07T00:00:00Z',
        html_url: 'https://github.com/FunWarry/Open-Bar/releases/tag/v1.3.0'
      }
    ];

    it('should filter out drafts, pre-releases, and betas, sorting official releases descending', () => {
      const result = filterOfficialReleases(mockReleases);

      expect(result).toHaveSize(2);
      expect(result[0].version).toBe('1.1.0');
      expect(result[0].tagName).toBe('v1.1.0');
      expect(result[0].title).toBe('OpenBar v1.1.0 Stable');
      expect(result[0].releaseNotes).toContain('New feature A');

      expect(result[1].version).toBe('1.0.1');
      expect(result[1].tagName).toBe('v1.0.1');
    });

    it('should return empty array for empty or non-array input', () => {
      expect(filterOfficialReleases([])).toEqual([]);
      expect(filterOfficialReleases(null as unknown as GitHubRelease[])).toEqual([]);
    });
  });
});
