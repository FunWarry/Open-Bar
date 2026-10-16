import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StartupReadinessService } from '../../../app/core/services/startup-readiness.service';
import { environment } from '../../../environments/environment';

describe('StartupReadinessService', () => {
  let service: StartupReadinessService;
  let httpMock: HttpTestingController;
  const probeUrl = `${environment.apiUrl}/setup/status`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StartupReadinessService]
    });
    service = TestBed.inject(StartupReadinessService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should immediately resolve readiness without waiting screen if backend is already online', () => {
    let result = false;
    service.initStartupCheck().subscribe(ready => {
      result = ready;
    });

    const req = httpMock.expectOne(probeUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-Silent-Probe')).toBe('true');
    req.flush({ initialized: true, userCount: 1 });

    expect(result).toBeTrue();
    expect(service.isStartingUp()).toBeFalse();
    expect(service.isBackendReady()).toBeTrue();
  });

  it('should activate waiting screen when backend is booting and poll until ready', () => {
    let result = false;
    service.initStartupCheck().subscribe(ready => {
      result = ready;
    });

    // Initial probe fails with 502 Bad Gateway
    const req1 = httpMock.expectOne(probeUrl);
    req1.flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });

    expect(result).toBeFalse();
    expect(service.isStartingUp()).toBeTrue();
    expect(service.isBackendReady()).toBeFalse();
    expect(service.attempts()).toBeGreaterThanOrEqual(1);

    // Manual or scheduled retry succeeds
    service.retryNow();
    const req2 = httpMock.expectOne(probeUrl);
    req2.flush({ initialized: true, userCount: 1 });

    expect(service.isStartingUp()).toBeFalse();
    expect(service.isBackendReady()).toBeTrue();
  });

  it('NON-REGRESSION: should NEVER reactivate startup waiting screen once backend was marked ready', () => {
    // 1. Initial boot succeeds
    service.initStartupCheck().subscribe();
    const req1 = httpMock.expectOne(probeUrl);
    req1.flush({ initialized: true });

    expect(service.isBackendReady()).toBeTrue();
    expect(service.isStartingUp()).toBeFalse();

    // 2. Subsequent call or backend crash simulated
    service.initStartupCheck().subscribe(ready => {
      expect(ready).toBeTrue();
    });

    // No HTTP probe should be emitted because backend has already been established
    httpMock.expectNone(probeUrl);
    expect(service.isStartingUp()).toBeFalse();

    // Calling retryNow when already ready is a no-op
    service.retryNow();
    httpMock.expectNone(probeUrl);
    expect(service.isStartingUp()).toBeFalse();
  });
});
