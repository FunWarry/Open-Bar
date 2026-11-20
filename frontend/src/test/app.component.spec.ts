import { Component, signal, WritableSignal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from '../app/app.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NavigationService } from '../app/core/services/navigation.service';
import { NotificationService } from '../app/core/services/notification.service';
import { WebSocketService } from '../app/core/services/websocket.service';
import { AppSettingsService } from '../app/core/services/app-settings.service';
import { AppUpdateService } from '../app/core/services/app-update.service';
import { SessionTimeoutService } from '../app/core/services/session-timeout.service';
import { StartupReadinessService } from '../app/core/services/startup-readiness.service';
import { ModalHistoryService } from '../app/core/services/modal-history.service';
import { PopoverController } from '@ionic/angular';
import { EMPTY, of, throwError } from 'rxjs';
import { selectIsAuthenticated } from '../app/core/store/auth.selectors';
import { Router } from '@angular/router';

import { getTranslocoTestingModule } from './transloco-testing.module';

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: '' })
class DummyComponent {}

describe('AppComponent', () => {
  const initialState = { auth: { token: 'valid-jwt', user: { username: 'admin' }, error: null } };
  let mockAppSettingsService: jasmine.SpyObj<AppSettingsService>;
  let mockAppUpdateService: jasmine.SpyObj<AppUpdateService>;
  let mockSessionTimeoutService: jasmine.SpyObj<SessionTimeoutService>;
  let mockStartupReadinessService: jasmine.SpyObj<StartupReadinessService>;
  let mockModalHistoryService: jasmine.SpyObj<ModalHistoryService>;
  let mockNavigationService: jasmine.SpyObj<NavigationService>;
  let isSidebarCollapsedSignal: WritableSignal<boolean>;
  let isMobileSidebarOpenSignal: WritableSignal<boolean>;
  let isMobileSignal: WritableSignal<boolean>;
  let router: Router;

  beforeEach(async () => {
    mockModalHistoryService = jasmine.createSpyObj('ModalHistoryService', [
      'init', 'destroy', 'dismissTopOverlay', 'getOverlayCount'
    ]);
    isSidebarCollapsedSignal = signal(false);
    isMobileSidebarOpenSignal = signal(false);
    isMobileSignal = signal(false);
    mockNavigationService = jasmine.createSpyObj('NavigationService', [
      'navigateToHome', 'navigateToLogin', 'navigateToAdmin', 'navigateToUserProfile', 'toggleSidebarCollapse', 'setSidebarCollapsed', 'closeMobileSidebar'
    ], {
      isSidebarCollapsed: isSidebarCollapsedSignal,
      isMobileSidebarOpen: isMobileSidebarOpenSignal,
      isMobile: isMobileSignal,
    });

    const mockWebSocketService = jasmine.createSpyObj('WebSocketService', [
      'connect', 'disconnect', 'watch',
    ]);
    mockWebSocketService.watch.and.returnValue(EMPTY);

    const mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'onNotification', 'onStockAlert', 'getNonLues', 'getHistory', 'marquerLue', 'marquerToutLu', 'toggleNotifPanel', 'closeNotifPanel',
    ]);
    mockNotificationService.onNotification.and.returnValue(EMPTY);
    mockNotificationService.onStockAlert.and.returnValue(EMPTY);
    mockNotificationService.getNonLues.and.returnValue(0);
    mockNotificationService.getHistory.and.returnValue([]);
    mockNotificationService.isNotifPanelOpen = signal(false);

    const mockPopoverCtrl = jasmine.createSpyObj('PopoverController', ['create']);

    mockAppSettingsService = jasmine.createSpyObj('AppSettingsService', ['getSettings']);
    mockAppSettingsService.getSettings.and.returnValue(of({
      id: 1,
      establishmentName: 'OpenBar',
      primaryColor: '#6c7fe8',
      primaryColorStrong: '#5a68d6',
      logoUrl: null,
      defaultTheme: 'DARK',
      updatedAt: null
    }));

    mockAppUpdateService = jasmine.createSpyObj('AppUpdateService', ['initStartupCheck']);
    mockSessionTimeoutService = jasmine.createSpyObj('SessionTimeoutService', ['init', 'destroy', 'extendSession', 'expireSession']);

    mockStartupReadinessService = jasmine.createSpyObj('StartupReadinessService', ['initStartupCheck'], {
      isStartingUp: signal(false),
      elapsedSeconds: signal(0),
      attempts: signal(0),
      isChecking: signal(false)
    });
    mockStartupReadinessService.initStartupCheck.and.returnValue(of(true));

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        DummyComponent,
        getTranslocoTestingModule(),
        RouterTestingModule.withRoutes([
          { path: 'auth/login', component: DummyComponent },
          { path: 'app-home', component: DummyComponent },
          { path: 'client/commande', component: DummyComponent }
        ])
      ],
      providers: [
        provideMockStore({
          initialState,
          selectors: [
            { selector: selectIsAuthenticated, value: true }
          ]
        }),
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: WebSocketService, useValue: mockWebSocketService },
        { provide: PopoverController, useValue: mockPopoverCtrl },
        { provide: AppSettingsService, useValue: mockAppSettingsService },
        { provide: AppUpdateService, useValue: mockAppUpdateService },
        { provide: SessionTimeoutService, useValue: mockSessionTimeoutService },
        { provide: StartupReadinessService, useValue: mockStartupReadinessService },
        { provide: ModalHistoryService, useValue: mockModalHistoryService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('ngOnInit calls getSettings(), initStartupCheck(), sessionTimeoutService.init(), and modalHistoryService.init()', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.ngOnInit();
    expect(mockModalHistoryService.init).toHaveBeenCalled();
    expect(mockStartupReadinessService.initStartupCheck).toHaveBeenCalled();
    expect(mockAppSettingsService.getSettings).toHaveBeenCalled();
    expect(mockAppUpdateService.initStartupCheck).toHaveBeenCalled();
    expect(mockSessionTimeoutService.init).toHaveBeenCalled();
  });

  it('ngOnInit handles getSettings() error gracefully', () => {
    mockAppSettingsService.getSettings.and.returnValue(throwError(() => new Error('API indisponible')));
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(() => app.ngOnInit()).not.toThrow();
  });

  it('showNavbar$ is true for connected user on regular route', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    let showNav = false;
    app.showNavbar$.subscribe(val => showNav = val);

    router.navigate(['/app-home']);
    tick();

    expect(showNav).toBeTrue();
  }));

  it('showNavbar$ is false on login page', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    let showNav = true;
    app.showNavbar$.subscribe(val => showNav = val);

    router.navigate(['/auth/login']);
    tick();

    expect(showNav).toBeFalse();
  }));

  it('showNavbar$ is false on client ordering routes (/client/commande)', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    let showNav = true;
    app.showNavbar$.subscribe(val => showNav = val);

    router.navigate(['/client/commande']);
    tick();

    expect(showNav).toBeFalse();
  }));

  it('renders notification backdrop when notif panel is open and handles click', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const notifService = TestBed.inject(NotificationService) as any;

    router.navigate(['/app-home']);
    tick();

    notifService.isNotifPanelOpen.set(true);
    fixture.detectChanges();

    const backdropEl = fixture.nativeElement.querySelector('[data-testid="notif-backdrop"]');
    expect(backdropEl).toBeTruthy();

    backdropEl.click();
    expect(notifService.closeNotifPanel).toHaveBeenCalled();
  }));

  it('does not render notification backdrop when panel is closed', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const notifService = TestBed.inject(NotificationService) as any;

    router.navigate(['/app-home']);
    tick();

    notifService.isNotifPanelOpen.set(false);
    fixture.detectChanges();

    const backdropEl = fixture.nativeElement.querySelector('[data-testid="notif-backdrop"]');
    expect(backdropEl).toBeNull();
  }));

  it('should render a single persistent shell brand logo that transitions between sidebar and topbar without duplication', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    router.navigate(['/app-home']);
    tick();
    fixture.detectChanges();

    const hostEl = fixture.nativeElement as HTMLElement;
    const initialLogos = hostEl.querySelectorAll('[data-testid="app-shell-brand-logo"]');
    expect(initialLogos.length).toBe(1);
    expect(hostEl.querySelector('[data-testid="sidebar-brand"]')).toBeNull();
    expect(hostEl.querySelector('[data-testid="topbar-logo"]')).toBeNull();

    const shellBtn = hostEl.querySelector('[data-testid="shell-brand-logo"]') as HTMLButtonElement;
    expect(shellBtn).toBeTruthy();
    expect(shellBtn.classList.contains('in-topbar')).toBeFalse();
    expect(shellBtn.classList.contains('in-mobile-topbar')).toBeFalse();
    expect(shellBtn.classList.contains('in-mobile-drawer')).toBeFalse();

    // Collapse desktop sidebar: same DOM element glides to topbar
    isSidebarCollapsedSignal.set(true);
    fixture.detectChanges();
    expect(hostEl.querySelectorAll('[data-testid="app-shell-brand-logo"]').length).toBe(1);
    expect(hostEl.querySelector('[data-testid="shell-brand-logo"]')).toBe(shellBtn);
    expect(shellBtn.classList.contains('in-topbar')).toBeTrue();

    // Switch to mobile viewport with drawer closed -> drawer open
    isMobileSignal.set(true);
    isMobileSidebarOpenSignal.set(false);
    fixture.detectChanges();
    expect(shellBtn.classList.contains('in-mobile-topbar')).toBeTrue();
    expect(shellBtn.classList.contains('in-mobile-drawer')).toBeFalse();

    isMobileSidebarOpenSignal.set(true);
    fixture.detectChanges();
    expect(hostEl.querySelector('[data-testid="shell-brand-logo"]')).toBe(shellBtn);
    expect(shellBtn.classList.contains('in-mobile-topbar')).toBeFalse();
    expect(shellBtn.classList.contains('in-mobile-drawer')).toBeTrue();

    shellBtn.click();
    expect(mockNavigationService.navigateToHome).toHaveBeenCalled();
  }));
});
