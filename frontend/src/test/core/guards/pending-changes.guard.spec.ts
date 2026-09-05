import { TestBed } from '@angular/core/testing';
import { ModalController, AlertController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { PendingChangesGuard, HasPendingChanges } from '../../../app/core/guards/pending-changes.guard';

describe('PendingChangesGuard', () => {
  let guard: PendingChangesGuard;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let translocoServiceSpy: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    translocoServiceSpy = jasmine.createSpyObj('TranslocoService', ['translate']);
    translocoServiceSpy.translate.and.callFake(((key: any) => key) as any);

    TestBed.configureTestingModule({
      providers: [
        PendingChangesGuard,
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
        { provide: TranslocoService, useValue: translocoServiceSpy },
      ],
    });

    guard = TestBed.inject(PendingChangesGuard);
  });

  it('should allow deactivation when component is null or has no hasUnsavedChanges method', async () => {
    const result = await guard.canDeactivate(null as any);
    expect(result).toBeTrue();
  });

  it('should allow deactivation when component has no unsaved changes (returns false)', async () => {
    const component: HasPendingChanges = {
      hasUnsavedChanges: () => false,
    };
    const result = await guard.canDeactivate(component);
    expect(result).toBeTrue();
    expect(modalCtrlSpy.create).not.toHaveBeenCalled();
    expect(alertCtrlSpy.create).not.toHaveBeenCalled();
  });

  it('should allow deactivation when component returns Observable of false', async () => {
    const component: HasPendingChanges = {
      hasUnsavedChanges: () => of(false),
    };
    const result = await guard.canDeactivate(component);
    expect(result).toBeTrue();
    expect(modalCtrlSpy.create).not.toHaveBeenCalled();
  });

  it('should allow deactivation when component returns Promise of false', async () => {
    const component: HasPendingChanges = {
      hasUnsavedChanges: () => Promise.resolve(false),
    };
    const result = await guard.canDeactivate(component);
    expect(result).toBeTrue();
    expect(modalCtrlSpy.create).not.toHaveBeenCalled();
  });

  it('should prompt user with custom modal when component has unsaved changes and allow navigation on confirm', async () => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: { confirmed: true } })),
    };

    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    const component: HasPendingChanges = {
      hasUnsavedChanges: () => true,
    };

    const result = await guard.canDeactivate(component);
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(modalMock.present).toHaveBeenCalled();
    expect(result).toBeTrue();
  });

  it('should prompt user with custom modal when component has unsaved changes and cancel navigation on cancel', async () => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: { confirmed: false } })),
    };

    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    const component: HasPendingChanges = {
      hasUnsavedChanges: () => true,
    };

    const result = await guard.canDeactivate(component);
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(modalMock.present).toHaveBeenCalled();
    expect(result).toBeFalse();
  });

  it('should fallback to alertCtrl when modalCtrl is undefined and allow on destructive role', async () => {
    const alertMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role: 'destructive' })),
    };
    alertCtrlSpy.create.and.returnValue(Promise.resolve(alertMock as any));

    (guard as any).modalCtrl = undefined;

    const component: HasPendingChanges = {
      hasUnsavedChanges: () => true,
    };

    const result = await guard.canDeactivate(component);
    expect(alertCtrlSpy.create).toHaveBeenCalled();
    expect(alertMock.present).toHaveBeenCalled();
    expect(result).toBeTrue();
  });

  it('should fallback to alertCtrl when modalCtrl is undefined and cancel on cancel role', async () => {
    const alertMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role: 'cancel' })),
    };
    alertCtrlSpy.create.and.returnValue(Promise.resolve(alertMock as any));

    (guard as any).modalCtrl = undefined;

    const component: HasPendingChanges = {
      hasUnsavedChanges: () => true,
    };

    const result = await guard.canDeactivate(component);
    expect(result).toBeFalse();
  });

  it('should return true when neither modalCtrl nor alertCtrl are provided', async () => {
    (guard as any).modalCtrl = undefined;
    (guard as any).alertCtrl = undefined;

    const component: HasPendingChanges = {
      hasUnsavedChanges: () => true,
    };

    const result = await guard.canDeactivate(component);
    expect(result).toBeTrue();
  });
});

