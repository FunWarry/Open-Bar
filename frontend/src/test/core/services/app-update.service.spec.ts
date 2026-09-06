import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import {
  AppUpdateService,
  SNOOZE_VERSION_KEY,
  SNOOZE_TIMESTAMP_KEY,
  SESSION_CHECKED_KEY
} from '../../../app/core/services/app-update.service';
import { selectCurrentUser } from '../../../app/core/store/auth.selectors';
import { OfficialReleaseInfo, GitHubRelease } from '../../../app/core/models/app-update.model';

describe('AppUpdateService', () => {
  let service: AppUpdateService;
  let store: MockStore;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let translocoServiceSpy: jasmine.SpyObj<TranslocoService>;
  let modalElementSpy: jasmine.SpyObj<HTMLIonModalElement>;
  let toastElementSpy: jasmine.SpyObj<HTMLIonToastElement>;

  const initialAuthState = {
    auth: {
      user: null,
      token: null,
      error: null
    }
  };

  beforeEach(() => {
    modalElementSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'dismiss']);
    modalElementSpy.present.and.resolveTo();
    modalElementSpy.dismiss.and.resolveTo(true);

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.resolveTo(modalElementSpy);

    toastElementSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastElementSpy.present.and.resolveTo();

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.resolveTo(toastElementSpy);

    translocoServiceSpy = jasmine.createSpyObj('TranslocoService', ['translate']);
    (translocoServiceSpy.translate as any).and.callFake((key: any, params?: Record<string, unknown>) => {
      if (params && params['version']) {
        return `Upgrade initiated for v${params['version']}`;
      }
      return key;
    });

    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AppUpdateService,
        provideMockStore({ initialState: initialAuthState }),
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: TranslocoService, useValue: translocoServiceSpy }
      ]
    });

    service = TestBed.inject(AppUpdateService);
    store = TestBed.inject(MockStore);
    store.resetSelectors();
    store.overrideSelector(selectCurrentUser, null);
    store.refreshState();
  });

  afterEach(() => {
    store.resetSelectors();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('canUserViewUpdateModal', () => {
    it('should return true for ROLE_MANAGER, MANAGER, ROLE_ADMIN, and ADMIN', () => {
      expect(service.canUserViewUpdateModal(['ROLE_MANAGER'])).toBeTrue();
      expect(service.canUserViewUpdateModal(['MANAGER'])).toBeTrue();
      expect(service.canUserViewUpdateModal(['ROLE_ADMIN'])).toBeTrue();
      expect(service.canUserViewUpdateModal(['ADMIN'])).toBeTrue();
      expect(service.canUserViewUpdateModal(['SERVEUR', 'MANAGER'])).toBeTrue();
    });

    it('should return false for non-manager roles (SERVEUR, BARMAN, CLIENT)', () => {
      expect(service.canUserViewUpdateModal(['ROLE_SERVEUR'])).toBeFalse();
      expect(service.canUserViewUpdateModal(['SERVEUR'])).toBeFalse();
      expect(service.canUserViewUpdateModal(['ROLE_BARMAN'])).toBeFalse();
      expect(service.canUserViewUpdateModal(['BARMAN'])).toBeFalse();
      expect(service.canUserViewUpdateModal(['CLIENT'])).toBeFalse();
    });

    it('should return false for empty or null role arrays', () => {
      expect(service.canUserViewUpdateModal([])).toBeFalse();
      expect(service.canUserViewUpdateModal(null)).toBeFalse();
      expect(service.canUserViewUpdateModal(undefined)).toBeFalse();
    });
  });

  describe('snooze logic', () => {
    it('should correctly save snooze version and timestamp', () => {
      service.snoozeUpdate('1.2.0');

      expect(localStorage.getItem(SNOOZE_VERSION_KEY)).toBe('1.2.0');
      expect(localStorage.getItem(SNOOZE_TIMESTAMP_KEY)).toBeTruthy();
      expect(service.isSnoozed('1.2.0')).toBeTrue();
    });

    it('should return false for a different unsnoozed version', () => {
      service.snoozeUpdate('1.1.0');
      expect(service.isSnoozed('1.2.0')).toBeFalse();
    });

    it('should return false when snooze has expired past 24 hours', () => {
      const pastTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      localStorage.setItem(SNOOZE_VERSION_KEY, '1.2.0');
      localStorage.setItem(SNOOZE_TIMESTAMP_KEY, pastTime.toString());

      expect(service.isSnoozed('1.2.0')).toBeFalse();
    });

    it('should clear snooze upon clearSnooze()', () => {
      service.snoozeUpdate('1.2.0');
      expect(service.isSnoozed('1.2.0')).toBeTrue();

      service.clearSnooze();
      expect(service.isSnoozed('1.2.0')).toBeFalse();
      expect(localStorage.getItem(SNOOZE_VERSION_KEY)).toBeNull();
    });
  });

  describe('checkNewerRelease', () => {
    const mockOfficialReleases: GitHubRelease[] = [
      {
        id: 10,
        tag_name: 'v1.1.0',
        name: 'OpenBar v1.1.0 Official',
        body: 'Release notes v1.1.0',
        prerelease: false,
        draft: false,
        published_at: '2026-09-05T12:00:00Z',
        html_url: 'https://github.com/FunWarry/Open-Bar/releases/tag/v1.1.0'
      }
    ];

    it('should detect when an official release is newer than current version', async () => {
      spyOn(window, 'fetch').and.resolveTo(
        new Response(JSON.stringify(mockOfficialReleases), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );

      const result = await service.checkNewerRelease();

      expect(result.hasUpdate).toBeTrue();
      expect(result.latestRelease).toBeTruthy();
      expect(result.latestRelease?.version).toBe('1.1.0');
      expect(result.latestRelease?.title).toBe('OpenBar v1.1.0 Official');
    });

    it('should return hasUpdate: false when latest official release is older or equal', async () => {
      const olderReleases: GitHubRelease[] = [
        {
          id: 5,
          tag_name: 'v1.0.0',
          name: 'OpenBar v1.0.0',
          body: 'Base version',
          prerelease: false,
          draft: false,
          published_at: '2026-08-01T12:00:00Z',
          html_url: 'https://github.com/FunWarry/Open-Bar/releases/tag/v1.0.0'
        }
      ];
      spyOn(window, 'fetch').and.resolveTo(
        new Response(JSON.stringify(olderReleases), { status: 200 })
      );

      const result = await service.checkNewerRelease();

      expect(result.hasUpdate).toBeFalse();
      expect(result.latestRelease).toBeNull();
    });

    it('should ignore pre-release and beta releases', async () => {
      const betaReleases: GitHubRelease[] = [
        {
          id: 99,
          tag_name: 'v2.0.0-beta.1',
          name: 'v2.0.0 Beta',
          body: 'Unstable build',
          prerelease: true,
          draft: false,
          published_at: '2026-09-06T12:00:00Z',
          html_url: 'https://github.com/FunWarry/Open-Bar/releases/tag/v2.0.0-beta.1'
        }
      ];
      spyOn(window, 'fetch').and.resolveTo(
        new Response(JSON.stringify(betaReleases), { status: 200 })
      );

      const result = await service.checkNewerRelease();

      expect(result.hasUpdate).toBeFalse();
      expect(result.latestRelease).toBeNull();
    });

    it('should gracefully fallback and return hasUpdate: false on network error or offline mode without throwing', async () => {
      spyOn(window, 'fetch').and.rejectWith(new TypeError('Failed to fetch'));

      const result = await service.checkNewerRelease();

      expect(result.hasUpdate).toBeFalse();
      expect(result.latestRelease).toBeNull();
    });

    it('should gracefully fallback when server returns non-200 HTTP status', async () => {
      spyOn(window, 'fetch').and.resolveTo(
        new Response(JSON.stringify({ message: 'Rate limit exceeded' }), { status: 403 })
      );

      const result = await service.checkNewerRelease();

      expect(result.hasUpdate).toBeFalse();
      expect(result.latestRelease).toBeNull();
    });
  });

  describe('initStartupCheck', () => {
    it('should trigger update check and present modal when manager logs in and newer version is available', async () => {
      const mockRelease: OfficialReleaseInfo = {
        version: '1.2.0',
        tagName: 'v1.2.0',
        title: 'OpenBar v1.2.0',
        releaseNotes: 'Features',
        publishedAt: '2026-09-06T10:00:00Z',
        htmlUrl: 'https://github.com/FunWarry/Open-Bar/releases/tag/v1.2.0'
      };

      spyOn(service, 'checkNewerRelease').and.resolveTo({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestRelease: mockRelease
      });
      spyOn(service, 'presentUpdateModal').and.resolveTo(modalElementSpy);

      service.initStartupCheck();

      // Dispatch manager user to NgRx store
      store.overrideSelector(selectCurrentUser, {
        id: 1,
        username: 'manager1',
        roles: ['ROLE_MANAGER']
      } as any);
      store.refreshState();

      // Allow microtask resolution
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(service.checkNewerRelease).toHaveBeenCalled();
      expect(service.presentUpdateModal).toHaveBeenCalledWith(mockRelease);
      expect(sessionStorage.getItem(SESSION_CHECKED_KEY)).toBe('true');
    });

    it('should NOT trigger update modal when server (SERVEUR) logs in', async () => {
      spyOn(service, 'checkNewerRelease').and.resolveTo({
        hasUpdate: false,
        currentVersion: '1.0.0',
        latestRelease: null
      });
      spyOn(service, 'presentUpdateModal').and.resolveTo(null);

      store.overrideSelector(selectCurrentUser, {
        id: 2,
        username: 'serveur1',
        roles: ['SERVEUR']
      } as any);
      store.refreshState();

      service.initStartupCheck();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(service.checkNewerRelease).not.toHaveBeenCalled();
      expect(service.presentUpdateModal).not.toHaveBeenCalled();
    });

    it('should NOT present modal when update version is snoozed', async () => {
      const mockRelease: OfficialReleaseInfo = {
        version: '1.2.0',
        tagName: 'v1.2.0',
        title: 'OpenBar v1.2.0',
        releaseNotes: 'Notes',
        publishedAt: '2026-09-06T10:00:00Z',
        htmlUrl: 'https://github.com/FunWarry/Open-Bar'
      };

      service.snoozeUpdate('1.2.0');

      spyOn(service, 'checkNewerRelease').and.resolveTo({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestRelease: mockRelease
      });
      spyOn(service, 'presentUpdateModal').and.resolveTo(null);

      store.overrideSelector(selectCurrentUser, {
        id: 3,
        username: 'admin',
        roles: ['ROLE_ADMIN']
      } as any);
      store.refreshState();

      service.initStartupCheck();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(service.checkNewerRelease).toHaveBeenCalled();
      expect(service.presentUpdateModal).not.toHaveBeenCalled();
    });
  });

  describe('triggerUpdate', () => {
    it('should display confirmation toast and trigger update reference', async () => {
      spyOn(window, 'open');
      const release: OfficialReleaseInfo = {
        version: '1.2.0',
        tagName: 'v1.2.0',
        title: 'OpenBar v1.2.0',
        releaseNotes: 'Changelog',
        publishedAt: '2026-09-06T10:00:00Z',
        htmlUrl: 'https://github.com/FunWarry/Open-Bar/releases/tag/v1.2.0'
      };

      await service.triggerUpdate(release);

      expect(toastCtrlSpy.create).toHaveBeenCalled();
      expect(toastElementSpy.present).toHaveBeenCalled();
      expect(window.open).toHaveBeenCalledWith(release.htmlUrl, '_blank');
    });
  });
});
