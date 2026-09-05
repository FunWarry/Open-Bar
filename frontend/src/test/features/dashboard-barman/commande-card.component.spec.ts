import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
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

    dashboardServiceSpy = jasmine.createSpyObj('DashboardBarmanService', ['getCocktailById']);
    dashboardServiceSpy.getCocktailById.and.returnValue(of(mockCocktail));

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

  it('openDetails opens TableDetailModalComponent with table data', async () => {
    await component.openDetails();
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        component: jasmine.anything(),
        componentProps: jasmine.objectContaining({
          table: jasmine.objectContaining({ nom: 'Table 1' }),
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

  it('renders priority chip when commande is prioritaire', () => {
    component.commande = makeCommande({ prioritaire: true });
    fixture.detectChanges();

    const chipEl = fixture.nativeElement.querySelector('[data-testid="priority-chip"]');
    expect(chipEl).toBeTruthy();
    expect(chipEl.textContent).toContain('URGENT');
  });

  it('renders server name and print button in card header without collision', () => {
    component.commande = makeCommande({ serveurNom: 'Benoit Chef Barman', tableNom: 'Terrasse 14' });
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
});
