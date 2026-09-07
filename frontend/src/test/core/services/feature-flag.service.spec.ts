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

  it('should toggle all module types via setModule', () => {
    const modulesToTest = [
      EstablishmentModule.CUISINE_KDS,
      EstablishmentModule.EMPLOYEE_MANAGEMENT,
      EstablishmentModule.FLOOR_PLAN,
      EstablishmentModule.QR_CLIENT_ORDERING,
      EstablishmentModule.STOCK_TRACKING,
    ];

    for (const mod of modulesToTest) {
      service.setModule(mod, false).subscribe();
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('PUT');
      req.flush({ ...customModules, [mod]: false });
    }
  });

  it('should apply other presets: RESTAURANT, FOOD_TRUCK, NIGHTCLUB', () => {
    for (const preset of ['RESTAURANT', 'FOOD_TRUCK', 'NIGHTCLUB'] as const) {
      const expected = ESTABLISHMENT_PRESETS[preset];
      service.applyPreset(preset).subscribe(res => {
        expect(res).toEqual(expected);
      });
      const req = httpMock.expectOne(apiUrl);
      req.flush(expected);
    }
  });

  it('should return current modules when applying unknown preset', () => {
    service.applyPreset('UNKNOWN' as any).subscribe(res => {
      expect(res).toEqual(service.modules());
    });
    httpMock.expectNone(apiUrl);
  });

  it('should handle WebSocket direct object and invalid json gracefully', () => {
    // Direct object
    const directObj = { ...customModules, cuisineKds: false };
    wsSubject.next({ body: directObj });
    expect(service.cuisineKdsEnabled()).toBeFalse();

    // Invalid JSON string - should catch error without throwing
    expect(() => {
      wsSubject.next({ body: '{invalid json' });
    }).not.toThrow();
  });

  it('should fallback to defaults when loadModules fails', () => {
    service.loadModules().subscribe(res => {
      expect(res).toBeTruthy();
      expect(service.isLoaded()).toBeTrue();
    });

    const req = httpMock.expectOne(apiUrl);
    req.error(new ProgressEvent('error'));
  });

  it('should return true for unknown module in isModuleEnabled', () => {
    expect(service.isModuleEnabled('UNKNOWN_MODULE' as any)).toBeTrue();
  });
});
