import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToastController } from '@ionic/angular/standalone';
import { of, throwError, Subject } from 'rxjs';
import { signal, computed } from '@angular/core';
import { ClientCommandeComponent } from '../../../app/features/client/client-commande/client-commande.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { HappyHourService } from '../../../app/core/services/happy-hour.service';
import { TableSessionService } from '../../../app/core/services/table-session.service';
import { TableCartService } from '../../../app/core/services/table-cart.service';
import { TableSessionResponse } from '../../../app/core/models/table-session.model';
import { TableCart, TableCartItem } from '../../../app/core/models/table-cart.model';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { Router } from '@angular/router';

describe('ClientCommandeComponent', () => {
  let component: ClientCommandeComponent;
  let fixture: ComponentFixture<ClientCommandeComponent>;
  let router: Router;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let happyHourServiceSpy: jasmine.SpyObj<HappyHourService>;
  let tableSessionServiceSpy: jasmine.SpyObj<TableSessionService>;
  let websocketServiceSpy: jasmine.SpyObj<WebSocketService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let tableCartServiceMock: any;
  let cocktailWsSubject: Subject<any>;
  let cocktailSupprimeWsSubject: Subject<any>;

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
      'refreshSession',
      'getSessionQrCodeUrl'
    ]);
    tableSessionServiceSpy.getSessionQrCodeUrl.and.returnValue('http://localhost:8080/api/public/tables/4/session/qrcode?format=PNG&size=300');
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    websocketServiceSpy = jasmine.createSpyObj('WebSocketService', ['watch']);
    cocktailWsSubject = new Subject<any>();
    cocktailSupprimeWsSubject = new Subject<any>();
    websocketServiceSpy.watch.and.callFake((topic: string) => {
      if (topic === '/topic/cocktails/supprime') return cocktailSupprimeWsSubject.asObservable();
      return cocktailWsSubject.asObservable();
    });

    const cartSignal = signal<TableCart | null>(mockCart);
    const guestNameSignal = signal<string>('Alex');

    tableCartServiceMock = {
      cart: cartSignal,
      tableOrdersSummary: signal(null),
      graceRemainingSeconds: signal(0),
      isOwner: signal(true),
      ownerGuestName: signal('Alex'),
      pendingJoinRequests: signal([]),
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
      loadTableOrdersSummary: jasmine.createSpy('loadTableOrdersSummary').and.returnValue(of(null)),
      finalizeGrace: jasmine.createSpy('finalizeGrace').and.returnValue(of(null)),
      addItem: jasmine.createSpy('addItem').and.returnValue(of(mockCart)),
      updateItem: jasmine.createSpy('updateItem').and.returnValue(of(mockCart)),
      removeItem: jasmine.createSpy('removeItem').and.returnValue(of(mockCart)),
      submitCart: jasmine.createSpy('submitCart').and.returnValue(of({ commandeId: 99, trackingToken: 'trk-99' })),
      setOwnership: jasmine.createSpy('setOwnership'),
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

    happyHourServiceSpy = jasmine.createSpyObj('HappyHourService', ['loadRules', 'resolvePrice']);
    happyHourServiceSpy.loadRules.and.returnValue(of([]));
    happyHourServiceSpy.resolvePrice.and.callFake((price: number) => ({
      effectivePrice: price,
      isHappyHour: false,
      appliedRule: null,
      savings: 0
    }));

    await TestBed.configureTestingModule({
      imports: [
        ClientCommandeComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: CocktailService, useValue: cocktailServiceSpy },
        { provide: HappyHourService, useValue: happyHourServiceSpy },
        { provide: TableSessionService, useValue: tableSessionServiceSpy },
        { provide: TableCartService, useValue: tableCartServiceMock },
        { provide: WebSocketService, useValue: websocketServiceSpy },
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
    expect(tableSessionServiceSpy.validateSession).toHaveBeenCalledWith(4, 'valid-token-123', 'guest-me', 'Alex');
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

  it('should apply matcher filters and update filtered cocktails list', () => {
    component.cocktails = [
      { id: 1, nom: 'Virgin Mojito', categorie: 'SANS_ALCOOL', prix: 6, disponible: true, isMocktail: true, isVegan: true, isGlutenFree: true, alcoholLevel: 0, flavorProfiles: ['FRUITY', 'HERBAL'] } as any,
      { id: 2, nom: 'Smoky Mezcal', categorie: 'ALCOOLISE', prix: 12, disponible: true, isMocktail: false, isVegan: false, isGlutenFree: true, alcoholLevel: 25, flavorProfiles: ['SMOKY'] } as any
    ];

    component.onMatcherFiltersChange({
      flavors: ['FRUITY'],
      mocktail: true,
      vegan: true,
      glutenFree: true,
      lowAbv: false
    });

    expect(component.selectedFlavors).toEqual(['FRUITY']);
    expect(component.filterMocktail).toBeTrue();
    expect(component.filteredCocktails).toHaveSize(1);
    expect(component.filteredCocktails[0].nom).toBe('Virgin Mojito');
  });

  it('should reset matcher filters and restore filtered cocktails', () => {
    component.cocktails = [
      { id: 1, nom: 'Virgin Mojito', categorie: 'SANS_ALCOOL', prix: 6, disponible: true, isMocktail: true, isVegan: true, isGlutenFree: true, alcoholLevel: 0, flavorProfiles: ['FRUITY'] } as any,
      { id: 2, nom: 'Smoky Mezcal', categorie: 'ALCOOLISE', prix: 12, disponible: true, isMocktail: false, isVegan: false, isGlutenFree: true, alcoholLevel: 25, flavorProfiles: ['SMOKY'] } as any
    ];
    component.selectedCategory = 'ALL';
    component.onMatcherFiltersChange({
      flavors: ['SMOKY'],
      mocktail: false,
      vegan: false,
      glutenFree: false,
      lowAbv: false
    });
    expect(component.filteredCocktails).toHaveSize(1);

    component.onResetMatcherFilters();

    expect(component.selectedFlavors).toEqual([]);
    expect(component.filterMocktail).toBeFalse();
    expect(component.filteredCocktails).toHaveSize(2);
  });

  describe('Search and Category Filtering', () => {
    beforeEach(() => {
      component.cocktails = [
        { id: 1, nom: 'Mojito Classique', categorie: 'ALCOOLISE', description: 'Rhum et menthe fraîche', disponible: true, ingredients: [{ ingredientNom: 'Menthe' }, { ingredientNom: 'Rhum' }] } as any,
        { id: 2, nom: 'Virgin Colada', categorie: 'SANS_ALCOOL', description: 'Ananas et coco', disponible: true, ingredients: [{ ingredientNom: 'Lait de coco' }] } as any,
        { id: 3, nom: 'Tequila Bumbum', categorie: 'SHOT', description: 'Tequila festive', disponible: true, ingredients: [{ ingredientNom: 'Tequila' }] } as any,
        { id: 4, nom: 'Spritz Italien', categorie: 'APERITIF', description: 'Apéritif amer pétillant', disponible: true, ingredients: [{ ingredientNom: 'Prosecco' }] } as any,
        { id: 5, nom: 'Limoncello Frappé', categorie: 'DIGESTIF', description: 'Liqueur de citron', disponible: true, ingredients: [{ ingredientNom: 'Citron' }] } as any,
        { id: 6, nom: 'Création Signature', categorie: 'SPECIAL', description: 'Cocktail mystère du chef', disponible: true, ingredients: [{ ingredientNom: 'Sirop maison' }] } as any,
        { id: 7, nom: 'Invisible Item', categorie: 'ALCOOLISE', description: 'Rupture', disponible: false, ingredients: [] } as any
      ];
    });

    it('should filter cocktails by search query on name, description, and ingredients', () => {
      component.selectedCategory = 'ALL';

      // 1. Match by name
      component.searchQuery = 'mojito';
      component.applyCombinedFilters();
      expect(component.filteredCocktails).toHaveSize(1);
      expect(component.filteredCocktails[0].nom).toBe('Mojito Classique');

      // 2. Match by description
      component.searchQuery = 'ananas';
      component.applyCombinedFilters();
      expect(component.filteredCocktails).toHaveSize(1);
      expect(component.filteredCocktails[0].nom).toBe('Virgin Colada');

      // 3. Match by ingredient
      component.searchQuery = 'prosecco';
      component.applyCombinedFilters();
      expect(component.filteredCocktails).toHaveSize(1);
      expect(component.filteredCocktails[0].nom).toBe('Spritz Italien');

      // 4. Empty query restores all available items (excludes unavailable id: 7)
      component.searchQuery = '';
      component.applyCombinedFilters();
      expect(component.filteredCocktails).toHaveSize(6);
      expect(component.filteredCocktails.some(c => c.id === 7)).toBeFalse();
    });

    it('should filter cocktails by category pills correctly', () => {
      component.filterCategory('SHOT');
      expect(component.selectedCategory).toBe('SHOT');
      expect(component.filteredCocktails).toHaveSize(1);
      expect(component.filteredCocktails[0].nom).toBe('Tequila Bumbum');

      component.filterCategory('APERITIF');
      expect(component.selectedCategory).toBe('APERITIF');
      expect(component.filteredCocktails).toHaveSize(1);
      expect(component.filteredCocktails[0].nom).toBe('Spritz Italien');

      component.filterCategory('DIGESTIF');
      expect(component.selectedCategory).toBe('DIGESTIF');
      expect(component.filteredCocktails).toHaveSize(1);
      expect(component.filteredCocktails[0].nom).toBe('Limoncello Frappé');

      component.filterCategory('SPECIAL');
      expect(component.selectedCategory).toBe('SPECIAL');
      expect(component.filteredCocktails).toHaveSize(1);
      expect(component.filteredCocktails[0].nom).toBe('Création Signature');

      component.filterCategory('ALL');
      expect(component.selectedCategory).toBe('ALL');
      expect(component.filteredCocktails).toHaveSize(6);
    });

    it('should return correct dot colors and pill styles for all categories', () => {
      expect(component.getCategoryDotColor('ALCOOLISE')).toBe('var(--types-alcoholic)');
      expect(component.getCategoryDotColor('SANS_ALCOOL')).toBe('var(--types-nonalcoholic)');
      expect(component.getCategoryDotColor('SHOT')).toBe('var(--types-shot)');
      expect(component.getCategoryDotColor('APERITIF')).toBe('var(--semantic-warning)');
      expect(component.getCategoryDotColor('DIGESTIF')).toBe('var(--semantic-danger)');
      expect(component.getCategoryDotColor('SPECIAL')).toBe('var(--types-cocktail)');
      expect(component.getCategoryDotColor('ALL')).toBe('var(--primary)');

      const inactiveStyle = component.getCategoryPillStyle('SHOT', false);
      expect(inactiveStyle['background-color']).toContain('var(--background-surface-2');

      const activeStyle = component.getCategoryPillStyle('SHOT', true);
      expect(activeStyle['background-color']).toBe('var(--types-shot)');
      expect(activeStyle['color']).toBe('var(--text-on-accent, var(--text-primary))');
    });
  });

  describe('Allergen Exclusion Filtering', () => {
    it('should extract allergens correctly and respect vegan and gluten-free exemptions', () => {
      const regularCocktail: any = {
        ingredients: [
          { ingredientNom: 'Bière', allergens: ['GLUTEN'] },
          { ingredientNom: 'Lait', allergens: ['LAIT'] }
        ],
        isGlutenFree: false,
        isVegan: false
      };
      expect(component.getCocktailAllergens(regularCocktail)).toEqual(jasmine.arrayContaining(['GLUTEN', 'LAIT']));

      const glutenFreeCocktail: any = {
        ingredients: [{ ingredientNom: 'Mix', allergens: ['GLUTEN'] }],
        isGlutenFree: true,
        isVegan: false
      };
      expect(component.getCocktailAllergens(glutenFreeCocktail)).toEqual([]);

      const veganCocktail: any = {
        ingredients: [
          { ingredientNom: 'Crème', allergens: ['LAIT', 'OEUF'] },
          { ingredientNom: 'Noix', allergens: ['FRUITS_A_COQUE'] }
        ],
        isGlutenFree: false,
        isVegan: true
      };
      expect(component.getCocktailAllergens(veganCocktail)).toEqual(['FRUITS_A_COQUE']);
      expect(component.getCocktailAllergens(null as any)).toEqual([]);
    });

    it('should toggle and clear allergen exclusion filters', () => {
      component.cocktails = [
        {
          id: 1,
          nom: 'Piña Colada',
          categorie: 'ALCOOLISE',
          disponible: true,
          ingredients: [{ ingredientNom: 'Crème', allergens: ['LAIT'] }]
        } as any,
        {
          id: 2,
          nom: 'Margarita',
          categorie: 'ALCOOLISE',
          disponible: true,
          ingredients: [{ ingredientNom: 'Tequila', allergens: [] }]
        } as any
      ];
      component.selectedCategory = 'ALL';
      component.applyCombinedFilters();
      expect(component.filteredCocktails).toHaveSize(2);

      // Exclude LAIT
      component.toggleAllergenFilter('LAIT');
      expect(component.selectedAllergens).toEqual(['LAIT']);
      expect(component.filteredCocktails).toHaveSize(1);
      expect(component.filteredCocktails[0].nom).toBe('Margarita');

      // Untoggle LAIT
      component.toggleAllergenFilter('LAIT');
      expect(component.selectedAllergens).toEqual([]);
      expect(component.filteredCocktails).toHaveSize(2);

      // Add allergen and clear
      component.toggleAllergenFilter('LAIT');
      component.clearAllergenFilters();
      expect(component.selectedAllergens).toEqual([]);
      expect(component.filteredCocktails).toHaveSize(2);
    });
  });

  describe('Real-time Availability Synchronization via WebSocket', () => {
    beforeEach(() => {
      component.cocktails = [
        { id: 10, nom: 'Mojito', categorie: 'ALCOOLISE', disponible: true, ingredients: [] } as any,
        { id: 20, nom: 'Cosmo', categorie: 'ALCOOLISE', disponible: true, ingredients: [] } as any
      ];
      component.selectedCategory = 'ALL';
      component.applyCombinedFilters();
    });

    it('should immediately remove cocktail when its availability is toggled to false', () => {
      expect(component.filteredCocktails).toHaveSize(2);

      cocktailWsSubject.next({
        body: JSON.stringify({ id: 10, nom: 'Mojito', categorie: 'ALCOOLISE', disponible: false, ingredients: [] })
      });

      expect(component.cocktails.some(c => c.id === 10)).toBeFalse();
      expect(component.filteredCocktails.some(c => c.id === 10)).toBeFalse();
      expect(component.filteredCocktails).toHaveSize(1);
      expect(component.filteredCocktails[0].id).toBe(20);
    });

    it('should add newly available cocktail when pushed via WebSocket', () => {
      expect(component.filteredCocktails).toHaveSize(2);

      cocktailWsSubject.next({
        body: JSON.stringify({ id: 30, nom: 'Negroni', categorie: 'APERITIF', disponible: true, ingredients: [] })
      });

      expect(component.cocktails.some(c => c.id === 30)).toBeTrue();
      expect(component.filteredCocktails.some(c => c.id === 30)).toBeTrue();
      expect(component.filteredCocktails).toHaveSize(3);
    });

    it('should remove deleted cocktail when message arrives on /topic/cocktails/supprime', () => {
      expect(component.filteredCocktails).toHaveSize(2);

      cocktailSupprimeWsSubject.next({
        body: JSON.stringify({ id: 20 })
      });

      expect(component.cocktails.some(c => c.id === 20)).toBeFalse();
      expect(component.filteredCocktails.some(c => c.id === 20)).toBeFalse();
      expect(component.filteredCocktails).toHaveSize(1);
    });

    it('should handle malformed WebSocket messages gracefully', () => {
      expect(() => {
        cocktailWsSubject.next({ body: 'invalid-json' });
        cocktailSupprimeWsSubject.next({ body: '{malformed' });
      }).not.toThrow();
    });
  });

  describe('Invite Friends via Link & QR Code', () => {
    beforeEach(() => {
      component.tableNumero = 4;
      component.sessionToken = 'test-token-xyz';
      component.step = 'menu';
      component.isSessionValid = true;
      fixture.detectChanges();
    });

    it('should open and close the invite modal', () => {
      expect(component.showInviteModal()).toBeFalse();

      component.openInviteModal();
      expect(component.showInviteModal()).toBeTrue();
      expect(component.copiedLinkSuccess()).toBeFalse();

      component.closeInviteModal();
      expect(component.showInviteModal()).toBeFalse();
    });

    it('getInviteUrl should generate complete URL with table and session token', () => {
      const url = component.getInviteUrl();
      expect(url).toContain('/client/commande?table=4');
      expect(url).toContain('token=test-token-xyz');
    });

    it('getInviteUrl should return empty string when tableNumero is not set', () => {
      component.tableNumero = null;
      expect(component.getInviteUrl()).toBe('');
    });

    it('getInviteQrCodeUrl should delegate to tableSessionService with origin', () => {
      const qrUrl = component.getInviteQrCodeUrl();
      expect(tableSessionServiceSpy.getSessionQrCodeUrl).toHaveBeenCalledWith(
        4,
        'test-token-xyz',
        'PNG',
        300,
        jasmine.any(String)
      );
      expect(qrUrl).toBe('http://localhost:8080/api/public/tables/4/session/qrcode?format=PNG&size=300');
    });

    it('copyInviteLink should write to clipboard and present toast', fakeAsync(() => {
      const writeTextSpy = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      const toastMock = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
      toastCtrlSpy.create.and.returnValue(Promise.resolve(toastMock));

      component.copyInviteLink();
      tick();

      expect(writeTextSpy).toHaveBeenCalledWith(component.getInviteUrl());
      expect(component.copiedLinkSuccess()).toBeTrue();
      expect(toastCtrlSpy.create).toHaveBeenCalled();
      expect(toastMock.present).toHaveBeenCalled();

      tick(4000);
      expect(component.copiedLinkSuccess()).toBeFalse();
    }));

    it('shareInviteNative should call navigator.share when available', fakeAsync(() => {
      const shareSpy = jasmine.createSpy('share').and.returnValue(Promise.resolve());
      (navigator as any).share = shareSpy;

      component.shareInviteNative();
      tick();

      expect(shareSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        url: component.getInviteUrl()
      }));
    }));

    it('canShareNative should return true when navigator.share is a function', () => {
      const originalShare = (navigator as any).share;
      try {
        Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true });
        expect(component.canShareNative()).toBeTrue();

        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
        expect(component.canShareNative()).toBeFalse();
      } finally {
        Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true });
      }
    });

    it('should render invite button in menu header and open modal on click', () => {
      const inviteBtn = fixture.nativeElement.querySelector('[data-testid="btn-open-invite-modal"]');
      expect(inviteBtn).toBeTruthy();

      inviteBtn.click();
      fixture.detectChanges();

      expect(component.showInviteModal()).toBeTrue();
      const modal = fixture.nativeElement.querySelector('[data-testid="invite-friends-modal"]');
      expect(modal).toBeTruthy();
      const qrImg = fixture.nativeElement.querySelector('[data-testid="invite-qr-image"]');
      expect(qrImg).toBeTruthy();
      const copyBtn = fixture.nativeElement.querySelector('[data-testid="btn-copy-invite-link"]');
      expect(copyBtn).toBeTruthy();
    });

    it('should render invite banner in recap step', () => {
      component.step = 'recap';
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('[data-testid="recap-invite-banner"]');
      expect(banner).toBeTruthy();

      const recapInviteBtn = fixture.nativeElement.querySelector('[data-testid="btn-recap-invite-friends"]');
      expect(recapInviteBtn).toBeTruthy();

      recapInviteBtn.click();
      fixture.detectChanges();

      expect(component.showInviteModal()).toBeTrue();
    });
  });

  describe('Cocktail Details & Ingredients Modal', () => {
    const cocktailWithIngredients: Cocktail = {
      id: 99,
      nom: 'Signature Mojito',
      description: 'Rafraîchissant et secret',
      prix: 9.0,
      categorie: 'ALCOOLISE',
      disponible: true,
      saisonnier: false,
      ingredients: [
        { id: 1, ingredientId: 10, ingredientNom: 'Rhum blanc agricole', quantite: 50, uniteMesure: 'ml' },
        { id: 2, ingredientId: 11, ingredientNom: 'Menthe fraîche', quantite: 10, uniteMesure: 'feuilles' },
        { id: 3, ingredientId: 12, ingredientNom: 'Sirop de canne artisanal', quantite: 20, uniteMesure: 'ml', allergens: ['SULFITES'] }
      ],
      variantes: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    };

    it('should open cocktail details modal and display ingredient names without recipe quantities or units', () => {
      component.openCocktailDetails(cocktailWithIngredients);
      fixture.detectChanges();

      expect(component.selectedCocktailForDetails()).toBe(cocktailWithIngredients);

      const modal = fixture.nativeElement.querySelector('[data-testid="cocktail-details-modal"]');
      expect(modal).toBeTruthy();

      const title = fixture.nativeElement.querySelector('[data-testid="cocktail-details-title"]');
      expect(title?.textContent).toContain('Signature Mojito');

      const ingredientItems = fixture.nativeElement.querySelectorAll('[data-testid="cocktail-ingredient-item"]');
      expect(ingredientItems).toHaveSize(3);

      const ingredientNames = Array.from(ingredientItems).map((el: any) => el.textContent);
      expect(ingredientNames.some(t => t.includes('Rhum blanc agricole'))).toBeTrue();
      expect(ingredientNames.some(t => t.includes('Menthe fraîche'))).toBeTrue();
      expect(ingredientNames.some(t => t.includes('Sirop de canne artisanal'))).toBeTrue();

      // Allergen tag should be displayed
      const allergenTag = fixture.nativeElement.querySelector('[data-testid="ingredient-allergen-badge"]');
      expect(allergenTag?.textContent).toContain('SULFITES');

      // Crucial requirement: quantities (50, 10, 20) and measurement units (ml, feuilles) MUST NOT appear in the ingredients list
      const ingredientsSectionText = fixture.nativeElement.querySelector('[data-testid="cocktail-ingredients-section"]')?.textContent || '';
      expect(ingredientsSectionText).not.toContain('50 ml');
      expect(ingredientsSectionText).not.toContain('10 feuilles');
      expect(ingredientsSectionText).not.toContain('20 ml');
    });

    it('should display empty ingredients notice if cocktail has no listed ingredients', () => {
      const emptyIngCocktail: Cocktail = {
        ...cocktailWithIngredients,
        id: 100,
        ingredients: []
      };
      component.openCocktailDetails(emptyIngCocktail);
      fixture.detectChanges();

      const emptyText = fixture.nativeElement.querySelector('[data-testid="empty-ingredients-text"]');
      expect(emptyText).toBeTruthy();
    });

    it('should close details modal via closeCocktailDetails, close button, and backdrop click', () => {
      component.openCocktailDetails(cocktailWithIngredients);
      fixture.detectChanges();
      expect(component.selectedCocktailForDetails()).not.toBeNull();

      // Close via header button
      const closeBtn = fixture.nativeElement.querySelector('[data-testid="btn-close-cocktail-details"]');
      expect(closeBtn).toBeTruthy();
      closeBtn.click();
      fixture.detectChanges();
      expect(component.selectedCocktailForDetails()).toBeNull();

      // Re-open and close via footer button
      component.openCocktailDetails(cocktailWithIngredients);
      fixture.detectChanges();
      const footerCloseBtn = fixture.nativeElement.querySelector('[data-testid="btn-close-details-footer"]');
      footerCloseBtn.click();
      fixture.detectChanges();
      expect(component.selectedCocktailForDetails()).toBeNull();

      // Re-open and test backdrop click
      component.openCocktailDetails(cocktailWithIngredients);
      const fakeBackdropEvent = { target: { classList: { contains: (cls: string) => cls === 'cocktail-details-dialog' } } } as any;
      component.onDetailsBackdropClick(fakeBackdropEvent);
      expect(component.selectedCocktailForDetails()).toBeNull();
    });

    it('should allow adding cocktail to cart from the details modal', () => {
      spyOn(component, 'addToCart');
      component.openCocktailDetails(cocktailWithIngredients);
      fixture.detectChanges();

      const plusBtn = fixture.nativeElement.querySelector('[data-testid="modal-cocktail-plus"]');
      expect(plusBtn).toBeTruthy();
      plusBtn.click();

      expect(component.addToCart).toHaveBeenCalledWith(cocktailWithIngredients);
    });
  });
});
