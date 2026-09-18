import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { provideIonicAngular, ModalController, ToastController } from '@ionic/angular';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { CashMovementModalComponent } from '../../../app/features/factures/cash-movement-modal/cash-movement-modal.component';
import { CashDrawerService } from '../../../app/core/services/cash-drawer.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { CashMovement, CashDrawerStatus } from '../../../app/core/models/cash-drawer.model';

describe('CashMovementModalComponent', () => {
  let component: CashMovementModalComponent;
  let fixture: ComponentFixture<CashMovementModalComponent>;
  let cashDrawerServiceSpy: {
    getStatus: jasmine.Spy;
    recordMovement: jasmine.Spy;
    currentTheoreticalCash: ReturnType<typeof signal<number>>;
  };
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  const mockMovement: CashMovement = {
    id: 42,
    sessionId: 1,
    type: 'CASH_DROP',
    amount: 50.0,
    reason: 'Safe drop',
    timestamp: '2026-09-18T14:30:00Z'
  };

  const mockStatus: CashDrawerStatus = {
    isModuleEnabled: true,
    date: '2026-09-18',
    hasSession: true,
    isOpened: true,
    isClosed: false,
    startingFloat: 150.0,
    totalCashSales: 100.0,
    totalCashIn: 0,
    totalCashDrop: 0,
    totalPaidOut: 0,
    currentTheoreticalCash: 250.0,
    totalMovementsCount: 0
  };

  beforeEach(async () => {
    cashDrawerServiceSpy = {
      getStatus: jasmine.createSpy('getStatus').and.returnValue(of(mockStatus)),
      recordMovement: jasmine.createSpy('recordMovement').and.returnValue(of(mockMovement)),
      currentTheoreticalCash: signal(250.0)
    };

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as unknown as ReturnType<ToastController['create']> extends Promise<infer U> ? U : never));

    await TestBed.configureTestingModule({
      imports: [CashMovementModalComponent, getTranslocoTestingModule()],
      providers: [
        provideIonicAngular(),
        { provide: CashDrawerService, useValue: cashDrawerServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CashMovementModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with default movement type CASH_DROP and amount 50', () => {
    expect(component).toBeTruthy();
    expect(component.type).toBe('CASH_DROP');
    expect(component.amount).toBe(50.0);
    expect(component.currentTheoreticalCash).toBe(250.0);
  });

  it('should detect overdraw when withdraw amount exceeds drawer cash', () => {
    component.type = 'CASH_DROP';
    component.amount = 300.0;
    expect(component.isOverdraw).toBeTrue();
    expect(component.isValid).toBeFalse();

    // CASH_IN is never overdraw
    component.type = 'CASH_IN';
    expect(component.isOverdraw).toBeFalse();
  });

  it('should validate form completeness', () => {
    component.type = 'PAID_OUT';
    component.amount = 20.0;
    component.reason = '';
    expect(component.isValid).toBeFalse();

    component.reason = 'Cleaning supplies';
    expect(component.isValid).toBeTrue();
  });

  it('should select preset reason and set preset amount', () => {
    component.selectReason('Coffee beans delivery');
    expect(component.reason).toBe('Coffee beans delivery');

    component.setAmount(100.0);
    expect(component.amount).toBe(100.0);
  });

  it('should submit movement and dismiss on success', fakeAsync(() => {
    component.type = 'CASH_DROP';
    component.amount = 50.0;
    component.reason = 'Safe transfer';
    component.receiptReference = 'REC-123';

    component.submitMovement();
    tick();
    flushMicrotasks();

    expect(cashDrawerServiceSpy.recordMovement).toHaveBeenCalledWith({
      type: 'CASH_DROP',
      amount: 50.0,
      reason: 'Safe transfer',
      receiptReference: 'REC-123'
    });
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      movement: mockMovement
    });
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should handle API failure on movement recording', fakeAsync(() => {
    cashDrawerServiceSpy.recordMovement.and.returnValue(throwError(() => ({
      error: { message: 'Insufficient cash in drawer' }
    })));

    component.type = 'CASH_DROP';
    component.amount = 50.0;
    component.reason = 'Safe transfer';

    component.submitMovement();
    tick();
    flushMicrotasks();

    expect(component.isSubmitting).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      message: 'Insufficient cash in drawer',
      color: 'danger'
    }));
  }));

  it('should dismiss on cancel', () => {
    component.cancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null);
  });
});
