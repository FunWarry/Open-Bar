import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from '../app/app.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NavigationService } from '../app/core/services/navigation.service';
import { NotificationService } from '../app/core/services/notification.service';
import { WebSocketService } from '../app/core/services/websocket.service';
import { AppSettingsService } from '../app/core/services/app-settings.service';
import { PopoverController } from '@ionic/angular/standalone';
import { EMPTY, of, throwError } from 'rxjs';
import { selectIsAuthenticated } from '../app/core/store/auth.selectors';
import { Router, NavigationEnd } from '@angular/router';

describe('AppComponent', () => {
  const initialState = { auth: { token: 'valid-jwt', user: { username: 'admin' }, error: null } };
  let mockAppSettingsService: jasmine.SpyObj<AppSettingsService>;
  let router: Router;

  beforeEach(async () => {
    const mockNavigationService = jasmine.createSpyObj('NavigationService', [
      'navigateToHome', 'navigateToLogin', 'navigateToAdmin', 'navigateToUserProfile',
    ]);

    const mockWebSocketService = jasmine.createSpyObj('WebSocketService', [
      'connect', 'disconnect', 'watch',
    ]);
    mockWebSocketService.watch.and.returnValue(EMPTY);

    const mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'onNotification', 'onStockAlert', 'getNonLues', 'getHistory', 'marquerLue', 'marquerToutLu',
    ]);
    mockNotificationService.onNotification.and.returnValue(EMPTY);
    mockNotificationService.onStockAlert.and.returnValue(EMPTY);
    mockNotificationService.getNonLues.and.returnValue(0);

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

    await TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule],
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
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('ngOnInit appelle getSettings() et gère les succès et erreurs', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.ngOnInit();
    expect(mockAppSettingsService.getSettings).toHaveBeenCalled();
  });

  it('ngOnInit gère l\'erreur getSettings() sans planter', () => {
    mockAppSettingsService.getSettings.and.returnValue(throwError(() => new Error('API indisponible')));
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(() => app.ngOnInit()).not.toThrow();
  });

  it('showNavbar$ est vrai pour un utilisateur connecté sur une route normale', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    router.navigate(['/app-home']);
    tick();

    let showNav = false;
    app.showNavbar$.subscribe(val => showNav = val);

    expect(showNav).toBeTrue();
  }));

  it('showNavbar$ est faux sur la page de login', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    router.navigate(['/auth/login']);
    tick();

    let showNav = true;
    app.showNavbar$.subscribe(val => showNav = val);

    expect(showNav).toBeFalse();
  }));
});
