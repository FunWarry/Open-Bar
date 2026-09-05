import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModalController, ToastController, AlertController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { EditCommandeModalComponent } from '../../../app/features/dashboard-serveur/components/edit-commande-modal/edit-commande-modal.component';
import { DashboardServeurService } from '../../../app/features/dashboard-serveur/services/dashboard-serveur.service';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { Commande } from '../../../app/core/models/commande.model';
import { Cocktail } from '../../../app/core/models/cocktail.model';

describe('EditCommandeModalComponent', () => {
  let component: EditCommandeModalComponent;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardServeurService>;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let toastSpy: { present: jasmine.Spy };
  let alertSpy: { present: jasmine.Spy };

  const mockCommande: Commande = {
    id: 10,
    tableId: 1,
    serveurId: 2,
    statut: 'EN_ATTENTE',
    notes: 'Table VIP',
    total: 17.0,
    pourboire: 2.0,
    items: [
      { id: 101, cocktailId: 1, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 8.5, notes: 'Sans paille' },
    ],
  } as Commande;

  const mockCocktails: Cocktail[] = [
    {
      id: 1,
      nom: 'Mojito',
      prix: 8.5,
      categorie: 'ALCOOLISE',
      disponible: true,
      variantes: [
        { id: 10, nom: 'XL', prixSupplement: 2.0, disponible: true },
      ],
      ingredients: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    } as unknown as Cocktail,
    {
      id: 2,
      nom: 'Piña Colada',
      prix: 9.0,
      categorie: 'ALCOOLISE',
      disponible: true,
      variantes: [],
      ingredients: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    } as unknown as Cocktail,
  ];

  beforeEach(() => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    toastSpy = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy as any));

    alertSpy = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrlSpy.create.and.returnValue(Promise.resolve(alertSpy as any));

    dashboardServiceSpy = jasmine.createSpyObj('DashboardServeurService', ['modifierCommande']);
    cocktailServiceSpy = jasmine.createSpyObj('CocktailService', ['getAll']);
    cocktailServiceSpy.getAll.and.returnValue(of(mockCocktails));

    TestBed.configureTestingModule({
      imports: [EditCommandeModalComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
        { provide: DashboardServeurService, useValue: dashboardServiceSpy },
        { provide: CocktailService, useValue: cocktailServiceSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(EditCommandeModalComponent);
    component = fixture.componentInstance;
    component.commande = { ...mockCommande, items: [...mockCommande.items] };
    component.tableNumero = 1;
    fixture.detectChanges();
  });

  it('should create and initialize from commande', () => {
    expect(component).toBeTruthy();
    expect(component.items).toHaveSize(1);
    expect(component.items[0].cocktailNom).toBe('Mojito');
    expect(component.orderNotes).toBe('Table VIP');
    expect(component.pourboire).toBe(2.0);
    expect(cocktailServiceSpy.getAll).toHaveBeenCalled();
  });

  it('consolidates identical items into a single line upon initializing from commande', () => {
    const fixture2 = TestBed.createComponent(EditCommandeModalComponent);
    const comp2 = fixture2.componentInstance;
    comp2.commande = {
      ...mockCommande,
      items: [
        { id: 1, cocktailId: 1, cocktailNom: 'Mojito', quantite: 1, prixUnitaire: 8.5 },
        { id: 2, cocktailId: 1, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 8.5 },
      ] as any,
    };
    fixture2.detectChanges();

    expect(comp2.items).toHaveSize(1);
    expect(comp2.items[0].quantite).toBe(3);
  });

  it('calculates total correctly including items and tip', () => {
    // 2 * 8.5 + 2.0 = 19.0
    expect(component.calculateTotal()).toBe(19.0);
  });

  it('increments item quantity', () => {
    component.incrementItem(0);
    expect(component.items[0].quantite).toBe(3);
    expect(component.calculateTotal()).toBe(27.5);
  });

  it('decrements item quantity when > 1', () => {
    component.decrementItem(0);
    expect(component.items[0].quantite).toBe(1);
  });

  it('prevents removing last item from order', fakeAsync(() => {
    component.removeItem(0);
    tick();

    expect(alertCtrlSpy.create).not.toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'warning' })
    );
  }));

  it('removes item with confirmation when items count > 1', fakeAsync(() => {
    component.items.push({
      cocktailId: 2,
      cocktailNom: 'Piña Colada',
      prixUnitaire: 9.0,
      quantite: 1,
      notes: '',
      prioritaire: false,
    });

    let deleteHandler: () => void = () => {};
    alertCtrlSpy.create.and.callFake((options: any) => {
      deleteHandler = options.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return Promise.resolve(alertSpy as any);
    });

    component.removeItem(1);
    tick();

    expect(alertCtrlSpy.create).toHaveBeenCalled();
    expect(alertSpy.present).toHaveBeenCalled();

    deleteHandler();
    expect(component.items).toHaveSize(1);
  }));

  it('adds new item from catalog with variant price supplement', () => {
    component.onCocktailSelected(1);
    component.selectedVarianteId = 10;
    component.selectedQuantity = 2;
    component.selectedItemNotes = 'Bien frais';

    component.addNewItem();

    expect(component.items).toHaveSize(2);
    const added = component.items[1];
    expect(added.cocktailNom).toBe('Mojito');
    expect(added.varianteNom).toBe('XL');
    expect(added.prixUnitaire).toBe(10.5); // 8.5 + 2.0
    expect(added.quantite).toBe(2);
    expect(added.notes).toBe('Bien frais');

    // Selector fields should reset
    expect(component.selectedCocktailId).toBeNull();
    expect(component.selectedVarianteId).toBeNull();
    expect(component.selectedQuantity).toBe(1);
  });

  it('merges quantity if exact duplicate item is added', () => {
    component.onCocktailSelected(1);
    component.selectedVarianteId = null;
    component.selectedQuantity = 1;
    component.selectedItemNotes = 'Sans paille';

    component.addNewItem();

    expect(component.items).toHaveSize(1);
    expect(component.items[0].quantite).toBe(3); // 2 + 1
  });

  it('submits modifications and closes modal with updated data', fakeAsync(() => {
    const updatedMock = { ...mockCommande, total: 30.0 };
    dashboardServiceSpy.modifierCommande.and.returnValue(of(updatedMock));

    component.onSubmit();
    tick();

    expect(dashboardServiceSpy.modifierCommande).toHaveBeenCalledWith(
      10,
      jasmine.objectContaining({
        items: jasmine.arrayContaining([
          jasmine.objectContaining({ cocktailId: 1, quantite: 2 }),
        ]),
      })
    );
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'success' })
    );
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ updated: true, commande: updatedMock });
  }));

  it('displays error toast when submission fails', fakeAsync(() => {
    dashboardServiceSpy.modifierCommande.and.returnValue(throwError(() => new Error('API error')));

    component.onSubmit();
    tick();

    expect(component.isSubmitting).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'danger' })
    );
    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
  }));

  it('dismiss() closes modal without action', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });
});
