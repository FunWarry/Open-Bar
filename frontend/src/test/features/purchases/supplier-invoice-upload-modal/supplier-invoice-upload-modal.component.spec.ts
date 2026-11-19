import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';
import { SupplierInvoiceUploadModalComponent } from '../../../../app/features/purchases/supplier-invoice-upload-modal/supplier-invoice-upload-modal.component';
import { SupplierInvoiceService } from '../../../../app/core/services/supplier-invoice.service';
import {
  SupplierInvoice,
  SupplierInvoiceUploadResponse
} from '../../../../app/core/models/supplier-invoice.model';

describe('SupplierInvoiceUploadModalComponent', () => {
  let component: SupplierInvoiceUploadModalComponent;
  let fixture: ComponentFixture<SupplierInvoiceUploadModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;
  let invoiceServiceSpy: jasmine.SpyObj<SupplierInvoiceService>;

  const mockInvoice: SupplierInvoice = {
    id: 1,
    invoiceNumber: 'INV-2026-001',
    supplierId: 10,
    supplierName: 'Metro Cash & Carry',
    invoiceDate: '2026-03-15',
    dueDate: '2026-04-15',
    totalHt: 250.0,
    totalVat: 50.0,
    totalTtc: 300.0,
    currency: 'EUR',
    status: 'PENDING_REVIEW',
    format: 'FACTUR_X',
    profile: 'EN 16931',
    fileName: 'factur-x.xml',
    fileChecksum: 'abc12345',
    legalComplianceStatus: 'COMPLIANT',
    createdAt: '2026-03-15T10:00:00',
    updatedAt: '2026-03-15T10:00:00',
    items: []
  };

  const mockUploadResponse: SupplierInvoiceUploadResponse = {
    invoice: mockInvoice,
    duplicate: false,
    message: 'Invoice parsed successfully',
    warnings: []
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));
    invoiceServiceSpy = jasmine.createSpyObj('SupplierInvoiceService', ['uploadInvoice']);

    await TestBed.configureTestingModule({
      imports: [
        SupplierInvoiceUploadModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: SupplierInvoiceService, useValue: invoiceServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierInvoiceUploadModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should accept valid PDF and XML files', () => {
    const validFile = new File(['dummy content'], 'invoice.pdf', { type: 'application/pdf' });
    const event = {
      target: {
        files: [validFile]
      }
    } as unknown as Event;

    component.onFileSelected(event);
    expect(component.selectedFile()).toBe(validFile);
  });

  it('should reject non-PDF and non-XML files with a warning toast', async () => {
    const invalidFile = new File(['dummy content'], 'invoice.txt', { type: 'text/plain' });
    const event = {
      target: {
        files: [invalidFile]
      }
    } as unknown as Event;

    component.onFileSelected(event);
    expect(component.selectedFile()).toBeNull();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should handle drag and drop events correctly', () => {
    const dragEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation')
    } as unknown as DragEvent;

    component.onDragOver(dragEvent);
    expect(component.isDragging()).toBeTrue();

    component.onDragLeave(dragEvent);
    expect(component.isDragging()).toBeFalse();

    const validXml = new File(['<xml></xml>'], 'facturx.xml', { type: 'application/xml' });
    const dropEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      dataTransfer: {
        files: [validXml]
      }
    } as unknown as DragEvent;

    component.onDrop(dropEvent);
    expect(component.isDragging()).toBeFalse();
    expect(component.selectedFile()).toBe(validXml);
  });

  it('should clear selected file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    component.selectedFile.set(file);
    component.clearFile();

    expect(component.selectedFile()).toBeNull();
    expect(component.uploadResult()).toBeNull();
  });

  it('should upload and parse selected invoice successfully', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    component.selectedFile.set(file);
    invoiceServiceSpy.uploadInvoice.and.returnValue(of(mockUploadResponse));

    component.uploadAndParse();

    expect(component.isUploading()).toBeFalse();
    expect(component.uploadResult()).toEqual(mockUploadResponse);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should notify user when uploaded file is a duplicate invoice', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    component.selectedFile.set(file);
    invoiceServiceSpy.uploadInvoice.and.returnValue(of({
      ...mockUploadResponse,
      duplicate: true
    }));

    component.uploadAndParse();

    expect(component.isUploading()).toBeFalse();
    expect(component.uploadResult()?.duplicate).toBeTrue();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should handle upload errors gracefully', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    component.selectedFile.set(file);
    invoiceServiceSpy.uploadInvoice.and.returnValue(throwError(() => ({ error: { message: 'Corrupt file' } })));

    component.uploadAndParse();

    expect(component.isUploading()).toBeFalse();
    expect(component.uploadResult()).toBeNull();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should dismiss modal on finish with parsed invoice', () => {
    component.uploadResult.set(mockUploadResponse);
    component.finish();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(mockInvoice, 'confirm');
  });

  it('should dismiss modal on cancel', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });
});
