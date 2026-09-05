import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationPanelComponent } from '../../../app/core/components/notification-panel/notification-panel.component';
import { NotificationService, AppNotification } from '../../../app/core/services/notification.service';
import { PopoverController } from '@ionic/angular/standalone';
import { Subject } from 'rxjs';

import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('NotificationPanelComponent', () => {
  let component: NotificationPanelComponent;
  let fixture: ComponentFixture<NotificationPanelComponent>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let popoverCtrlSpy: jasmine.SpyObj<PopoverController>;
  let notifSubject: Subject<AppNotification>;

  const mockNotif: AppNotification = {
    id: 'n-1',
    type: 'commande',
    message: 'Table 5 placed an order',
    severity: 'primary',
    timestamp: new Date(),
    lue: false,
  };

  beforeEach(async () => {
    notifSubject = new Subject<AppNotification>();
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'getHistory',
      'onNotification',
      'marquerToutLu',
      'marquerLue',
    ]);
    popoverCtrlSpy = jasmine.createSpyObj('PopoverController', ['dismiss']);
    popoverCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    notificationServiceSpy.getHistory.and.returnValue([mockNotif]);
    notificationServiceSpy.onNotification.and.returnValue(notifSubject.asObservable());

    await TestBed.configureTestingModule({
      imports: [
        NotificationPanelComponent,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: PopoverController, useValue: popoverCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load initial notifications', () => {
    expect(component).toBeTruthy();
    expect(component.notifications).toHaveSize(1);
  });

  it('should refresh notifications when a new notification arrives', () => {
    const updatedNotif: AppNotification = { ...mockNotif, id: 'n-2', message: 'Second Order' };
    notificationServiceSpy.getHistory.and.returnValue([mockNotif, updatedNotif]);

    notifSubject.next(updatedNotif);

    expect(component.notifications).toHaveSize(2);
  });

  it('should mark all as read and close panel', () => {
    spyOn(component.closePanel, 'emit');

    component.marquerToutLu();

    expect(notificationServiceSpy.marquerToutLu).toHaveBeenCalled();
    expect(component.closePanel.emit).toHaveBeenCalled();
    expect(popoverCtrlSpy.dismiss).toHaveBeenCalled();
  });

  it('should mark single notification as read', () => {
    component.marquerLue('n-1');

    expect(notificationServiceSpy.marquerLue).toHaveBeenCalledWith('n-1');
  });

  it('should map notification types to colors', () => {
    expect(component.typeCouleur('commande')).toBe('primary');
    expect(component.typeCouleur('statut')).toBe('success');
    expect(component.typeCouleur('table')).toBe('warning');
    expect(component.typeCouleur('stock')).toBe('danger');
    expect(component.typeCouleur('unknown')).toBe('medium');
  });

  it('should map notification types to appropriate icon names', () => {
    expect(component.getNotificationIcon('stock')).toBe('alert-circle-outline');
    expect(component.getNotificationIcon('commande')).toBe('restaurant-outline');
    expect(component.getNotificationIcon('statut')).toBe('checkmark-circle-outline');
    expect(component.getNotificationIcon('table')).toBe('warning-outline');
    expect(component.getNotificationIcon('unknown')).toBe('notifications-outline');
  });
});
