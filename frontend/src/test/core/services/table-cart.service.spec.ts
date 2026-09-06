import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { IMessage } from '@stomp/stompjs';
import { TableCartService } from '../../../app/core/services/table-cart.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { TableCart, TableCartItem } from '../../../app/core/models/table-cart.model';
import { environment } from '../../../environments/environment';

describe('TableCartService', () => {
  let service: TableCartService;
  let httpMock: HttpTestingController;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;
  let stompMessages$: Subject<IMessage>;

  const baseUrl = `${environment.apiUrl}/public/tables`;

  const sampleItems: TableCartItem[] = [
    {
      id: 1,
      guestSessionId: 'guest-me',
      guestName: 'Alex',
      cocktailId: 10,
      cocktailNom: 'Mojito',
      quantite: 2,
      prixUnitaire: 9.5,
      totalLigne: 19.0,
      notes: 'Less ice'
    },
    {
      id: 2,
      guestSessionId: 'guest-other',
      guestName: 'Sam',
      cocktailId: 11,
      cocktailNom: 'Negroni',
      quantite: 1,
      prixUnitaire: 11.0,
      totalLigne: 11.0
    }
  ];

  const sampleCart: TableCart = {
    tableId: 5,
    status: 'OPEN',
    items: sampleItems,
    totalItems: 3,
    totalPrice: 30.0,
    updatedAt: '2026-09-05T19:00:00'
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('openbar_guest_session_id', 'guest-me');
    localStorage.setItem('openbar_guest_name', 'Alex');

    stompMessages$ = new Subject<IMessage>();
    mockWebSocketService = jasmine.createSpyObj<WebSocketService>('WebSocketService', [
      'connectAsGuest',
      'watch',
      'disconnect'
    ]);
    mockWebSocketService.watch.and.returnValue(stompMessages$);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TableCartService,
        { provide: WebSocketService, useValue: mockWebSocketService }
      ]
    });

    service = TestBed.inject(TableCartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.cart()).toBeNull();
    expect(service.hasGuestName()).toBeTrue();
    expect(service.getGuestName()).toBe('Alex');
  });

  it('getOrCreateGuestSessionId should return existing or generate fresh uuid', () => {
    expect(service.getOrCreateGuestSessionId()).toBe('guest-me');

    localStorage.removeItem('openbar_guest_session_id');
    const newId = service.getOrCreateGuestSessionId();
    expect(newId).toBeTruthy();
    expect(localStorage.getItem('openbar_guest_session_id')).toBe(newId);
  });

  it('setGuestName should update local storage and reactive signal', () => {
    service.setGuestName('Camille');
    expect(localStorage.getItem('openbar_guest_name')).toBe('Camille');
    expect(service.currentGuestName()).toBe('Camille');
    expect(service.hasGuestName()).toBeTrue();
  });

  it('initCart should connect as guest, fetch cart via GET, and handle real-time STOMP updates', () => {
    service.initCart(5, 'session-token-xyz').subscribe((cart) => {
      expect(cart).toEqual(sampleCart);
      expect(service.cart()).toEqual(sampleCart);
      expect(service.loading()).toBeFalse();
    });

    expect(mockWebSocketService.connectAsGuest).toHaveBeenCalledWith('guest-me', 'session-token-xyz');
    expect(mockWebSocketService.watch).toHaveBeenCalledWith('/topic/tables/5/cart');

    const req = httpMock.expectOne(`${baseUrl}/5/cart`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleCart);

    // Verify computed signals
    expect(service.totalItems()).toBe(3);
    expect(service.totalPrice()).toBe(30.0);
    const groups = service.guestGroups();
    expect(groups).toHaveSize(2);
    expect(groups[0].guestName).toBe('Alex');
    expect(groups[0].isCurrentGuest).toBeTrue();
    expect(groups[0].totalItems).toBe(2);
    expect(groups[0].totalPrice).toBe(19.0);

    expect(groups[1].guestName).toBe('Sam');
    expect(groups[1].isCurrentGuest).toBeFalse();
    expect(groups[1].totalItems).toBe(1);
    expect(groups[1].totalPrice).toBe(11.0);

    // Simulate STOMP broadcast from another guest adding an item
    const updatedCart: TableCart = {
      ...sampleCart,
      totalItems: 4,
      totalPrice: 41.0
    };
    stompMessages$.next({
      body: JSON.stringify(updatedCart)
    } as IMessage);

    expect(service.cart()?.totalItems).toBe(4);
    expect(service.totalItems()).toBe(4);
  });

  it('addItem should send POST request and update cart signal', () => {
    (service as any).cart.set(sampleCart);
    const itemReq = {
      guestSessionId: 'guest-me',
      guestName: 'Alex',
      cocktailId: 10,
      quantite: 1
    };
    const newItem: TableCartItem = {
      id: 99,
      guestSessionId: 'guest-me',
      guestName: 'Alex',
      cocktailId: 10,
      cocktailNom: 'Gin Tonic',
      quantite: 1,
      prixUnitaire: 9.0,
      totalLigne: 9.0
    };

    service.addItem(5, itemReq).subscribe((res) => {
      expect(res).toEqual(newItem);
      expect(service.cart()?.items).toContain(newItem);
    });

    const req = httpMock.expectOne(`${baseUrl}/5/cart/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(itemReq);
    req.flush(newItem);
  });

  it('updateItem should send PUT request and update cart signal', () => {
    (service as any).cart.set(sampleCart);
    const updateReq = { quantite: 3, notes: 'Extra lime' };
    const updatedItem: TableCartItem = {
      ...sampleCart.items[0],
      quantite: 3,
      totalLigne: 30.0,
      notes: 'Extra lime'
    };

    service.updateItem(5, 1, updateReq).subscribe((res) => {
      expect(res).toEqual(updatedItem);
      expect(service.cart()?.items[0].quantite).toBe(3);
    });

    const req = httpMock.expectOne(`${baseUrl}/5/cart/items/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateReq);
    req.flush(updatedItem);
  });

  it('removeItem should send DELETE request with guestSessionId param', () => {
    (service as any).cart.set(sampleCart);
    service.removeItem(5, 1).subscribe(() => {
      expect(service.cart()?.items.find((i: TableCartItem) => i.id === 1)).toBeUndefined();
    });

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/5/cart/items/1` && r.params.get('guestSessionId') === 'guest-me');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('clearCart should send DELETE request to clear table cart', () => {
    (service as any).cart.set(sampleCart);
    service.clearCart(5).subscribe(() => {
      expect(service.cart()?.items.length).toBe(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/5/cart`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });


  it('submitCart should send POST request and toggle submitting state', () => {
    const submitReq = {
      guestSessionId: 'guest-me',
      guestName: 'Alex',
      sessionToken: 'token-123',
      notes: 'Group order'
    };
    const mockOrderResponse = { commandeId: 42, trackingToken: 'trk-42' };

    service.submitCart(5, submitReq).subscribe((res) => {
      expect(res).toEqual(mockOrderResponse);
      expect(service.submitting()).toBeFalse();
    });

    expect(service.submitting()).toBeTrue();

    const req = httpMock.expectOne(`${baseUrl}/5/cart/submit`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(submitReq);
    req.flush(mockOrderResponse);
  });

  it('submitCart should reset submitting flag on error', () => {
    const submitReq = {
      guestSessionId: 'guest-me',
      guestName: 'Alex'
    };

    service.submitCart(5, submitReq).subscribe({
      error: () => {
        expect(service.submitting()).toBeFalse();
      }
    });

    expect(service.submitting()).toBeTrue();
    const req = httpMock.expectOne(`${baseUrl}/5/cart/submit`);
    req.flush({ message: 'Submission failed' }, { status: 500, statusText: 'Server Error' });
  });

  it('hasGuestName should return false when guest name is missing or empty', () => {
    localStorage.removeItem('openbar_guest_name');
    expect(service.hasGuestName()).toBeFalse();
    service.setGuestName('   ');
    expect(service.hasGuestName()).toBeFalse();
  });

  it('initCart should handle invalid JSON payload from STOMP gracefully', () => {
    service.initCart(5).subscribe();
    httpMock.expectOne(`${baseUrl}/5/cart`).flush(sampleCart);

    // Send malformed message
    stompMessages$.next({ body: 'invalid-json' } as IMessage);
    // Should retain previous cart without crashing
    expect(service.cart()).toEqual(sampleCart);
  });

  it('initCart should handle HTTP failure and reset loading flag', () => {
    service.initCart(5).subscribe({
      error: () => {
        expect(service.loading()).toBeFalse();
      }
    });

    expect(service.loading()).toBeTrue();
    const req = httpMock.expectOne(`${baseUrl}/5/cart`);
    req.flush('Error', { status: 404, statusText: 'Not Found' });
  });

  it('addItem should initialize cart if current cart is null', () => {
    (service as any).cart.set(null);
    const newItem: TableCartItem = {
      id: 3,
      guestSessionId: 'guest-me',
      guestName: 'Alex',
      cocktailId: 12,
      cocktailNom: 'Cosmopolitan',
      quantite: 1,
      prixUnitaire: 10.0,
      totalLigne: 10.0
    };

    service.addItem(5, {
      guestSessionId: 'guest-me',
      guestName: 'Alex',
      cocktailId: 12,
      quantite: 1
    }).subscribe((res) => {
      expect(res).toEqual(newItem);
      expect(service.cart()?.items.length).toBe(1);
      expect(service.totalPrice()).toBe(10.0);
    });

    const req = httpMock.expectOne(`${baseUrl}/5/cart/items`);
    req.flush(newItem);
  });

  it('updateItem and removeItem should handle null cart safely', () => {
    (service as any).cart.set(null);
    service.updateItem(5, 99, { guestSessionId: 'guest-me', quantite: 2 }).subscribe();
    const reqUpdate = httpMock.expectOne(`${baseUrl}/5/cart/items/99`);
    reqUpdate.flush({ id: 99, quantite: 2 });
    expect(service.cart()).toBeNull();

    service.removeItem(5, 99).subscribe();
    const reqRemove = httpMock.expectOne((r) => r.url === `${baseUrl}/5/cart/items/99`);
    reqRemove.flush(null);
    expect(service.cart()).toBeNull();

    service.clearCart(5).subscribe();
    const reqClear = httpMock.expectOne(`${baseUrl}/5/cart`);
    reqClear.flush(null);
    expect(service.cart()).toBeNull();
  });

  it('guestGroups should sort current guest first, then other guests alphabetically', () => {
    const multiGuestCart: TableCart = {
      tableId: 5,
      status: 'OPEN',
      items: [
        {
          id: 1,
          guestSessionId: 'guest-z',
          guestName: 'Zoe',
          cocktailId: 1,
          cocktailNom: 'Drink 1',
          quantite: 1,
          prixUnitaire: 5.0,
          totalLigne: 5.0
        },
        {
          id: 2,
          guestSessionId: 'guest-me',
          guestName: 'Alex',
          cocktailId: 2,
          cocktailNom: 'Drink 2',
          quantite: 2,
          prixUnitaire: 5.0,
          totalLigne: 10.0
        },
        {
          id: 3,
          guestSessionId: 'guest-b',
          guestName: 'Ben',
          cocktailId: 3,
          cocktailNom: 'Drink 3',
          quantite: 1,
          prixUnitaire: 7.0,
          totalLigne: 7.0
        }
      ],
      totalItems: 4,
      totalPrice: 22.0
    };

    (service as any).cart.set(multiGuestCart);
    const groups = service.guestGroups();
    expect(groups).toHaveSize(3);
    expect(groups[0].guestSessionId).toBe('guest-me');
    expect(groups[0].isCurrentGuest).toBeTrue();
    expect(groups[1].guestName).toBe('Ben');
    expect(groups[2].guestName).toBe('Zoe');
  });

  it('reset should clear state and tear down subscriptions', () => {
    service.initCart(5).subscribe();
    httpMock.expectOne(`${baseUrl}/5/cart`).flush(sampleCart);

    expect(service.cart()).not.toBeNull();
    service.reset();
    expect(service.cart()).toBeNull();
    expect(service.activeTableId()).toBeNull();
  });
});
