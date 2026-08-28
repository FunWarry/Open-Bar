import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { PendingChangesGuard, HasPendingChanges } from '../../../app/core/guards/pending-changes.guard';

describe('PendingChangesGuard', () => {
  let guard: PendingChangesGuard;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let translocoServiceSpy: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    translocoServiceSpy = jasmine.createSpyObj('TranslocoService', ['translate']);
    translocoServiceSpy.translate.and.callFake(((key: any) => key) as any);

    TestBed.configureTestingModule({
      providers: [
        PendingChangesGuard,
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
    expect(alertCtrlSpy.create).not.toHaveBeenCalled();
  });

  it('should allow deactivation when component returns Observable of false', async () => {
    const component: HasPendingChanges = {
      hasUnsavedChanges: () => of(false),
    };
    const result = await guard.canDeactivate(component);
    expect(result).toBeTrue();
    expect(alertCtrlSpy.create).not.toHaveBeenCalled();
  });

  it('should allow deactivation when component returns Promise of false', async () => {
    const component: HasPendingChanges = {
      hasUnsavedChanges: () => Promise.resolve(false),
    };
    const result = await guard.canDeactivate(component);
    expect(result).toBeTrue();
    expect(alertCtrlSpy.create).not.toHaveBeenCalled();
  });

  it('should prompt user with alert when component has unsaved changes and allow navigation on confirm', async () => {
    const alertMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role: 'destructive' })),
    };

    alertCtrlSpy.create.and.returnValue(Promise.resolve(alertMock as any));

    const component: HasPendingChanges = {
      hasUnsavedChanges: () => true,
    };

    const result = await guard.canDeactivate(component);
    expect(alertCtrlSpy.create).toHaveBeenCalled();
    expect(alertMock.present).toHaveBeenCalled();
    expect(result).toBeTrue();
  });

  it('should prompt user with alert when component has unsaved changes and cancel navigation on cancel', async () => {
    const alertMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role: 'cancel' })),
    };

    alertCtrlSpy.create.and.returnValue(Promise.resolve(alertMock as any));

    const component: HasPendingChanges = {
      hasUnsavedChanges: () => true,
    };

    const result = await guard.canDeactivate(component);
    expect(alertCtrlSpy.create).toHaveBeenCalled();
    expect(alertMock.present).toHaveBeenCalled();
    expect(result).toBeFalse();
  });
});
