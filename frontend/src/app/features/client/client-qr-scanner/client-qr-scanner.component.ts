import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ToastController } from '@ionic/angular/standalone';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';

/**
 * Client QR Code Scanner Component enabling public customers to scan a table QR Code
 * via live camera feed or enter their table number manually.
 *
 * <p>Aligned with Figma Client QR Scanner specifications ({@code 636:988}).</p>
 *
 * <p>Features:</p>
 * <ul>
 *   <li>Live camera viewfinder with overlay framing animation</li>
 *   <li>Automatic QR Code detection using native {@code BarcodeDetector} API with URL/table parsing</li>
 *   <li>Fallback manual table number entry form</li>
 *   <li>Camera permission error handling with user-friendly toast guidance</li>
 * </ul>
 */
@Component({
  selector: 'app-client-qr-scanner',
  templateUrl: './client-qr-scanner.component.html',
  styleUrls: ['./client-qr-scanner.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslocoModule,
    InputFieldComponent,
    ActionButtonComponent
  ]
})
export class ClientQrScannerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  /** Form for manual table number input. */
  manualForm: FormGroup;

  /** Mode toggle: 'scan' for live camera view, 'manual' for table number input. */
  mode = signal<'scan' | 'manual'>('scan');

  /** Whether the camera stream is currently active and playing. */
  isCameraActive = signal<boolean>(false);

  /** Error state if camera permission is denied or unavailable. */
  cameraError = signal<string | null>(null);

  /** Active MediaStream reference for cleanup on component destroy. */
  private mediaStream: MediaStream | null = null;

  /** Timer ID for barcode scanning loop. */
  private scanIntervalId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService
  ) {
    this.manualForm = this.fb.group({
      tableNumber: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    // Start camera feed on init if mode is 'scan'
    if (this.mode() === 'scan') {
      void this.startCamera();
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  /**
   * Switches active scanner mode between live camera scanning and manual entry.
   *
   * @param targetMode The mode to activate.
   */
  setMode(targetMode: 'scan' | 'manual'): void {
    this.mode.set(targetMode);
    if (targetMode === 'scan') {
      void this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  /**
   * Requests camera media stream and attaches it to the video element.
   * Starts real-time barcode scanning loop.
   */
  async startCamera(): Promise<void> {
    this.cameraError.set(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('CAMERA_NOT_SUPPORTED');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        await this.videoElement.nativeElement.play();
        this.isCameraActive.set(true);
        this.startBarcodeDetection();
      }
    } catch (err: any) {
      this.isCameraActive.set(false);
      const errKey = err?.name === 'NotAllowedError' ? 'CLIENT_QR.ERR_PERMISSION_DENIED' : 'CLIENT_QR.ERR_CAMERA_UNAVAILABLE';
      this.cameraError.set(errKey);
    }
  }

  /**
   * Stops active camera stream tracks and clears scanning timers.
   */
  stopCamera(): void {
    if (this.scanIntervalId !== null) {
      window.clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }

    this.isCameraActive.set(false);
  }

  /**
   * Initiates periodic barcode detection loop using browser {@code BarcodeDetector} API if supported.
   */
  private startBarcodeDetection(): void {
    if (!('BarcodeDetector' in window)) {
      return;
    }

    try {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      this.scanIntervalId = window.setInterval(async () => {
        if (!this.videoElement?.nativeElement || !this.isCameraActive()) return;

        try {
          const barcodes = await barcodeDetector.detect(this.videoElement.nativeElement);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            this.handleScannedCode(rawValue);
          }
        } catch {
          // Frame detection error safely ignored
        }
      }, 500);
    } catch {
      // BarcodeDetector initialization error safely ignored
    }
  }

  /**
   * Processes a scanned QR Code payload string or URL and redirects to client order page.
   *
   * @param code The scanned raw QR Code content.
   */
  handleScannedCode(code: string): void {
    const tableNum = this.extractTableNumber(code);
    if (tableNum !== null) {
      this.stopCamera();
      void this.router.navigate(['/client/commande'], { queryParams: { table: tableNum } });
    } else {
      void this.showToast(this.transloco.translate('CLIENT_QR.ERR_INVALID_QR'), 'warning');
    }
  }

  /**
   * Extracts table number from scanned URL or numeric text payload.
   * Supports format: "https://domain.com/client/commande?table=4" or raw "4".
   *
   * @param payload Scanned string payload.
   * @returns Table number integer or null if invalid.
   */
  extractTableNumber(payload: string): number | null {
    if (!payload) return null;

    // Check if URL with table parameter
    try {
      const url = new URL(payload, 'http://localhost');
      const paramTable = url.searchParams.get('table');
      if (paramTable && !Number.isNaN(Number(paramTable))) {
        return Number(paramTable);
      }
    } catch {
      // Not a valid URL, try direct numeric parsing
    }

    // Direct numeric string or "table 4" / "Table-4" pattern
    const match = /(?:table[_\s-]*)?(\d+)/i.exec(payload);
    if (match?.[1]) {
      return Number(match[1]);
    }

    return null;
  }

  /**
   * Handles manual table number form submission.
   */
  onManualSubmit(): void {
    if (!this.manualForm.valid) return;
    const tableNum = Number(this.manualForm.value.tableNumber);
    void this.router.navigate(['/client/commande'], { queryParams: { table: tableNum } });
  }

  /**
   * Simulates a successful QR scan for testing or environments without camera.
   *
   * @param mockTable Number of table to simulate.
   */
  simulateScan(mockTable: number): void {
    this.handleScannedCode(`https://openbar.local/client/commande?table=${mockTable}`);
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
