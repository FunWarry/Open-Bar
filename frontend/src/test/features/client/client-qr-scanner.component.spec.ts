import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastController } from '@ionic/angular/standalone';
import { ClientQrScannerComponent } from '../../../app/features/client/client-qr-scanner/client-qr-scanner.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

/**
 * Unit test suite for ClientQrScannerComponent.
 */
describe('ClientQrScannerComponent', () => {
  let component: ClientQrScannerComponent;
  let fixture: ComponentFixture<ClientQrScannerComponent>;
  let router: Router;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [
        ClientQrScannerComponent,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ClientQrScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with scan mode active', () => {
    expect(component.mode()).toBe('scan');
  });

  it('should switch mode when setMode is called', () => {
    component.setMode('manual');
    expect(component.mode()).toBe('manual');
    expect(component.isCameraActive()).toBeFalse();

    component.setMode('scan');
    expect(component.mode()).toBe('scan');
  });

  // --- Table Number Parsing ---

  it('extractTableNumber should extract table number from valid URL parameter', () => {
    const tableNum = component.extractTableNumber('https://openbar.local/client/commande?table=7');
    expect(tableNum).toBe(7);
  });

  it('extractTableNumber should extract table number from direct numeric string', () => {
    expect(component.extractTableNumber('4')).toBe(4);
    expect(component.extractTableNumber('Table 12')).toBe(12);
    expect(component.extractTableNumber('table_3')).toBe(3);
  });

  it('extractTableNumber should return null for invalid non-numeric strings', () => {
    expect(component.extractTableNumber('')).toBeNull();
    expect(component.extractTableNumber('invalid_string')).toBeNull();
  });

  // --- Scanned QR Code Handling ---

  it('handleScannedCode should navigate to /client/commande when valid table QR is scanned', () => {
    spyOn(router, 'navigate');
    component.handleScannedCode('https://openbar.local/client/commande?table=5');

    expect(router.navigate).toHaveBeenCalledWith(
      ['/client/commande'],
      { queryParams: { table: 5 } }
    );
  });

  it('handleScannedCode should show toast warning when invalid QR is scanned', fakeAsync(() => {
    component.handleScannedCode('invalid_payload_without_digits');
    tick();
    flushMicrotasks();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'warning', position: 'top' })
    );
  }));

  // --- Manual Submission ---

  it('onManualSubmit should navigate when manual table form is valid', () => {
    spyOn(router, 'navigate');
    component.manualForm.controls['tableNumber'].setValue(9);
    component.onManualSubmit();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/client/commande'],
      { queryParams: { table: 9 } }
    );
  });

  it('onManualSubmit should not navigate when manual table form is invalid', () => {
    spyOn(router, 'navigate');
    component.manualForm.controls['tableNumber'].setValue('');
    component.onManualSubmit();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  // --- Simulation ---

  it('simulateScan should extract table and navigate', () => {
    spyOn(router, 'navigate');
    component.simulateScan(15);

    expect(router.navigate).toHaveBeenCalledWith(
      ['/client/commande'],
      { queryParams: { table: 15 } }
    );
  });
});
