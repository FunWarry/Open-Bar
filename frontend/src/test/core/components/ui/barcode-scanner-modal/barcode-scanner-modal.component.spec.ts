import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../../../transloco-testing.module';
import {
  BarcodeScannerModalComponent,
  BarcodeScannerResult
} from '../../../../../app/core/components/ui/barcode-scanner-modal/barcode-scanner-modal.component';

describe('BarcodeScannerModalComponent', () => {
  let component: BarcodeScannerModalComponent;
  let fixture: ComponentFixture<BarcodeScannerModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [
        BarcodeScannerModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BarcodeScannerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the barcode scanner modal component', () => {
    expect(component).toBeTruthy();
  });

  it('submits manual barcode when valid code is entered', () => {
    component.manualCode.set('3123456789012');
    component.submitManual();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      barcode: '3123456789012',
      cancelled: false
    } satisfies BarcodeScannerResult);
  });

  it('does not submit manual barcode if input is empty or whitespace only', () => {
    component.manualCode.set('   ');
    component.submitManual();

    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
  });

  it('dismisses with cancelled = true when cancel() is called', () => {
    component.cancel();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      cancelled: true
    } satisfies BarcodeScannerResult);
  });

  it('displays fallback input when camera is unavailable or denied', () => {
    component.cameraError.set('SCANNER.CAMERA_PERMISSION_DENIED');
    fixture.detectChanges();

    const manualInput = fixture.nativeElement.querySelector('[data-testid="scanner-manual-input"]');
    const submitBtn = fixture.nativeElement.querySelector('[data-testid="scanner-submit-btn"]');

    expect(manualInput).toBeTruthy();
    expect(submitBtn).toBeTruthy();
  });
});
