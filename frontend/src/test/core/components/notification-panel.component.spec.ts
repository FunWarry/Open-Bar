import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NotificationPanelComponent } from '../../../app/core/components/notification-panel/notification-panel.component';
import { NotificationService, AppNotification } from '../../../app/core/services/notification.service';
import { TableAppelService } from '../../../app/core/services/table-appel.service';
import { TableAppel } from '../../../app/core/models/table-appel.model';
import { PopoverController, ToastController } from '@ionic/angular';
import { Subject, of } from 'rxjs';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('NotificationPanelComponent', () => {
  let component: NotificationPanelComponent;
  let fixture: ComponentFixture<NotificationPanelComponent>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let tableAppelServiceSpy: jasmine.SpyObj<TableAppelService>;
  let popoverCtrlSpy: jasmine.SpyObj<PopoverController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let notifSubject: Subject<AppNotification>;
  let activeAppelsSignal: WritableSignal<TableAppel[]>;

  const mockNotif: AppNotification = {
    id: 'n-1',
    type: 'commande',
    message: 'Table 5 placed an order',
    severity: 'primary',
    timestamp: new Date(),
    lue: false,
  };

  const mockAppel: TableAppel = {
    id: 42,
    tableId: 5,
    tableNumero: 5,
    type: 'ADDITION',
    statut: 'EN_ATTENTE',
    commentaire: 'Paiement sans contact',
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    notifSubject = new Subject<AppNotification>();
    activeAppelsSignal = signal<TableAppel[]>([]);

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'getHistory',
      'onNotification',
      'marquerToutLu',
      'marquerLue',
      'marquerAppelLu',
    ]);

    tableAppelServiceSpy = jasmine.createSpyObj('TableAppelService', [
      'getAppelsActifs',
      'acquitterAppel',
    ]);
    (tableAppelServiceSpy as any).activeAppels = activeAppelsSignal;
    tableAppelServiceSpy.getAppelsActifs.and.returnValue(of([]));
    tableAppelServiceSpy.acquitterAppel.and.returnValue(of({ ...mockAppel, statut: 'ACQUITTE' }));

    popoverCtrlSpy = jasmine.createSpyObj('PopoverController', ['dismiss']);
    popoverCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    const toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastSpy.present.and.returnValue(Promise.resolve());
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    notificationServiceSpy.getHistory.and.returnValue([mockNotif]);
    notificationServiceSpy.onNotification.and.returnValue(notifSubject.asObservable());

    await TestBed.configureTestingModule({
      imports: [
        NotificationPanelComponent,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: TableAppelService, useValue: tableAppelServiceSpy },
        { provide: PopoverController, useValue: popoverCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load initial notifications', () => {
    expect(component).toBeTruthy();
    expect(component.notifications).toHaveSize(1);
    expect(tableAppelServiceSpy.getAppelsActifs).toHaveBeenCalled();
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

  describe('active table calls in notification panel', () => {
    it('should not render active calls section when activeAppels is empty', () => {
      activeAppelsSignal.set([]);
      fixture.detectChanges();

      const callsSection = fixture.nativeElement.querySelector('[data-testid="panel-active-calls-section"]');
      expect(callsSection).toBeNull();
    });

    it('should render active calls section at the top when pending calls exist', () => {
      activeAppelsSignal.set([mockAppel]);
      fixture.detectChanges();

      const callsSection = fixture.nativeElement.querySelector('[data-testid="panel-active-calls-section"]');
      expect(callsSection).not.toBeNull();

      const item = fixture.nativeElement.querySelector('[data-testid="panel-call-item-42"]');
      expect(item).not.toBeNull();
      expect(item.textContent).toContain('Table 5');
      expect(item.textContent).toContain('Paiement sans contact');
    });

    it('should call acquitterAppel, mark notification read and present toast when acknowledging a call', fakeAsync(() => {
      activeAppelsSignal.set([mockAppel]);
      fixture.detectChanges();

      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');

      component.acquitterAppel(mockAppel, event);
      tick();

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(tableAppelServiceSpy.acquitterAppel).toHaveBeenCalledWith(5, 42);
      expect(notificationServiceSpy.marquerAppelLu).toHaveBeenCalledWith(42, 5);
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    }));
  });
});
