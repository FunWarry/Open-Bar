import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barcodeOutline,
  cameraOutline,
  closeOutline,
  flashOutline,
  flashOffOutline,
  checkmarkOutline,
  keypadOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Result returned when barcode scanner modal closes.
 */
export interface BarcodeScannerResult {
  barcode?: string;
  cancelled: boolean;
}

/**
 * Universal dual-mode barcode and QR scanner modal.
 * Supports live camera stream barcode detection (QR, EAN-13, EAN-8, Code 128, UPC)
 * and manual barcode keyboard input fallback for devices without camera.
 */
@Component({
  selector: 'app-barcode-scanner-modal',
  templateUrl: './barcode-scanner-modal.component.html',
  styleUrls: ['./barcode-scanner-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    TranslocoPipe
  ]
})
export class BarcodeScannerModalComponent implements OnInit, OnDestroy {
  private readonly modalCtrl = inject(ModalController);

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  /** Modal title localization key or custom title */
  @Input() title = 'SCANNER.TITLE';

  /** Subtitle localization key or custom description */
  @Input() subtitle = 'SCANNER.SUBTITLE';

  /** Hint or target description (e.g. bottle, receipt) */
  @Input() itemHint?: string;

  manualCode = signal('');
  cameraActive = signal(false);
  cameraError = signal<string | null>(null);
  torchActive = signal(false);
  hasTorch = signal(false);
  isDetecting = signal(false);

  private mediaStream: MediaStream | null = null;
  private scanIntervalId: number | null = null;
  private barcodeDetector: any = null;

  constructor() {
    addIcons({
      barcodeOutline,
      cameraOutline,
      closeOutline,
      flashOutline,
      flashOffOutline,
      checkmarkOutline,
      keypadOutline,
      alertCircleOutline
    });
  }

  ngOnInit(): void {
    this.initBarcodeDetector();
    this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  /**
   * Initializes BarcodeDetector API if available in current browser.
   */
  private async initBarcodeDetector(): Promise<void> {
    if ('BarcodeDetector' in window) {
      try {
        const formats = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'];
        this.barcodeDetector = new (window as any).BarcodeDetector({ formats });
      } catch (e) {
        console.warn('BarcodeDetector format initialization failed:', e);
      }
    }
  }

  /**
   * Starts camera capture and detection loop.
   */
  async startCamera(): Promise<void> {
    this.cameraError.set(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        this.cameraError.set('SCANNER.CAMERA_UNAVAILABLE');
        return;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        await this.videoElement.nativeElement.play();
        this.cameraActive.set(true);
        this.checkTorchCapability();
        this.startDetectionLoop();
      }
    } catch (err: any) {
      console.warn('Could not access camera for scanning:', err);
      this.cameraError.set('SCANNER.CAMERA_PERMISSION_DENIED');
      this.cameraActive.set(false);
    }
  }

  /**
   * Checks if video track supports flashlight / torch.
   */
  private checkTorchCapability(): void {
    if (!this.mediaStream) return;
    const track = this.mediaStream.getVideoTracks()[0];
    if (track && 'getCapabilities' in track) {
      const capabilities = (track as any).getCapabilities();
      if (capabilities?.torch) {
        this.hasTorch.set(true);
      }
    }
  }

  /**
   * Toggles flashlight if hardware track allows it.
   */
  async toggleTorch(): Promise<void> {
    if (!this.mediaStream || !this.hasTorch()) return;
    const track = this.mediaStream.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      const nextState = !this.torchActive();
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        this.torchActive.set(nextState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  }

  /**
   * Periodically analyses video frame using BarcodeDetector API.
   */
  private startDetectionLoop(): void {
    if (!this.barcodeDetector) return;

    this.scanIntervalId = window.setInterval(async () => {
      if (!this.videoElement?.nativeElement || this.isDetecting()) return;

      const video = this.videoElement.nativeElement;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      try {
        this.isDetecting.set(true);
        const barcodes = await this.barcodeDetector.detect(video);
        if (barcodes?.length > 0) {
          const rawValue = barcodes[0].rawValue;
          if (rawValue && rawValue.trim().length > 0) {
            this.handleSuccessfulScan(rawValue.trim());
          }
        }
      } catch {
        // Continuous detection error, ignore frame
      } finally {
        this.isDetecting.set(false);
      }
    }, 250);
  }

  /**
   * Plays audio beep and dismisses modal with detected barcode.
   */
  private handleSuccessfulScan(barcode: string): void {
    this.playSuccessBeep();
    this.stopCamera();
    this.modalCtrl.dismiss({ barcode, cancelled: false } satisfies BarcodeScannerResult);
  }

  /**
   * Submits manual barcode input.
   */
  submitManual(): void {
    const code = this.manualCode().trim();
    if (!code) return;
    this.stopCamera();
    this.modalCtrl.dismiss({ barcode: code, cancelled: false } satisfies BarcodeScannerResult);
  }

  /**
   * Cancels and closes modal.
   */
  cancel(): void {
    this.stopCamera();
    this.modalCtrl.dismiss({ cancelled: true } satisfies BarcodeScannerResult);
  }

  /**
   * Stops video stream and detection timer.
   */
  private stopCamera(): void {
    if (this.scanIntervalId !== null) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive.set(false);
  }

  /**
   * Simple Web Audio API feedback beep upon scan.
   */
  private playSuccessBeep(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio autoplay policy might silently block
    }
  }
}
