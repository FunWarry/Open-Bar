import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { ClientCommandeComponent } from '../../../app/features/client/client-commande/client-commande.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { CommandeService } from '../../../app/core/services/commande.service';
import { TableAppelService } from '../../../app/core/services/table-appel.service';
import { TableSessionService } from '../../../app/core/services/table-session.service';
import { TableSessionResponse } from '../../../app/core/models/table-session.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { TableAppel } from '../../../app/core/models/table-appel.model';

import { Router } from '@angular/router';

describe('ClientCommandeComponent', () => {
  let component: ClientCommandeComponent;
  let fixture: ComponentFixture<ClientCommandeComponent>;
  let router: Router;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;
  let tableAppelServiceSpy: jasmine.SpyObj<TableAppelService>;
  let tableSessionServiceSpy: jasmine.SpyObj<TableSessionService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

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

  const mockAppel: TableAppel = {
    id: 10,
    tableId: 4,
    tableNumero: 4,
    type: 'ASSISTANCE',
    statut: 'EN_ATTENTE',
    createdAt: '2026-08-31T19:00:00',
    updatedAt: '2026-08-31T19:00:00'
  };

  beforeEach(async () => {
    cocktailServiceSpy = jasmine.createSpyObj('CocktailService', ['getAll']);
    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['create']);
    tableAppelServiceSpy = jasmine.createSpyObj('TableAppelService', [
      'appelerServeur',
      'getAppelsActifsPourTable'
    ]);
    tableSessionServiceSpy = jasmine.createSpyObj('TableSessionService', [
      'validateSession',
      'refreshSession'
    ]);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);

    cocktailServiceSpy.getAll.and.returnValue(of([mockCocktail]));
    tableAppelServiceSpy.appelerServeur.and.returnValue(of(mockAppel));
    tableAppelServiceSpy.getAppelsActifsPourTable.and.returnValue(of([]));
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
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: TableAppelService, useValue: tableAppelServiceSpy },
        { provide: TableSessionService, useValue: tableSessionServiceSpy },
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

  it('should advance to menu step when valid table number is submitted', () => {
    component.tableForm.setValue({ tableNumber: 4 });
    component.onSelectTable();
    expect(component.tableNumero).toBe(4);
    expect(component.step).toBe('menu');
    expect(cocktailServiceSpy.getAll).toHaveBeenCalled();
  });

  it('should add and remove items from cart', () => {
    component.addToCart(mockCocktail);
    expect(component.getItemQuantity(1)).toBe(1);
    expect(component.totalPrice).toBe(8.5);
    expect(component.totalItemsCount).toBe(1);

    component.removeFromCart(1);
    expect(component.getItemQuantity(1)).toBe(0);
    expect(component.totalItemsCount).toBe(0);
  });

  it('should handle category filtering and cart navigation', () => {
    component.cocktails = [mockCocktail];
    component.filterCategory('ALCOOLISE');
    expect(component.selectedCategory).toBe('ALCOOLISE');
    expect(component.filteredCocktails).toHaveSize(1);

    component.addToCart(mockCocktail);
    component.goToRecap();
    expect(component.step).toBe('recap');

    component.backToMenu();
    expect(component.step).toBe('menu');
  });

  it('should submit order and navigate to tracking view', fakeAsync(() => {
    commandeServiceSpy.create.and.returnValue(of({ id: 99, tableNumero: 4, items: [], statut: 'EN_ATTENTE', total: 8.5 } as any));
    component.tableNumero = 4;
    component.addToCart(mockCocktail);

    component.submitOrder();
    tick();

    expect(commandeServiceSpy.create).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'success'
    }));
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
    commandeServiceSpy.create.and.returnValue(throwError(() => ({ status: 403, error: { message: 'Session expired' } })));
    component.tableNumero = 4;
    component.addToCart(mockCocktail);

    component.submitOrder();
    tick();

    expect(component.isSessionValid).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger'
    }));
  }));
});
