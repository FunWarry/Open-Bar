import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';
import { CommandeCardComponent } from '../../../app/features/dashboard-barman/components/commande-card/commande-card.component';
import { CommandeView } from '../../../app/features/dashboard-barman/models/commande-view.model';
import { DashboardBarmanService } from '../../../app/features/dashboard-barman/services/dashboard-barman.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { Cocktail } from '../../../app/core/models/cocktail.model';

import { CommandeService } from '../../../app/core/services/commande.service';

const makeCommande = (overrides: Partial<CommandeView> = {}): CommandeView => ({
  id: 1,
  tableNom: 'Table 1',
  tableNumero: 1,
  serveurNom: 'Alice',
  serveurUsername: 'alice',
  statut: 'EN_ATTENTE',
  prioritaire: false,
  dateCommande: new Date(),
  items: [
    {
      id: 10,
      cocktailId: 101,
      cocktailNom: 'Mojito',
      quantite: 2,
      prioritaire: false,
      varianteNom: 'Fraise',
      notes: 'Crushed ice'
    }
  ],
  ...overrides
});

describe('CommandeCardComponent', () => {
  let component: CommandeCardComponent;
  let fixture: ComponentFixture<CommandeCardComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardBarmanService>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;

  const mockModal = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: null }))
  };

  const mockCocktail: Cocktail = {
    id: 101,
    nom: 'Mojito',
    prix: 8.5,
    categorie: 'ALCOOLISE',
    disponible: true,
    saisonnier: false,
    ingredients: [
      { id: 1, ingredientId: 1, ingredientNom: 'Rhum', quantite: 4, uniteMesure: 'cl' }
    ],
    variantes: [],
    instructions: 'Crush mint and add rum.',
    createdAt: '',
    updatedAt: ''
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    dashboardServiceSpy = jasmine.createSpyObj('DashboardBarmanService', [
      'getCocktailById',
      'isItemPrepared',
      'toggleItemPrepared',
      'clearPreparedItems'
    ]);
    dashboardServiceSpy.getCocktailById.and.returnValue(of(mockCocktail));
    dashboardServiceSpy.isItemPrepared.and.returnValue(false);
    dashboardServiceSpy.toggleItemPrepared.and.returnValue(true);

    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['toggleUrgent']);
    commandeServiceSpy.toggleUrgent.and.returnValue(of({ id: 1, prioritaire: true } as any));

    await TestBed.configureTestingModule({
      imports: [CommandeCardComponent, CommonModule, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: DashboardBarmanService, useValue: dashboardServiceSpy },
        { provide: CommandeService, useValue: commandeServiceSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommandeCardComponent);
    component = fixture.componentInstance;
    component.commande = makeCommande();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('tempsEcoule formats minutes and seconds correctly', () => {
    const past = new Date(Date.now() - 65 * 1000); // 1 min 05s ago
    component.commande = makeCommande({ dateCommande: past });
    (component as any).updateTimer();
    expect(component.tempsEcoule).toBe('01:05');
  });

  it('tempsEcoule displays hours when duration exceeds 60 minutes', () => {
    const past = new Date(Date.now() - 75 * 60 * 1000); // 1h15 ago
    component.commande = makeCommande({ dateCommande: past });
    (component as any).updateTimer();
    expect(component.tempsEcoule).toBe('1h15');
  });

  it('evaluates normal, warning, urgent, and critical tiers according to configured thresholds', () => {
    component.tempsAlerteWarningMinutes = 3;
    component.tempsAlerteCommandeMinutes = 5;
    component.tempsAlerteCritiqueCommandeMinutes = 10;

    // Normal (< 3 min)
    component.commande = makeCommande({ dateCommande: new Date(Date.now() - 2 * 60 * 1000) });
    (component as any).updateTimer();
    expect(component.isWarning).toBeFalse();
    expect(component.isUrgent).toBeFalse();
    expect(component.isCritical).toBeFalse();

    // Warning (3 to 5 min)
    component.commande = makeCommande({ dateCommande: new Date(Date.now() - 4 * 60 * 1000) });
    (component as any).updateTimer();
    expect(component.isWarning).toBeTrue();
    expect(component.isUrgent).toBeFalse();
    expect(component.isCritical).toBeFalse();

    // Urgent (5 to 10 min)
    component.commande = makeCommande({ dateCommande: new Date(Date.now() - 7 * 60 * 1000) });
    (component as any).updateTimer();
    expect(component.isWarning).toBeFalse();
    expect(component.isUrgent).toBeTrue();
    expect(component.isCritical).toBeFalse();

    // Critical (>= 10 min)
    component.commande = makeCommande({ dateCommande: new Date(Date.now() - 12 * 60 * 1000) });
    (component as any).updateTimer();
    expect(component.isWarning).toBeFalse();
    expect(component.isUrgent).toBeFalse();
    expect(component.isCritical).toBeTrue();
  });

  it('lisereColor returns appropriate semantic color for normal and alert states', () => {
    component.isCritical = false;
    component.isUrgent = false;
    component.isWarning = false;
    component.commande = makeCommande({ statut: 'EN_ATTENTE' });
    expect(component.lisereColor).toBe('var(--semantic-warning)');

    component.commande = makeCommande({ statut: 'EN_PREPARATION' });
    expect(component.lisereColor).toBe('var(--semantic-info)');

    component.commande = makeCommande({ statut: 'PRET' });
    expect(component.lisereColor).toBe('var(--semantic-success)');

    component.isWarning = true;
    expect(component.lisereColor).toBe('var(--semantic-warning)');

    component.isWarning = false;
    component.isUrgent = true;
    expect(component.lisereColor).toBe('var(--semantic-danger)');

    component.isUrgent = false;
    component.isCritical = true;
    expect(component.lisereColor).toBe('var(--semantic-danger)');
  });

  it('onPrendreEnCharge emits changerStatut with EN_PREPARATION status', () => {
    const emitted: { id: number; statut: string }[] = [];
    component.changerStatut.subscribe(val => emitted.push(val));
    component.commande = makeCommande({ id: 42 });
    component.onPrendreEnCharge();

    expect(emitted).toEqual([{ id: 42, statut: 'EN_PREPARATION' }]);
  });

  it('onMarquerPret emits changerStatut with PRET status', () => {
    const emitted: { id: number; statut: string }[] = [];
    component.changerStatut.subscribe(val => emitted.push(val));
    component.commande = makeCommande({ id: 7 });
    component.onMarquerPret();

    expect(emitted).toEqual([{ id: 7, statut: 'PRET' }]);
  });

  it('onPrintTicket emits printTicket event', () => {
    const emitted: CommandeView[] = [];
    component.printTicket.subscribe(cmd => emitted.push(cmd));

    component.onPrintTicket();
    expect(emitted).toHaveSize(1);
    expect(emitted[0].id).toBe(1);
  });

  it('openDetails opens CommandeDetailModalComponent with order data', async () => {
    await component.openDetails();
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        component: jasmine.anything(),
        componentProps: jasmine.objectContaining({
          commandeId: 1,
        }),
      })
    );
    expect(mockModal.present).toHaveBeenCalled();
  });

  it('onOpenRecipe emits showRecipe with item and order reference', () => {
    const emitted: { item: any; commande: CommandeView }[] = [];
    component.showRecipe.subscribe(val => emitted.push(val));
    const item = component.groupedItems[0];

    component.onOpenRecipe(item);
    expect(emitted).toHaveSize(1);
    expect(emitted[0].item.cocktailNom).toBe('Mojito');
    expect(emitted[0].commande.id).toBe(1);
  });

  it('timer updates each second', fakeAsync(() => {
    component.commande = makeCommande({ dateCommande: new Date() });
    component.ngOnInit();
    tick(2000);
    expect(component.tempsEcoule).toMatch(/\d{2}:\d{2}/);
    component.ngOnDestroy();
  }));

  it('renders priority chip when commande is prioritaire without duplicating urgent status badge', () => {
    fixture.componentRef.setInput('commande', makeCommande({ prioritaire: true }));
    fixture.detectChanges();

    const chipEl = fixture.nativeElement.querySelector('[data-testid="priority-chip"]');
    expect(chipEl).toBeTruthy();
    expect(chipEl.textContent).toContain('URGENT');

    const duplicateUrgentBadge = fixture.nativeElement.querySelector('[data-testid="status-badge-urgent"]');
    expect(duplicateUrgentBadge).toBeNull();
  });

  it('renders server name and print button in card header without collision', () => {
    fixture.componentRef.setInput('commande', makeCommande({ serveurNom: 'Benoit Chef Barman', tableNom: 'Terrasse 14' }));
    fixture.detectChanges();

    const serverEl = fixture.nativeElement.querySelector('.server-name');
    const tableEl = fixture.nativeElement.querySelector('.table-name');
    const printBtnEl = fixture.nativeElement.querySelector('[data-testid="print-ticket-btn"]');

    expect(serverEl).toBeTruthy();
    expect(serverEl.textContent).toContain('Benoit Chef Barman');
    expect(tableEl).toBeTruthy();
    expect(tableEl.textContent).toContain('Terrasse 14');
    expect(printBtnEl).toBeTruthy();
  });

  it('onToggleUrgent toggles priority state', fakeAsync(() => {
    const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation']);
    component.commande = makeCommande({ prioritaire: false });
    component.onToggleUrgent(mockEvent);
    tick();

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(commandeServiceSpy.toggleUrgent).toHaveBeenCalledWith(1);
    expect(component.commande.prioritaire).toBeTrue();
  }));

  it('groupedItems filters items according to stationFilter (KITCHEN and BAR)', () => {
    component.commande = makeCommande({
      items: [
        { id: 1, cocktailNom: 'Mojito', quantite: 1, station: 'BAR' } as any,
        { id: 2, cocktailNom: 'Nachos', quantite: 1, station: 'KITCHEN' } as any,
      ]
    });

    component.stationFilter = 'ALL';
    expect(component.groupedItems).toHaveSize(2);

    component.stationFilter = 'KITCHEN';
    expect(component.groupedItems).toHaveSize(1);
    expect(component.groupedItems[0].cocktailNom).toBe('Nachos');

    component.stationFilter = 'BAR';
    expect(component.groupedItems).toHaveSize(1);
    expect(component.groupedItems[0].cocktailNom).toBe('Mojito');
  });

  describe('Item-level prepared checkmarks and progress tracking (#574)', () => {
    it('renders checkmark button for each item line with testid and aria-label', () => {
      fixture.componentRef.setInput('commande', makeCommande({
        statut: 'EN_PREPARATION',
        items: [
          { id: 11, cocktailNom: 'Mojito', quantite: 2, prioritaire: false },
          { id: 12, cocktailNom: 'Moscow Mule', quantite: 1, prioritaire: false }
        ]
      }));
      fixture.detectChanges();

      const checkBtns = fixture.nativeElement.querySelectorAll('.item-check-btn');
      expect(checkBtns).toHaveSize(2);
      expect(checkBtns[0].getAttribute('data-testid')).toBe('item-check-btn-11');
      expect(checkBtns[1].getAttribute('data-testid')).toBe('item-check-btn-12');
    });

    it('disables item checkmark buttons when order status is EN_ATTENTE', () => {
      fixture.componentRef.setInput('commande', makeCommande({
        statut: 'EN_ATTENTE',
        items: [{ id: 11, cocktailNom: 'Mojito', quantite: 1, prioritaire: false }]
      }));
      fixture.detectChanges();

      const checkBtn = fixture.nativeElement.querySelector('[data-testid="item-check-btn-11"]') as HTMLButtonElement;
      expect(checkBtn).toBeTruthy();
      expect(checkBtn.disabled).toBeTrue();

      // Clicking while EN_ATTENTE should not trigger toggleItemPrepared
      const clickEvent = new MouseEvent('click');
      spyOn(clickEvent, 'stopPropagation');
      component.toggleItemPrepared(component.groupedItems[0], clickEvent);
      expect(dashboardServiceSpy.toggleItemPrepared).not.toHaveBeenCalled();
    });

    it('enables item checkmark buttons and toggles prepared state when order is EN_PREPARATION', () => {
      fixture.componentRef.setInput('commande', makeCommande({
        id: 77,
        statut: 'EN_PREPARATION',
        items: [{ id: 15, cocktailNom: 'Mojito', quantite: 2, prioritaire: false }]
      }));
      fixture.detectChanges();

      const checkBtn = fixture.nativeElement.querySelector('[data-testid="item-check-btn-15"]') as HTMLButtonElement;
      expect(checkBtn).toBeTruthy();
      expect(checkBtn.disabled).toBeFalse();

      const stopPropagationSpy = jasmine.createSpy('stopPropagation');
      const fakeEvent = { stopPropagation: stopPropagationSpy } as unknown as Event;

      component.toggleItemPrepared(component.groupedItems[0], fakeEvent);
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(dashboardServiceSpy.toggleItemPrepared).toHaveBeenCalledWith(77, 15, undefined);
    });

    it('computes totalItemsCount and preparedItemsCount based on total drink quantities', () => {
      component.commande = makeCommande({
        id: 88,
        statut: 'EN_PREPARATION',
        items: [
          { id: 21, cocktailNom: 'Mojito', quantite: 3, prioritaire: false },
          { id: 22, cocktailNom: 'Caipirinha', quantite: 2, prioritaire: false }
        ]
      });

      expect(component.totalItemsCount).toBe(5);
      expect(component.preparedItemsCount).toBe(0);
      expect(component.isAllItemsPrepared).toBeFalse();

      // Mock first item as prepared
      dashboardServiceSpy.isItemPrepared.and.callFake((cmdId, itemId) => itemId === 21);
      expect(component.preparedItemsCount).toBe(3);
      expect(component.isAllItemsPrepared).toBeFalse();

      // Mock both items as prepared
      dashboardServiceSpy.isItemPrepared.and.returnValue(true);
      expect(component.preparedItemsCount).toBe(5);
      expect(component.isAllItemsPrepared).toBeTrue();
    });

    it('displays progress badge in card header during EN_PREPARATION', () => {
      fixture.componentRef.setInput('commande', makeCommande({
        id: 99,
        statut: 'EN_PREPARATION',
        items: [
          { id: 31, cocktailNom: 'Spritz', quantite: 2, prioritaire: false },
          { id: 32, cocktailNom: 'Negroni', quantite: 1, prioritaire: false }
        ]
      }));
      dashboardServiceSpy.isItemPrepared.and.callFake((cmdId, itemId) => itemId === 31);
      fixture.detectChanges();

      const badgeEl = fixture.nativeElement.querySelector('[data-testid="card-progress-badge"]');
      expect(badgeEl).toBeTruthy();
      expect(badgeEl.textContent).toContain('2/3');
    });

    it('does not display progress badge when order is in EN_ATTENTE', () => {
      fixture.componentRef.setInput('commande', makeCommande({
        id: 99,
        statut: 'EN_ATTENTE',
        items: [{ id: 31, cocktailNom: 'Spritz', quantite: 2, prioritaire: false }]
      }));
      fixture.detectChanges();

      const badgeEl = fixture.nativeElement.querySelector('[data-testid="card-progress-badge"]');
      expect(badgeEl).toBeNull();
    });

    it('applies item-prepared class (dimmed and strikethrough) when item is marked prepared', () => {
      fixture.componentRef.setInput('commande', makeCommande({
        id: 101,
        statut: 'EN_PREPARATION',
        items: [{ id: 41, cocktailNom: 'Gin Fizz', quantite: 1, prioritaire: false }]
      }));
      dashboardServiceSpy.isItemPrepared.and.returnValue(true);
      fixture.detectChanges();

      const itemInfoEl = fixture.nativeElement.querySelector('.item-info');
      expect(itemInfoEl).toBeTruthy();
      expect(itemInfoEl.classList.contains('item-prepared')).toBeTrue();
    });

    it('applies btn-pulse-ready to mark-ready-btn when 100% of items are prepared', () => {
      fixture.componentRef.setInput('commande', makeCommande({
        id: 102,
        statut: 'EN_PREPARATION',
        items: [{ id: 51, cocktailNom: 'Cuba Libre', quantite: 1, prioritaire: false }]
      }));
      dashboardServiceSpy.isItemPrepared.and.returnValue(true);
      fixture.detectChanges();

      const readyBtnEl = fixture.nativeElement.querySelector('[data-testid="mark-ready-btn"]');
      expect(readyBtnEl).toBeTruthy();
      expect(readyBtnEl.classList.contains('btn-pulse-ready')).toBeTrue();
    });

    it('onMarquerPret clears in-flight prepared items and emits changerStatut', () => {
      const emitted: { id: number; statut: string }[] = [];
      component.changerStatut.subscribe(val => emitted.push(val));
      component.commande = makeCommande({ id: 103, statut: 'EN_PREPARATION' });

      component.onMarquerPret();
      expect(dashboardServiceSpy.clearPreparedItems).toHaveBeenCalledWith(103);
      expect(emitted).toEqual([{ id: 103, statut: 'PRET' }]);
    });

    it('renders companion glassware chip when item has companion glassware', () => {
      fixture.componentRef.setInput('commande', makeCommande({
        id: 104,
        statut: 'EN_ATTENTE',
        items: [
          {
            id: 61,
            cocktailNom: 'Pornstar Martini',
            quantite: 1,
            prioritaire: false,
            glasswareNom: 'Coupe Martini',
            secondaryGlasswareNom: 'Shot',
            companionGlassTitle: 'Shot Prosecco',
          } as any
        ]
      }));
      fixture.detectChanges();

      const chipEl = fixture.nativeElement.querySelector('[data-testid="item-companion-glass-chip"]');
      expect(chipEl).toBeTruthy();
      expect(chipEl.textContent).toContain('Shot Prosecco');
    });
  });
});
