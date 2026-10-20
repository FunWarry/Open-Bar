import { TestBed } from '@angular/core/testing';
import {
  ModalController,
  AlertController,
  ActionSheetController,
  PopoverController
} from '@ionic/angular';
import { ModalHistoryService } from '../../../app/core/services/modal-history.service';
import { NavigationService } from '../../../app/core/services/navigation.service';

describe('ModalHistoryService', () => {
  let service: ModalHistoryService;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let actionSheetCtrlSpy: jasmine.SpyObj<ActionSheetController>;
  let popoverCtrlSpy: jasmine.SpyObj<PopoverController>;
  let navigationServiceSpy: jasmine.SpyObj<NavigationService>;

  beforeEach(() => {
    modalCtrlSpy = jasmine.createSpyObj<ModalController>('ModalController', ['getTop']);
    alertCtrlSpy = jasmine.createSpyObj<AlertController>('AlertController', ['getTop']);
    actionSheetCtrlSpy = jasmine.createSpyObj<ActionSheetController>('ActionSheetController', ['getTop']);
    popoverCtrlSpy = jasmine.createSpyObj<PopoverController>('PopoverController', ['getTop']);
    navigationServiceSpy = jasmine.createSpyObj<NavigationService>('NavigationService', [
      'isMobileSidebarOpen',
      'closeMobileSidebar'
    ]);

    modalCtrlSpy.getTop.and.returnValue(Promise.resolve(undefined));
    alertCtrlSpy.getTop.and.returnValue(Promise.resolve(undefined));
    actionSheetCtrlSpy.getTop.and.returnValue(Promise.resolve(undefined));
    popoverCtrlSpy.getTop.and.returnValue(Promise.resolve(undefined));
    navigationServiceSpy.isMobileSidebarOpen.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        ModalHistoryService,
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
        { provide: ActionSheetController, useValue: actionSheetCtrlSpy },
        { provide: PopoverController, useValue: popoverCtrlSpy },
        { provide: NavigationService, useValue: navigationServiceSpy }
      ]
    });

    service = TestBed.inject(ModalHistoryService);
  });

  afterEach(() => {
    service.destroy();
  });

  it('creates the ModalHistoryService instance', () => {
    expect(service).toBeTruthy();
  });

  it('init pushes history state and increments overlay count when an overlay presents', () => {
    spyOn(window.history, 'pushState');
    service.init();

    window.dispatchEvent(new CustomEvent('ionModalDidPresent'));

    expect(service.getOverlayCount()).toBe(1);
    expect(window.history.pushState).toHaveBeenCalledWith(
      { openbarOverlay: true, count: 1 },
      ''
    );
  });

  it('dismisses the topmost open modal and decrements overlay count when popstate occurs', async () => {
    const mockModal = {
      dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve(true))
    } as unknown as HTMLIonModalElement;
    modalCtrlSpy.getTop.and.returnValue(Promise.resolve(mockModal));

    service.init();
    // Simulate overlay previously presented
    window.dispatchEvent(new CustomEvent('ionModalDidPresent'));
    expect(service.getOverlayCount()).toBe(1);

    const closed = await service.dismissTopOverlay();

    expect(closed).toBeTrue();
    expect(mockModal.dismiss).toHaveBeenCalledWith(null, 'backdrop');
    expect(service.getOverlayCount()).toBe(0);
  });

  it('dismisses the topmost open alert when popstate occurs and no modal is open', async () => {
    const mockAlert = {
      dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve(true))
    } as unknown as HTMLIonAlertElement;
    alertCtrlSpy.getTop.and.returnValue(Promise.resolve(mockAlert));

    service.init();
    const closed = await service.dismissTopOverlay();

    expect(closed).toBeTrue();
    expect(mockAlert.dismiss).toHaveBeenCalledWith(null, 'backdrop');
  });

  it('closes mobile sidebar when popstate occurs and no overlay is open', async () => {
    navigationServiceSpy.isMobileSidebarOpen.and.returnValue(true);

    service.init();
    const closed = await service.dismissTopOverlay();

    expect(closed).toBeTrue();
    expect(navigationServiceSpy.closeMobileSidebar).toHaveBeenCalled();
  });

  it('returns false and does not error when popstate occurs with no active overlays or drawer', async () => {
    service.init();
    const closed = await service.dismissTopOverlay();

    expect(closed).toBeFalse();
  });

  it('calls history.back() when an overlay is dismissed by user action', () => {
    spyOn(window.history, 'back');
    service.init();

    // Modal presents
    window.dispatchEvent(new CustomEvent('ionModalDidPresent'));
    expect(service.getOverlayCount()).toBe(1);

    // Modal dismissed via UI button (not popstate)
    window.dispatchEvent(new CustomEvent('ionModalDidDismiss'));

    expect(service.getOverlayCount()).toBe(0);
    expect(window.history.back).toHaveBeenCalled();
  });

  it('does not call history.back() when dismiss was triggered by popstate back navigation', async () => {
    spyOn(window.history, 'back');
    const mockModal = {
      dismiss: jasmine.createSpy('dismiss').and.callFake(() => {
        // Ionic triggers ionModalDidDismiss during dismiss()
        window.dispatchEvent(new CustomEvent('ionModalDidDismiss'));
        return Promise.resolve(true);
      })
    } as unknown as HTMLIonModalElement;
    modalCtrlSpy.getTop.and.returnValue(Promise.resolve(mockModal));

    service.init();
    window.dispatchEvent(new CustomEvent('ionModalDidPresent'));

    await service.dismissTopOverlay();

    // Since dismissal was triggered by popstate, history.back() must NOT be called again
    expect(window.history.back).not.toHaveBeenCalled();
    expect(service.getOverlayCount()).toBe(0);
  });

  it('destroy cleans up listeners and resets state', () => {
    spyOn(window.history, 'pushState');
    service.init();
    service.destroy();

    window.dispatchEvent(new CustomEvent('ionModalDidPresent'));

    expect(service.getOverlayCount()).toBe(0);
    expect(window.history.pushState).not.toHaveBeenCalled();
  });
});
