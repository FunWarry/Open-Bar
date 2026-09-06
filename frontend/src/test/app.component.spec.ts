import { Component, signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from '../app/app.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NavigationService } from '../app/core/services/navigation.service';
import { NotificationService } from '../app/core/services/notification.service';
import { WebSocketService } from '../app/core/services/websocket.service';
import { AppSettingsService } from '../app/core/services/app-settings.service';
import { AppUpdateService } from '../app/core/services/app-update.service';
import { PopoverController } from '@ionic/angular/standalone';
import { EMPTY, of, throwError } from 'rxjs';
import { selectIsAuthenticated } from '../app/core/store/auth.selectors';
import { Router } from '@angular/router';

import { getTranslocoTestingModule } from './transloco-testing.module';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('AppComponent', () => {
  const initialState = { auth: { token: 'valid-jwt', user: { username: 'admin' }, error: null } };
  let mockAppSettingsService: jasmine.SpyObj<AppSettingsService>;
  let mockAppUpdateService: jasmine.SpyObj<AppUpdateService>;
  let router: Router;

  beforeEach(async () => {
    const mockNavigationService = jasmine.createSpyObj('NavigationService', [
      'navigateToHome', 'navigateToLogin', 'navigateToAdmin', 'navigateToUserProfile', 'toggleSidebarCollapse', 'setSidebarCollapsed'
    ], {
      isSidebarCollapsed: signal(false)
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

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        DummyComponent,
        getTranslocoTestingModule(),
        RouterTestingModule.withRoutes([
          { path: 'auth/login', component: DummyComponent },
          { path: 'app-home', component: DummyComponent }
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
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('ngOnInit calls getSettings() and initStartupCheck()', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.ngOnInit();
    expect(mockAppSettingsService.getSettings).toHaveBeenCalled();
    expect(mockAppUpdateService.initStartupCheck).toHaveBeenCalled();
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

  it('showNavbar$ est faux sur la page de login', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    let showNav = true;
    app.showNavbar$.subscribe(val => showNav = val);

    router.navigate(['/auth/login']);
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
});
