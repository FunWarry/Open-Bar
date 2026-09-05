import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { signal, computed } from '@angular/core';
import { ClientCommandeComponent } from '../../../app/features/client/client-commande/client-commande.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { TableSessionService } from '../../../app/core/services/table-session.service';
import { TableCartService } from '../../../app/core/services/table-cart.service';
import { TableSessionResponse } from '../../../app/core/models/table-session.model';
import { TableCart, TableCartItem } from '../../../app/core/models/table-cart.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { Router } from '@angular/router';

describe('ClientCommandeComponent', () => {
  let component: ClientCommandeComponent;
  let fixture: ComponentFixture<ClientCommandeComponent>;
  let router: Router;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let tableSessionServiceSpy: jasmine.SpyObj<TableSessionService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let tableCartServiceMock: any;

  const mockActiveSessionResponse: TableSessionResponse = {
    id: 1,
    tableId: 4,
    sessionToken: 'valid-token-123',
    status: 'ACTIVE',
    openedAt: '2026-09-05T18:00:00',
    lastActivityAt: '2026-09-05T18:10:00',
    expiresAt: '2026-09-05T20:00:00',
    valid: true,
    message: 'Active'
  };

  const mockCocktail: Cocktail = {
    id: 1,
    nom: 'Mojito',
    categorie: 'ALCOOLISE',
    prix: 8.5,
    disponible: true,
    description: 'Menthe, citron, rhum',
    ingredients: [],
    variantes: [],
    saisonnier: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  };

  const mockCartItem: TableCartItem = {
    id: 101,
    guestSessionId: 'guest-me',
    guestName: 'Alex',
    cocktailId: 1,
    cocktailNom: 'Mojito',
    quantite: 1,
    prixUnitaire: 8.5,
    totalLigne: 8.5
  };

  const mockCart: TableCart = {
    tableId: 4,
    status: 'OPEN',
    items: [mockCartItem],
    totalItems: 1,
    totalPrice: 8.5
  };

  beforeEach(async () => {
    cocktailServiceSpy = jasmine.createSpyObj('CocktailService', ['getAll', 'getFacets', 'matchCocktails']);
    tableSessionServiceSpy = jasmine.createSpyObj('TableSessionService', [
      'validateSession',
      'refreshSession'
    ]);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);

    const cartSignal = signal<TableCart | null>(mockCart);
    const guestNameSignal = signal<string>('Alex');

    tableCartServiceMock = {
      cart: cartSignal,
      currentGuestName: guestNameSignal,
      guestGroups: signal([
        {
          guestSessionId: 'guest-me',
          guestName: 'Alex',
          isCurrentGuest: true,
          items: [mockCartItem],
          totalItems: 1,
          totalPrice: 8.5
        }
      ]),
      totalItems: computed(() => cartSignal()?.totalItems ?? 0),
      totalPrice: computed(() => cartSignal()?.totalPrice ?? 0),
      hasGuestName: jasmine.createSpy('hasGuestName').and.returnValue(true),
      getGuestName: jasmine.createSpy('getGuestName').and.returnValue('Alex'),
      setGuestName: jasmine.createSpy('setGuestName').and.callFake((name: string) => {
        guestNameSignal.set(name);
      }),
      getOrCreateGuestSessionId: jasmine.createSpy('getOrCreateGuestSessionId').and.returnValue('guest-me'),
      initCart: jasmine.createSpy('initCart').and.returnValue(of(mockCart)),
      addItem: jasmine.createSpy('addItem').and.returnValue(of(mockCart)),
      updateItem: jasmine.createSpy('updateItem').and.returnValue(of(mockCart)),
      removeItem: jasmine.createSpy('removeItem').and.returnValue(of(mockCart)),
      submitCart: jasmine.createSpy('submitCart').and.returnValue(of({ commandeId: 99, trackingToken: 'trk-99' })),
      reset: jasmine.createSpy('reset')
    };

    cocktailServiceSpy.getAll.and.returnValue(of([mockCocktail]));
    cocktailServiceSpy.getFacets.and.returnValue(of({
      flavorCounts: { FRUITY: 1, SWEET: 0, SOUR: 0, BITTER: 0, SPICY: 0, SMOKY: 0, HERBAL: 0 },
      mocktailsCount: 0,
      veganCount: 1,
      glutenFreeCount: 1,
      lowAbvCount: 0,
      minAlcoholLevel: 14.5,
      maxAlcoholLevel: 14.5,
      totalAvailable: 1
    }));
    cocktailServiceSpy.matchCocktails.and.returnValue(of([mockCocktail]));
    tableSessionServiceSpy.validateSession.and.returnValue(of(mockActiveSessionResponse));
    tableSessionServiceSpy.refreshSession.and.returnValue(of(mockActiveSessionResponse));
    toastCtrlSpy.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    await TestBed.configureTestingModule({
      imports: [
        ClientCommandeComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: CocktailService, useValue: cocktailServiceSpy },
        { provide: TableSessionService, useValue: tableSessionServiceSpy },
        { provide: TableCartService, useValue: tableCartServiceMock },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(ClientCommandeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start at table step', () => {
    expect(component.step).toBe('table');
  });

  it('should advance to menu step and initialize collaborative cart', () => {
    component.tableForm.setValue({ tableNumber: 4 });
    component.onSelectTable();
    expect(component.tableNumero).toBe(4);
    expect(component.step).toBe('menu');
    expect(cocktailServiceSpy.getAll).toHaveBeenCalled();
    expect(tableCartServiceMock.initCart).toHaveBeenCalledWith(4, 'valid-token-123');
  });


  it('should prompt for nickname if none exists and save it', () => {
    tableCartServiceMock.hasGuestName.and.returnValue(false);
    component.tableForm.setValue({ tableNumber: 4 });
    component.onSelectTable();
    expect(component.showNicknamePrompt()).toBeTrue();

    component.nicknameForm.setValue({ nickname: 'Sam' });
    component.saveNickname();

    expect(tableCartServiceMock.setGuestName).toHaveBeenCalledWith('Sam');
    expect(component.showNicknamePrompt()).toBeFalse();
  });

  it('should delegate adding and removing items to tableCartService', () => {
    component.tableNumero = 4;
    component.addToCart(mockCocktail);

    expect(tableCartServiceMock.addItem).toHaveBeenCalledWith(4, jasmine.objectContaining({
      guestSessionId: 'guest-me',
      guestName: 'Alex',
      cocktailId: 1,
      quantite: 1
    }));

    component.removeFromCart(1);
    expect(tableCartServiceMock.removeItem).toHaveBeenCalledWith(4, 101);
  });

  it('should navigate between menu and recap steps', () => {
    component.goToRecap();
    expect(component.step).toBe('recap');

    component.backToMenu();
    expect(component.step).toBe('menu');
  });

  it('should submit order via tableCartService and navigate to tracking view', fakeAsync(() => {
    component.tableNumero = 4;
    component.orderNotes = 'Serve immediately';

    component.submitOrder();
    tick();

    expect(tableCartServiceMock.submitCart).toHaveBeenCalledWith(4, jasmine.objectContaining({
      guestSessionId: 'guest-me',
      guestName: 'Alex',
      notes: 'Serve immediately'
    }));

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'success'
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/client/suivi', 99]);
  }));

  it('should validate table session on checkSession', () => {
    component.checkSession(4, 'valid-token-123');
    expect(tableSessionServiceSpy.validateSession).toHaveBeenCalledWith(4, 'valid-token-123');
    expect(component.isSessionValid).toBeTrue();
    expect(component.sessionStatus).toBe('ACTIVE');
    expect(component.sessionToken).toBe('valid-token-123');
  });

  it('should mark session invalid when validation returns expired', () => {
    tableSessionServiceSpy.validateSession.and.returnValue(of({
      id: 2,
      tableId: 4,
      sessionToken: 'expired-token',
      status: 'EXPIRED',
      openedAt: '2026-09-05T12:00:00',
      lastActivityAt: '2026-09-05T12:30:00',
      expiresAt: '2026-09-05T14:00:00',
      valid: false,
      message: 'Expired'
    }));

    component.checkSession(4, 'expired-token');
    expect(component.isSessionValid).toBeFalse();
    expect(component.sessionStatus).toBe('EXPIRED');
  });

  it('should refresh session when refreshSession is called', fakeAsync(() => {
    component.tableNumero = 4;
    component.refreshSession();
    tick();

    expect(tableSessionServiceSpy.refreshSession).toHaveBeenCalledWith(4);
    expect(component.isSessionValid).toBeTrue();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'success'
    }));
  }));

  it('should mark session invalid when order submission fails with 403 Forbidden', fakeAsync(() => {
    tableCartServiceMock.submitCart.and.returnValue(throwError(() => ({ status: 403, error: { message: 'Session expired' } })));
    component.tableNumero = 4;

    component.submitOrder();
    tick();

    expect(component.isSessionValid).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger'
    }));
  }));

  it('should remove item via removeCartItem', () => {
    component.tableNumero = 4;
    component.removeCartItem(mockCartItem);
    expect(tableCartServiceMock.removeItem).toHaveBeenCalledWith(4, 101);
  });

  it('should increment item via incrementCartItem', () => {
    component.tableNumero = 4;
    component.incrementCartItem(mockCartItem);
    expect(tableCartServiceMock.updateItem).toHaveBeenCalledWith(4, 101, {
      guestSessionId: 'guest-me',
      quantite: 2
    });
  });

  it('should decrement item when quantite > 1 via decrementCartItem', () => {
    component.tableNumero = 4;
    const itemWithTwo: TableCartItem = { ...mockCartItem, quantite: 2 };
    component.decrementCartItem(itemWithTwo);
    expect(tableCartServiceMock.updateItem).toHaveBeenCalledWith(4, 101, {
      guestSessionId: 'guest-me',
      quantite: 1
    });
  });

  it('should remove item when decrementing item with quantite 1 via decrementCartItem', () => {
    component.tableNumero = 4;
    component.decrementCartItem(mockCartItem);
    expect(tableCartServiceMock.removeItem).toHaveBeenCalledWith(4, 101);
  });

  it('should decrement item quantity when removing from cart with quantite > 1', () => {
    component.tableNumero = 4;
    const cartWithMultiple: TableCart = {
      ...mockCart,
      items: [{ ...mockCartItem, quantite: 3 }]
    };
    tableCartServiceMock.cart.set(cartWithMultiple);
    component.removeFromCart(1);
    expect(tableCartServiceMock.updateItem).toHaveBeenCalledWith(4, 101, {
      guestSessionId: 'guest-me',
      quantite: 2
    });
  });

  it('should open nickname prompt when adding to cart if guest name is not set', () => {
    component.tableNumero = 4;
    tableCartServiceMock.hasGuestName.and.returnValue(false);
    tableCartServiceMock.getGuestName.and.returnValue('');
    component.addToCart(mockCocktail);
    expect(component.showNicknamePrompt()).toBeTrue();
  });

  it('should display error toast when adding item fails', fakeAsync(() => {
    component.tableNumero = 4;
    tableCartServiceMock.addItem.and.returnValue(throwError(() => ({ error: { message: 'Stock depleted' } })));
    component.addToCart(mockCocktail);
    tick();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      message: 'Stock depleted',
      color: 'danger'
    }));
  }));

  it('should return correct quantity from getItemQuantity', () => {
    expect(component.getItemQuantity(1)).toBe(1);
    expect(component.getItemQuantity(999)).toBe(0);
  });

  it('should prefill and open nickname prompt via openNicknamePrompt', () => {
    tableCartServiceMock.getGuestName.and.returnValue('Charlie');
    component.openNicknamePrompt();
    expect(component.nicknameForm.value.nickname).toBe('Charlie');
    expect(component.showNicknamePrompt()).toBeTrue();
  });

  it('should ignore saving empty nickname in saveNickname', () => {
    component.nicknameForm.setValue({ nickname: '   ' });
    component.saveNickname();
    expect(tableCartServiceMock.setGuestName).not.toHaveBeenCalledWith('   ');
  });

  it('should not go to recap when cart is empty', () => {
    tableCartServiceMock.cart.set({ ...mockCart, items: [], totalItems: 0, totalPrice: 0 });
    component.step = 'menu';
    component.goToRecap();
    expect(component.step).toBe('menu');
  });

  it('should show notification toast and navigate when peer submits the order', fakeAsync(() => {
    component.tableNumero = 4;
    component.step = 'recap';
    tableCartServiceMock.cart.set({
      ...mockCart,
      status: 'SUBMITTED',
      submittedOrderId: 88,
      submittedBy: 'Bob'
    });
    fixture.detectChanges();
    tick();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'primary'
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/client/suivi', 88]);
  }));

  it('should display error toast when order submission fails with generic error', fakeAsync(() => {
    tableCartServiceMock.submitCart.and.returnValue(throwError(() => ({ status: 500, error: { message: 'Internal error' } })));
    component.tableNumero = 4;
    component.submitOrder();
    tick();

    expect(component.isSubmitting).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      message: 'Internal error',
      color: 'danger'
    }));
  }));
});
