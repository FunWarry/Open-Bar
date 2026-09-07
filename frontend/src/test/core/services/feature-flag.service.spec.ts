import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { FeatureFlagService } from '../../../app/core/services/feature-flag.service';
import {
  EstablishmentModule,
  EstablishmentModules,
  ESTABLISHMENT_PRESETS
} from '../../../app/core/models/establishment-module.model';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { environment } from '../../../environments/environment';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let httpMock: HttpTestingController;
  let wsMock: jasmine.SpyObj<WebSocketService>;
  let wsSubject: Subject<any>;
  const apiUrl = `${environment.apiUrl}/establishment/modules`;

  const customModules: EstablishmentModules = {
    cuisineKds: true,
    happyHour: false,
    employeeManagement: true,
    floorPlan: false,
    qrClientOrdering: true,
    stockTracking: true,
  };

  beforeEach(() => {
    wsSubject = new Subject<any>();
    wsMock = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsMock.watch.and.returnValue(wsSubject.asObservable());

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FeatureFlagService,
        { provide: WebSocketService, useValue: wsMock }
      ]
    });

    service = TestBed.inject(FeatureFlagService);
    httpMock = TestBed.inject(HttpTestingController);

    // Handle initial constructor loadModules call
    const initReq = httpMock.match(apiUrl);
    if (initReq.length > 0) {
      initReq[0].flush(customModules);
    }
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize and register WebSocket subscription on /topic/establishment/modules', () => {
    expect(wsMock.watch).toHaveBeenCalledWith('/topic/establishment/modules');
    expect(service.modules()).toEqual(customModules);
    expect(service.cuisineKdsEnabled()).toBeTrue();
    expect(service.happyHourEnabled()).toBeFalse();
  });

  it('should verify individual module capabilities via isModuleEnabled', () => {
    expect(service.isModuleEnabled(EstablishmentModule.CUISINE_KDS)).toBeTrue();
    expect(service.isModuleEnabled(EstablishmentModule.HAPPY_HOUR)).toBeFalse();
    expect(service.isModuleEnabled(EstablishmentModule.EMPLOYEE_MANAGEMENT)).toBeTrue();
    expect(service.isModuleEnabled(EstablishmentModule.FLOOR_PLAN)).toBeFalse();
    expect(service.isModuleEnabled(EstablishmentModule.QR_CLIENT_ORDERING)).toBeTrue();
    expect(service.isModuleEnabled(EstablishmentModule.STOCK_TRACKING)).toBeTrue();
  });

  it('should update modules via PUT /api/establishment/modules', () => {
    const updated: EstablishmentModules = {
      ...customModules,
      happyHour: true,
      floorPlan: true
    };

    service.updateModules(updated).subscribe(result => {
      expect(result).toEqual(updated);
      expect(service.modules()).toEqual(updated);
      expect(service.happyHourEnabled()).toBeTrue();
      expect(service.floorPlanEnabled()).toBeTrue();
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updated);
    req.flush(updated);
  });

  it('should toggle a single module via setModule', () => {
    service.setModule(EstablishmentModule.HAPPY_HOUR, true).subscribe(result => {
      expect(result.happyHour).toBeTrue();
      expect(service.happyHourEnabled()).toBeTrue();
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.happyHour).toBeTrue();
    req.flush({ ...customModules, happyHour: true });
  });

  it('should apply an establishment preset configuration', () => {
    const barPreset = ESTABLISHMENT_PRESETS['BAR'];

    service.applyPreset('BAR').subscribe(result => {
      expect(result).toEqual(barPreset);
      expect(service.modules()).toEqual(barPreset);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(barPreset);
    req.flush(barPreset);
  });

  it('should react to WebSocket message updates in real time', () => {
    const wsUpdate: EstablishmentModules = {
      cuisineKds: false,
      happyHour: true,
      employeeManagement: false,
      floorPlan: true,
      qrClientOrdering: false,
      stockTracking: false,
    };

    wsSubject.next({ body: JSON.stringify(wsUpdate) });

    expect(service.modules()).toEqual(wsUpdate);
    expect(service.cuisineKdsEnabled()).toBeFalse();
    expect(service.happyHourEnabled()).toBeTrue();
    expect(service.employeeManagementEnabled()).toBeFalse();
    expect(service.floorPlanEnabled()).toBeTrue();
    expect(service.qrClientOrderingEnabled()).toBeFalse();
    expect(service.stockTrackingEnabled()).toBeFalse();
  });
});
