import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastController } from '@ionic/angular/standalone';
import { of, Subject, throwError } from 'rxjs';
import { KdsKitchenComponent } from '../../../app/features/kds-kitchen/kds-kitchen.component';
import { DashboardBarmanService } from '../../../app/features/dashboard-barman/services/dashboard-barman.service';
import { SoundService } from '../../../app/core/services/sound.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { CommandeView } from '../../../app/features/dashboard-barman/models/commande-view.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('KdsKitchenComponent', () => {
  let component: KdsKitchenComponent;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardBarmanService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let soundServiceSpy: jasmine.SpyObj<SoundService>;
  let wsServiceSpy: jasmine.SpyObj<WebSocketService>;
  let wsTopicKitchen$: Subject<any>;
  let wsTopicCommandes$: Subject<any>;

  const mockToast = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
  };

  const mockOrders: CommandeView[] = [
    {
      id: 1,
      tableNom: 'Table 1',
      tableNumero: 1,
      serveurNom: 'Lucas',
      statut: 'EN_ATTENTE',
      prioritaire: false,
      dateCommande: new Date(Date.now() - 120000).toISOString(),
      items: [
        {
          id: 101,
          cocktailNom: 'Mojito',
          quantite: 2,
          prioritaire: false,
          station: 'BAR',
          statut: 'EN_ATTENTE'
        },
        {
          id: 102,
          cocktailNom: 'Planche Mixte',
          quantite: 1,
          prioritaire: false,
          station: 'SNACK',
          statut: 'EN_ATTENTE'
        }
      ]
    },
    {
      id: 2,
      tableNom: 'Table 2',
      tableNumero: 2,
      serveurNom: 'Camille',
      statut: 'EN_PREPARATION',
      prioritaire: false,
      dateCommande: new Date(Date.now() - 300000).toISOString(),
      items: [
        {
          id: 201,
          cocktailNom: 'Burger Gourmet',
          quantite: 2,
          prioritaire: false,
          station: 'KITCHEN',
          statut: 'EN_PREPARATION'
        }
      ]
    },
    {
      id: 3,
      tableNom: 'Table 3',
      tableNumero: 3,
      serveurNom: 'Lucas',
      statut: 'PRET',
      prioritaire: false,
      dateCommande: new Date(Date.now() - 600000).toISOString(),
      items: [
        {
          id: 301,
          cocktailNom: 'Frites Maison',
          quantite: 1,
          prioritaire: false,
          station: 'KITCHEN',
          statut: 'PRET'
        }
      ]
    }
  ];

  beforeEach(async () => {
    wsTopicKitchen$ = new Subject<any>();
    wsTopicCommandes$ = new Subject<any>();

    dashboardServiceSpy = jasmine.createSpyObj('DashboardBarmanService', [
      'getCommandesEnAttente',
      'getCommandesEnPreparation',
      'getCommandesPret',
      'changerStatut',
      'changerItemStatut'
    ]);

    dashboardServiceSpy.getCommandesEnAttente.and.returnValue(of([mockOrders[0]]));
    dashboardServiceSpy.getCommandesEnPreparation.and.returnValue(of([mockOrders[1]]));
    dashboardServiceSpy.getCommandesPret.and.returnValue(of([mockOrders[2]]));
    dashboardServiceSpy.changerStatut.and.returnValue(of(mockOrders[0]));
    dashboardServiceSpy.changerItemStatut.and.returnValue(of(mockOrders[0]));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    soundServiceSpy = jasmine.createSpyObj('SoundService', [
      'isSoundEnabled',
      'toggleSound',
      'playNewOrderSound',
      'playOrderReadySound'
    ]);
    soundServiceSpy.isSoundEnabled.and.returnValue(true);
    soundServiceSpy.toggleSound.and.returnValue(false);

    wsServiceSpy = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsServiceSpy.watch.and.callFake((topic: string) => {
      if (topic === '/topic/preparation/kitchen') return wsTopicKitchen$.asObservable();
      return wsTopicCommandes$.asObservable();
    });

    await TestBed.configureTestingModule({
      imports: [KdsKitchenComponent, getTranslocoTestingModule()],
      providers: [
        { provide: DashboardBarmanService, useValue: dashboardServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: SoundService, useValue: soundServiceSpy },
        { provide: WebSocketService, useValue: wsServiceSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(KdsKitchenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should initialize and load kitchen orders', () => {
    expect(component).toBeTruthy();
    expect(dashboardServiceSpy.getCommandesEnAttente).toHaveBeenCalled();
    expect(dashboardServiceSpy.getCommandesEnPreparation).toHaveBeenCalled();
    expect(dashboardServiceSpy.getCommandesPret).toHaveBeenCalled();
    expect(component.commandes).toHaveSize(3);
  });

  it('should filter orders correctly by ACTIVE, READY and ALL', () => {
    component.activeFilter = 'ACTIVE';
    const active = component.filteredCommandes;
    expect(active).toHaveSize(2);
    expect(active.some(c => c.id === 1)).toBeTrue();
    expect(active.some(c => c.id === 2)).toBeTrue();

    component.activeFilter = 'READY';
    const ready = component.filteredCommandes;
    expect(ready).toHaveSize(1);
    expect(ready[0].id).toBe(3);

    component.activeFilter = 'ALL';
    const all = component.filteredCommandes;
    expect(all).toHaveSize(3);
  });

  it('should calculate active kitchen orders count and pending items count', () => {
    expect(component.activeKitchenOrdersCount).toBe(2);
    // Order 1 has 1 snack item (qty 1), Order 2 has 2 burger items (qty 2) -> 3 total items to cook
    expect(component.pendingItemsCount).toBe(3);
  });

  it('should filter items to return only kitchen and snack items', () => {
    const items = component.getKitchenItems(mockOrders[0].items);
    expect(items).toHaveSize(1);
    expect(items[0].cocktailNom).toBe('Planche Mixte');
    expect(component.isKitchenItem(items[0])).toBeTrue();
  });

  it('should advance item status and play sound when item becomes ready', fakeAsync(() => {
    const targetOrder = mockOrders[0];
    const targetItem = targetOrder.items[1];

    component.onAdvanceItemStatut(targetOrder, targetItem, 'PRET');
    tick();

    expect(dashboardServiceSpy.changerItemStatut).toHaveBeenCalledWith(1, 102, 'PRET');
    expect(soundServiceSpy.playOrderReadySound).toHaveBeenCalled();
  }));

  it('should mark order ready and update dashboard service', fakeAsync(() => {
    const targetOrder = mockOrders[0];

    component.onMarkOrderReady(targetOrder);
    tick();

    expect(dashboardServiceSpy.changerStatut).toHaveBeenCalledWith(1, 'PRET');
    expect(soundServiceSpy.playOrderReadySound).toHaveBeenCalled();
  }));

  it('should toggle sound alerts and show a toast', fakeAsync(() => {
    component.toggleSound();
    tick();

    expect(soundServiceSpy.toggleSound).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should format elapsed time properly', () => {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 125000);
    const formatted = component.formatElapsedTime(twoMinutesAgo.toISOString());
    expect(formatted).toBe('02:05');
  });

  it('should refresh orders on incoming WebSocket notification', () => {
    dashboardServiceSpy.getCommandesEnAttente.calls.reset();

    wsTopicKitchen$.next({ orderId: 4 });
    expect(dashboardServiceSpy.getCommandesEnAttente).toHaveBeenCalled();
  });
});
