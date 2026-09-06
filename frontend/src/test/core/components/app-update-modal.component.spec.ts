import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AppUpdateModalComponent } from '../../../app/core/components/app-update-modal/app-update-modal.component';
import { AppUpdateService } from '../../../app/core/services/app-update.service';
import { OfficialReleaseInfo } from '../../../app/core/models/app-update.model';
import { By } from '@angular/platform-browser';

describe('AppUpdateModalComponent', () => {
  let component: AppUpdateModalComponent;
  let fixture: ComponentFixture<AppUpdateModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let appUpdateServiceSpy: jasmine.SpyObj<AppUpdateService>;

  const mockRelease: OfficialReleaseInfo = {
    version: '1.2.0',
    tagName: 'v1.2.0',
    title: 'OpenBar v1.2.0 - Major Upgrade',
    releaseNotes: '### Improvements\n- Faster order flow\n- Real-time stock alerts',
    publishedAt: '2026-09-06T12:00:00Z',
    htmlUrl: 'https://github.com/FunWarry/Open-Bar/releases/tag/v1.2.0'
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.resolveTo(true);

    appUpdateServiceSpy = jasmine.createSpyObj('AppUpdateService', ['snoozeUpdate', 'triggerUpdate']);
    appUpdateServiceSpy.triggerUpdate.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [
        AppUpdateModalComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              UPDATE_MODAL: {
                TITLE: 'OpenBar Update Available',
                NEW_VERSION_AVAILABLE: 'A new stable release is ready!',
                CURRENT_VERSION: 'Current version',
                LATEST_VERSION: 'New version',
                POSTPONE: 'Later (24h)',
                UPGRADE_NOW: 'Update now',
                UPGRADING: 'Updating...',
                RELEASE_NOTES: 'Release notes (Changelog)'
              }
            }
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en'
          }
        })
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: AppUpdateService, useValue: appUpdateServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppUpdateModalComponent);
    component = fixture.componentInstance;
    component.currentVersion = '1.0.0';
    component.latestRelease = mockRelease;
    fixture.detectChanges();
  });

  it('should create the modal component', () => {
    expect(component).toBeTruthy();
  });

  it('should render current version and latest version badges', () => {
    const currentBadge = fixture.debugElement.query(By.css('[data-testid="current-version-badge"]'));
    const latestBadge = fixture.debugElement.query(By.css('[data-testid="latest-version-badge"]'));

    expect(currentBadge).toBeTruthy();
    expect(currentBadge.nativeElement.textContent).toContain('v1.0.0');

    expect(latestBadge).toBeTruthy();
    expect(latestBadge.nativeElement.textContent).toContain('v1.2.0');
  });

  it('should display release title and release notes', () => {
    const titleEl = fixture.debugElement.query(By.css('[data-testid="release-title"]'));
    const notesEl = fixture.debugElement.query(By.css('[data-testid="release-notes-content"]'));

    expect(titleEl.nativeElement.textContent).toContain('OpenBar v1.2.0 - Major Upgrade');
    expect(notesEl.nativeElement.textContent).toContain('Faster order flow');
  });

  it('should dismiss modal with cancel role when close button is clicked', async () => {
    await component.close();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should snooze release version and dismiss with snooze role when snooze is called', async () => {
    await component.snooze();

    expect(appUpdateServiceSpy.snoozeUpdate).toHaveBeenCalledWith('1.2.0');
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'snooze');
  });

  it('should trigger update and dismiss modal with upgrade role when upgrade button is clicked', async () => {
    await component.upgrade();

    expect(appUpdateServiceSpy.triggerUpdate).toHaveBeenCalledWith(mockRelease);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(
      { upgraded: true, release: mockRelease },
      'upgrade'
    );
  });
});
