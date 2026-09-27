import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { IMessage } from '@stomp/stompjs';
import { RouletteService } from '../../../app/core/services/roulette.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import {
  RouletteBroadcastSpinRequest,
  RouletteEvent,
  RoulettePin,
  RoulettePinVerification,
  RoulettePublicConfig,
  RouletteSpinRequest,
  RouletteSpinResult,
  RouletteWheelSector
} from '../../../app/core/models/roulette.model';
import { environment } from '../../../environments/environment';

describe('RouletteService', () => {
  let service: RouletteService;
  let httpMock: HttpTestingController;
  let wsMock: jasmine.SpyObj<WebSocketService>;
  let wsSubject: Subject<IMessage>;

  const publicApiUrl = `${environment.apiUrl}/api/public/roulette`;
  const adminApiUrl = `${environment.apiUrl}/api/roulette`;

  const mockSector: RouletteWheelSector = {
    id: 1,
    label: 'Mojito',
    prizeType: 'COCKTAIL',
    cocktailId: 10,
    cocktailNom: 'Mojito',
    colorHex: '#10b981',
    iconName: 'leaf-outline',
    probabilityWeight: 2,
    active: true,
    displayOrder: 0
  };

  const mockPublicConfig: RoulettePublicConfig = {
    enabled: true,
    priceCocktail: 7.5,
    priceMocktail: 5.5,
    stockBias: 'BALANCED',
    soundProfile: 'CSGO',
    sectors: [mockSector],
    availableCategories: ['ALL', 'GIN', 'RUM']
  };

  const mockSpinResult: RouletteSpinResult = {
    sectorId: 1,
    winningIndex: 0,
    prizeType: 'COCKTAIL',
    cocktailId: 10,
    cocktailNom: 'Mojito',
    cocktailDescription: 'Fresh mint and rum',
    prix: 7.5,
    isMysteryDrink: true,
    addedToCart: false,
    activeSectors: [mockSector]
  };

  beforeEach(() => {
    wsSubject = new Subject<IMessage>();
    wsMock = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsMock.watch.and.returnValue(wsSubject.asObservable());

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        RouletteService,
        { provide: WebSocketService, useValue: wsMock }
      ]
    });

    service = TestBed.inject(RouletteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPublicConfig', () => {
    it('should retrieve public roulette config', () => {
      let result: RoulettePublicConfig | undefined;
      service.getPublicConfig().subscribe(res => (result = res));

      const req = httpMock.expectOne(`${publicApiUrl}/config`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPublicConfig);

      expect(result).toEqual(mockPublicConfig);
      expect(result?.enabled).toBeTrue();
      expect(result?.sectors.length).toBe(1);
    });
  });

  describe('spin', () => {
    it('should execute a customer spin request', () => {
      const spinReq: RouletteSpinRequest = {
        tableId: 5,
        guestSessionId: 'sess-1',
        guestName: 'Alex',
        autoAddToCart: true
      };

      let result: RouletteSpinResult | undefined;
      service.spin(spinReq).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${publicApiUrl}/spin`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(spinReq);
      req.flush(mockSpinResult);

      expect(result).toEqual(mockSpinResult);
      expect(result?.cocktailNom).toBe('Mojito');
    });
  });

  describe('triggerBroadcast', () => {
    it('should trigger broadcast spin on secondary screens', () => {
      const broadcastReq: RouletteBroadcastSpinRequest = {
        mode: 'RANDOM',
        autoAddToCart: false
      };

      let result: RouletteSpinResult | undefined;
      service.triggerBroadcast(broadcastReq).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${adminApiUrl}/trigger-broadcast`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(broadcastReq);
      req.flush(mockSpinResult);

      expect(result?.sectorId).toBe(1);
    });
  });

  describe('PIN management', () => {
    it('should verify display PIN', () => {
      let outcome: RoulettePinVerification | undefined;
      service.verifyDisplayPin('7777').subscribe(res => (outcome = res));

      const req = httpMock.expectOne(`${publicApiUrl}/verify-pin`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ pin: '7777' });
      req.flush({ valid: true });

      expect(outcome?.valid).toBeTrue();
    });

    it('should get display PIN', () => {
      let pinRes: RoulettePin | undefined;
      service.getDisplayPin().subscribe(res => (pinRes = res));

      const req = httpMock.expectOne(`${adminApiUrl}/pin`);
      expect(req.request.method).toBe('GET');
      req.flush({ pin: '7777' });

      expect(pinRes?.pin).toBe('7777');
    });

    it('should update display PIN', () => {
      let updated: RoulettePin | undefined;
      service.updateDisplayPin('1234').subscribe(res => (updated = res));

      const req = httpMock.expectOne(`${adminApiUrl}/pin`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ pin: '1234' });
      req.flush({ pin: '1234' });

      expect(updated?.pin).toBe('1234');
    });

    it('should regenerate display PIN', () => {
      let regenerated: RoulettePin | undefined;
      service.regenerateDisplayPin().subscribe(res => (regenerated = res));

      const req = httpMock.expectOne(`${adminApiUrl}/pin/regenerate`);
      expect(req.request.method).toBe('POST');
      req.flush({ pin: '9876' });

      expect(regenerated?.pin).toBe('9876');
    });
  });

  describe('Sector CRUD', () => {
    it('should fetch all sectors', () => {
      let sectors: RouletteWheelSector[] | undefined;
      service.getAllSectors().subscribe(res => (sectors = res));

      const req = httpMock.expectOne(`${adminApiUrl}/sectors`);
      expect(req.request.method).toBe('GET');
      req.flush([mockSector]);

      expect(sectors?.length).toBe(1);
    });

    it('should create a new sector', () => {
      const newSector: Partial<RouletteWheelSector> = { label: 'Daiquiri', prizeType: 'COCKTAIL' };
      let created: RouletteWheelSector | undefined;

      service.createSector(newSector).subscribe(res => (created = res));

      const req = httpMock.expectOne(`${adminApiUrl}/sectors`);
      expect(req.request.method).toBe('POST');
      req.flush({ ...mockSector, id: 2, label: 'Daiquiri' });

      expect(created?.label).toBe('Daiquiri');
    });

    it('should update an existing sector', () => {
      const updateData: Partial<RouletteWheelSector> = { label: 'Mojito Royal' };
      let updated: RouletteWheelSector | undefined;

      service.updateSector(1, updateData).subscribe(res => (updated = res));

      const req = httpMock.expectOne(`${adminApiUrl}/sectors/1`);
      expect(req.request.method).toBe('PUT');
      req.flush({ ...mockSector, label: 'Mojito Royal' });

      expect(updated?.label).toBe('Mojito Royal');
    });

    it('should delete a sector', () => {
      let completed = false;
      service.deleteSector(1).subscribe(() => (completed = true));

      const req = httpMock.expectOne(`${adminApiUrl}/sectors/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(completed).toBeTrue();
    });
  });

  describe('watchEvents', () => {
    it('should subscribe to STOMP topic /topic/roulette/events', () => {
      let receivedEvent: RouletteEvent | undefined;
      service.watchEvents().subscribe(ev => (receivedEvent = ev));

      expect(wsMock.watch).toHaveBeenCalledWith('/topic/roulette/events');

      const mockEvent: RouletteEvent = {
        eventType: 'SPIN_TRIGGERED',
        eventId: 'evt-1',
        tableNumero: 3,
        durationMs: 5000,
        soundProfile: 'CSGO',
        timestamp: new Date().toISOString()
      };

      wsSubject.next({ body: JSON.stringify(mockEvent) } as IMessage);
      expect(receivedEvent).toEqual(mockEvent);
    });
  });
});
