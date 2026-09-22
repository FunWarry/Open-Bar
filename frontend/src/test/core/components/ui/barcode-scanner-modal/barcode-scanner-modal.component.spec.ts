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

    const manualInput = fixture.nativeElement.querySelector('[data-testid="barcode-manual-input"]');
    const submitBtn = fixture.nativeElement.querySelector('[data-testid="barcode-manual-submit"]');
    const errorBanner = fixture.nativeElement.querySelector('[data-testid="scanner-camera-error"]');

    expect(manualInput).toBeTruthy();
    expect(submitBtn).toBeTruthy();
    expect(errorBanner).toBeTruthy();
  });

  it('toggles torch constraint when hardware torch capability is present', async () => {
    const mockTrack = {
      getCapabilities: () => ({ torch: true }),
      applyConstraints: jasmine.createSpy('applyConstraints').and.returnValue(Promise.resolve()),
      stop: jasmine.createSpy('stop')
    };
    const accessor = component as unknown as {
      mediaStream: { getVideoTracks: () => unknown[]; getTracks: () => unknown[] };
      checkTorchCapability: () => void;
    };
    accessor.mediaStream = {
      getVideoTracks: () => [mockTrack],
      getTracks: () => [mockTrack]
    };

    accessor.checkTorchCapability();
    expect(component.hasTorch()).toBeTrue();

    await component.toggleTorch();
    expect(mockTrack.applyConstraints).toHaveBeenCalledWith({
      advanced: [{ torch: true }]
    });
    expect(component.torchActive()).toBeTrue();
  });

  it('handles successful scan by stopping camera and dismissing with barcode', () => {
    const accessor = component as unknown as {
      handleSuccessfulScan: (code: string) => void;
      playSuccessBeep: () => void;
    };
    spyOn(accessor, 'playSuccessBeep');

    accessor.handleSuccessfulScan('3760049010012');

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      barcode: '3760049010012',
      cancelled: false
    });
  });

  it('stops media stream tracks and clears intervals on destroy', () => {
    const mockTrack = { stop: jasmine.createSpy('stop') };
    const accessor = component as unknown as {
      mediaStream: { getTracks: () => unknown[] } | null;
    };
    accessor.mediaStream = {
      getTracks: () => [mockTrack]
    };
    component.cameraActive.set(true);

    component.ngOnDestroy();

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(component.cameraActive()).toBeFalse();
  });
});
