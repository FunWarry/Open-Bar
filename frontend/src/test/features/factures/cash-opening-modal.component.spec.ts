import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { provideIonicAngular, ModalController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { CashOpeningModalComponent } from '../../../app/features/factures/cash-opening-modal/cash-opening-modal.component';
import { CashDrawerService } from '../../../app/core/services/cash-drawer.service';
import { AppSettingsService } from '../../../app/core/services/app-settings.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { CashDrawerSession } from '../../../app/core/models/cash-drawer.model';

describe('CashOpeningModalComponent', () => {
  let component: CashOpeningModalComponent;
  let fixture: ComponentFixture<CashOpeningModalComponent>;
  let cashDrawerServiceSpy: jasmine.SpyObj<CashDrawerService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let appSettingsServiceSpy: jasmine.SpyObj<AppSettingsService>;

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  const mockSession: CashDrawerSession = {
    id: 1,
    sessionDate: '2026-09-18',
    openedAt: '2026-09-18T09:00:00Z',
    openingFloat: 150.0,
    status: 'OPEN',
    notes: 'Shift open'
  };

  beforeEach(async () => {
    cashDrawerServiceSpy = jasmine.createSpyObj('CashDrawerService', ['openDrawer', 'printTillOpeningSlip']);
    cashDrawerServiceSpy.openDrawer.and.returnValue(of(mockSession));
    cashDrawerServiceSpy.printTillOpeningSlip.and.returnValue(of({
      success: true,
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      message: 'Printed',
      durationMs: 50
    }));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as unknown as ReturnType<ToastController['create']> extends Promise<infer U> ? U : never));

    appSettingsServiceSpy = jasmine.createSpyObj('AppSettingsService', ['formatCurrency'], {
      currencySymbol: '€'
    });
    appSettingsServiceSpy.formatCurrency.and.callFake((val: number) => `${val?.toFixed(2)} €`);

    await TestBed.configureTestingModule({
      imports: [CashOpeningModalComponent, getTranslocoTestingModule()],
      providers: [
        provideIonicAngular(),
        { provide: CashDrawerService, useValue: cashDrawerServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AppSettingsService, useValue: appSettingsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CashOpeningModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create modal component with default float', () => {
    expect(component).toBeTruthy();
    expect(component.openingFloat).toBe(150.0);
    expect(component.denominations.length).toBeGreaterThan(0);
  });

  it('should update denomination count and recompute opening float', () => {
    const firstDenom = component.denominations[0];
    component.updateCount(firstDenom.key, 2);
    expect(component.counting[firstDenom.key]).toBe(2);
    expect(component.openingFloat).toBe(component.countedTotal);

    // Decreasing below 0 should clamp to 0
    component.updateCount(firstDenom.key, -5);
    expect(component.counting[firstDenom.key]).toBe(0);
  });

  it('should handle direct count keyboard changes', () => {
    const firstDenom = component.denominations[0];
    component.onDirectCountChange(firstDenom.key, '5');
    expect(component.counting[firstDenom.key]).toBe(5);

    // Non-numeric or negative input defaults to 0
    component.onDirectCountChange(firstDenom.key, '-3');
    expect(component.counting[firstDenom.key]).toBe(0);
  });

  it('should set preset float amounts', () => {
    component.setPresetFloat(200.0);
    expect(component.openingFloat).toBe(200.0);
  });

  it('should submit drawer opening and dismiss with session data', fakeAsync(() => {
    component.openingFloat = 150.0;
    component.notes = 'Ready for service';
    component.submitOpenDrawer();
    tick();
    flushMicrotasks();

    expect(cashDrawerServiceSpy.openDrawer).toHaveBeenCalledWith(jasmine.objectContaining({
      openingFloat: 150.0,
      notes: 'Ready for service'
    }));
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      opened: true,
      session: mockSession
    });
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should handle API error gracefully on opening failure', fakeAsync(() => {
    cashDrawerServiceSpy.openDrawer.and.returnValue(throwError(() => ({
      error: { message: 'Cash drawer already opened' }
    })));

    component.submitOpenDrawer();
    tick();
    flushMicrotasks();

    expect(component.isSubmitting).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      message: 'Cash drawer already opened',
      color: 'danger'
    }));
  }));

  it('should print opening audit slip on demand', fakeAsync(() => {
    component.printSlip(1);
    tick();
    flushMicrotasks();

    expect(cashDrawerServiceSpy.printTillOpeningSlip).toHaveBeenCalledWith(1);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should dismiss modal on cancel', () => {
    component.cancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null);
  });
});
