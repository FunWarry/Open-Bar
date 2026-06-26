import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from '../app/app.component';
import { provideMockStore } from '@ngrx/store/testing';
import { NavigationService } from '../app/core/services/navigation.service';
import { NotificationService } from '../app/core/services/notification.service';
import { WebSocketService } from '../app/core/services/websocket.service';
import { PopoverController } from '@ionic/angular/standalone';
import { EMPTY, of } from 'rxjs';

describe('AppComponent', () => {
  const initialState = { auth: { token: null, user: null, error: null } };

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

    await TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule],
      providers: [
        provideMockStore({ initialState }),
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: WebSocketService, useValue: mockWebSocketService },
        { provide: PopoverController, useValue: mockPopoverCtrl },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
