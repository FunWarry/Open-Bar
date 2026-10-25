import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CashDrawerService } from '../../../app/core/services/cash-drawer.service';
import {
  CashDrawerOpenRequest,
  CashDrawerSession,
  CashDrawerStatus,
  CashMovement,
  CashMovementRequest,
  XReport
} from '../../../app/core/models/cash-drawer.model';
import { environment } from '../../../environments/environment';

describe('CashDrawerService', () => {
  let service: CashDrawerService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/cash-drawer`;

  const mockStatus: CashDrawerStatus = {
    isModuleEnabled: true,
    date: '2026-09-18',
    hasSession: true,
    isOpened: true,
    isClosed: false,
    startingFloat: 150.0,
    totalCashSales: 200.0,
    totalCashIn: 50.0,
    totalCashDrop: 30.0,
    totalPaidOut: 10.0,
    currentTheoreticalCash: 360.0,
    totalMovementsCount: 3
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CashDrawerService]
    });

    service = TestBed.inject(CashDrawerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize with default null status and false computed flags', () => {
    expect(service.status()).toBeNull();
    expect(service.isOpened()).toBeFalse();
    expect(service.isClosed()).toBeFalse();
    expect(service.startingFloat()).toBe(0);
    expect(service.currentTheoreticalCash()).toBe(0);
  });

  it('should retrieve status and update signals', () => {
    service.getStatus().subscribe(res => {
      expect(res).toEqual(mockStatus);
    });

    const req = httpMock.expectOne(`${baseUrl}/status`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStatus);

    expect(service.status()).toEqual(mockStatus);
    expect(service.isOpened()).toBeTrue();
    expect(service.isClosed()).toBeFalse();
    expect(service.startingFloat()).toBe(150.0);
    expect(service.currentTheoreticalCash()).toBe(360.0);
  });

  it('should refresh status asynchronously', () => {
    service.refreshStatus();

    const req = httpMock.expectOne(`${baseUrl}/status`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStatus);

    expect(service.status()).toEqual(mockStatus);
  });

  it('should submit openDrawer and refresh status', () => {
    const openReq: CashDrawerOpenRequest = {
      openingFloat: 150.0,
      notes: 'Morning open'
    };

    const mockSession: CashDrawerSession = {
      id: 1,
      sessionDate: '2026-09-18',
      openedAt: '2026-09-18T09:00:00',
      openingFloat: 150.0,
      status: 'OPEN',
      notes: 'Morning open'
    };

    service.openDrawer(openReq).subscribe(session => {
      expect(session).toEqual(mockSession);
    });

    const postReq = httpMock.expectOne(`${baseUrl}/open`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(openReq);
    postReq.flush(mockSession);

    // Should trigger getStatus() automatically
    const statusReq = httpMock.expectOne(`${baseUrl}/status`);
    statusReq.flush(mockStatus);
  });

  it('should record cash movement and refresh status', () => {
    const movReq: CashMovementRequest = {
      type: 'CASH_DROP',
      amount: 50.0,
      reason: 'Safe transfer'
    };

    const mockMovement: CashMovement = {
      id: 10,
      sessionId: 1,
      type: 'CASH_DROP',
      amount: 50.0,
      reason: 'Safe transfer',
      timestamp: '2026-09-18T14:00:00'
    };

    service.recordMovement(movReq).subscribe(res => {
      expect(res).toEqual(mockMovement);
    });

    const postReq = httpMock.expectOne(`${baseUrl}/movement`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(movReq);
    postReq.flush(mockMovement);

    // Should trigger getStatus() automatically
    const statusReq = httpMock.expectOne(`${baseUrl}/status`);
    statusReq.flush(mockStatus);
  });

  it('should get X-Report data', () => {
    const mockReport: XReport = {
      reportDate: '2026-09-18',
      generatedAt: '2026-09-18T15:00:00',
      generatedBy: 'manager',
      openingFloat: 150.0,
      totalRevenueHT: 800.0,
      totalRevenueTTC: 960.0,
      totalCashRevenue: 200.0,
      totalCashIn: 50.0,
      totalCashDrop: 30.0,
      totalPaidOut: 10.0,
      theoreticalCashInDrawer: 360.0,
      ventilationModePaiement: [],
      ventilationTva: [],
      movements: []
    };

    service.getXReport('2026-09-18').subscribe(report => {
      expect(report.totalRevenueTTC).toBe(960.0);
    });

    const req = httpMock.expectOne(`${baseUrl}/x-report?date=2026-09-18`);
    expect(req.request.method).toBe('GET');
    req.flush(mockReport);
  });

  it('should download X-Report PDF blob', () => {
    const dummyBlob = new Blob(['pdf-content'], { type: 'application/pdf' });

    service.downloadXReportPdf('2026-09-18').subscribe(blob => {
      expect(blob.size).toBe(dummyBlob.size);
    });

    const req = httpMock.expectOne(`${baseUrl}/x-report/pdf?date=2026-09-18`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(dummyBlob);
  });

  it('should print X-Report ticket', () => {
    service.printXReport('2026-09-18').subscribe(res => {
      expect(res.success).toBeTrue();
    });

    const req = httpMock.expectOne(`${baseUrl}/x-report/print?date=2026-09-18`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: 'Printed' });
  });

  it('should get movements with and without date parameter', () => {
    service.getMovements('2026-09-18').subscribe(res => {
      expect(res).toEqual([]);
    });
    const req1 = httpMock.expectOne(`${baseUrl}/movements?date=2026-09-18`);
    expect(req1.request.method).toBe('GET');
    req1.flush([]);

    service.getMovements().subscribe(res => {
      expect(res).toEqual([]);
    });
    const req2 = httpMock.expectOne(`${baseUrl}/movements`);
    expect(req2.request.method).toBe('GET');
    req2.flush([]);
  });

  it('should close drawer and refresh status', () => {
    const mockClosedSession: CashDrawerSession = {
      id: 1,
      sessionDate: '2026-09-18',
      openedAt: '2026-09-18T09:00:00',
      closedAt: '2026-09-18T23:00:00',
      openingFloat: 150.0,
      actualCash: 360.0,
      theoreticalCash: 360.0,
      cashVariance: 0.0,
      status: 'CLOSED'
    };

    service.closeDrawer({ countedCash: 360.0 }).subscribe(res => {
      expect(res).toEqual(mockClosedSession);
    });

    const closeReq = httpMock.expectOne(`${baseUrl}/close`);
    expect(closeReq.request.method).toBe('POST');
    closeReq.flush(mockClosedSession);

    const statusReq = httpMock.expectOne(`${baseUrl}/status`);
    statusReq.flush({ ...mockStatus, isOpened: false, isClosed: true });
  });

  it('should handle print audit slips for opening, closing, and cash movements', () => {
    service.printTillOpeningSlip(1).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const reqOpen = httpMock.expectOne(`${baseUrl}/session/1/print`);
    expect(reqOpen.request.method).toBe('POST');
    reqOpen.flush({ success: true });

    service.printTillClosingSlip(1).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const reqClose = httpMock.expectOne(`${baseUrl}/session/1/print-closing`);
    expect(reqClose.request.method).toBe('POST');
    reqClose.flush({ success: true });

    service.printCashMovementSlip(10).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const reqMov = httpMock.expectOne(`${baseUrl}/movements/10/print`);
    expect(reqMov.request.method).toBe('POST');
    reqMov.flush({ success: true });
  });

  it('should handle XReport without date parameter', () => {
    service.getXReport().subscribe(r => expect(r).toBeTruthy());
    const reqX = httpMock.expectOne(`${baseUrl}/x-report`);
    reqX.flush({ reportDate: '2026-09-18' });

    service.downloadXReportPdf().subscribe(b => expect(b).toBeTruthy());
    const reqPdf = httpMock.expectOne(`${baseUrl}/x-report/pdf`);
    reqPdf.flush(new Blob());

    service.printXReport().subscribe(p => expect(p.success).toBeTrue());
    const reqPr = httpMock.expectOne(`${baseUrl}/x-report/print`);
    reqPr.flush({ success: true });
  });
});
