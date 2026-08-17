import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ModalController, ToastController, AlertController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { TableDetailModalComponent } from '../../../app/features/dashboard-serveur/components/table-detail-modal/table-detail-modal.component';
import { DashboardServeurService } from '../../../app/features/dashboard-serveur/services/dashboard-serveur.service';
import { Commande } from '../../../app/core/models/commande.model';
import { TableView } from '../../../app/features/dashboard-serveur/models/table-view.model';

describe('TableDetailModalComponent', () => {
  let component: TableDetailModalComponent;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let routerSpy: jasmine.SpyObj<Router>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardServeurService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let toastSpy: { present: jasmine.Spy };
  let alertSpy: { present: jasmine.Spy };

  const mockTable: TableView = {
    id: 1,
    nom: 'Table 1',
    zone: 'Terrasse',
    capacite: 4,
    occupee: true,
    commandesActives: [],
  };

  const mockCommandes: Commande[] = [
    {
      id: 10,
      statut: 'EN_PREPARATION',
      total: 25.5,
      items: [{ id: 1, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 8.5 }],
    } as Commande,
    {
      id: 11,
      statut: 'EN_ATTENTE',
      total: 10.0,
      items: [{ id: 2, cocktailNom: 'Piña Colada', quantite: 1, prixUnitaire: 10.0 }],
    } as Commande,
  ];

  beforeEach(() => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    dashboardServiceSpy = jasmine.createSpyObj('DashboardServeurService', [
      'getCommandesByTable',
      'annulerCommande',
      'transfererCommande',
    ]);
    dashboardServiceSpy.getCommandesByTable.and.returnValue(of(mockCommandes));

    toastSpy = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy as any));

    alertSpy = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrlSpy.create.and.returnValue(Promise.resolve(alertSpy as any));

    TestBed.configureTestingModule({
      imports: [TableDetailModalComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DashboardServeurService, useValue: dashboardServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TableDetailModalComponent);
    component = fixture.componentInstance;
    component.table = mockTable;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('chargerCommandes() charge les commandes actives et filtre les terminées', () => {
    expect(dashboardServiceSpy.getCommandesByTable).toHaveBeenCalledWith(1);
    expect(component.commandes).toHaveSize(2);
    expect(component.isLoading).toBeFalse();
  });

  it('chargerCommandes() affiche un toast en cas d\'erreur', () => {
    dashboardServiceSpy.getCommandesByTable.and.returnValue(throwError(() => new Error('Error')));

    component.chargerCommandes();

    expect(component.isLoading).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('calculerTotalActif() calcule la somme de toutes les commandes actives', () => {
    expect(component.calculerTotalActif()).toEqual(35.5);
  });

  it('modifierCommande() opens edit-commande-modal and refreshes orders on update', fakeAsync(() => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(
        Promise.resolve({ data: { updated: true } })
      ),
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    component.modifierCommande(mockCommandes[0]);
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(dashboardServiceSpy.getCommandesByTable).toHaveBeenCalledTimes(2);
  }));

  it('modifierCommande() does not refresh if dismissed without update', fakeAsync(() => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(
        Promise.resolve({ data: null })
      ),
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    component.modifierCommande(mockCommandes[0]);
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(dashboardServiceSpy.getCommandesByTable).toHaveBeenCalledTimes(1);
  }));

  it('transferer() opens transfert-modal and transfers order on confirmation', fakeAsync(() => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(
        Promise.resolve({ data: { targetTableId: 2 } })
      ),
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));
    dashboardServiceSpy.transfererCommande.and.returnValue(of(mockCommandes[0]));

    component.transferer(10);
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(dashboardServiceSpy.transfererCommande).toHaveBeenCalledWith(10, 2);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'success' })
    );
  }));

  it('transferer() displays error toast if transfer fails', fakeAsync(() => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(
        Promise.resolve({ data: { targetTableId: 2 } })
      ),
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));
    dashboardServiceSpy.transfererCommande.and.returnValue(throwError(() => new Error('Transfer error')));

    component.transferer(10);
    tick();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'danger' })
    );
  }));

  it('transferer() does nothing if modal is cancelled', fakeAsync(() => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: null })),
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    component.transferer(10);
    tick();

    expect(dashboardServiceSpy.transfererCommande).not.toHaveBeenCalled();
  }));

  it('annuler() presents confirmation alert and cancels on handler execute', fakeAsync(() => {
    let confirmHandler: () => void = () => {};
    alertCtrlSpy.create.and.callFake((options: any) => {
      confirmHandler = options.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return Promise.resolve(alertSpy as any);
    });
    dashboardServiceSpy.annulerCommande.and.returnValue(of(mockCommandes[0]));

    component.annuler(10);
    tick();

    expect(alertCtrlSpy.create).toHaveBeenCalled();
    expect(alertSpy.present).toHaveBeenCalled();

    confirmHandler();
    expect(dashboardServiceSpy.annulerCommande).toHaveBeenCalledWith(10);
  }));

  it('executeAnnulation error displays error toast', () => {
    dashboardServiceSpy.annulerCommande.and.returnValue(throwError(() => new Error('Cancel error')));

    (component as any).executeAnnulation(10);

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'danger' })
    );
  });

  it('peutModifier() and peutAnnuler() check order status rules correctly', () => {
    expect(component.peutModifier('EN_ATTENTE')).toBeTrue();
    expect(component.peutModifier('EN_PREPARATION')).toBeTrue();
    expect(component.peutModifier('PRET')).toBeFalse();
    expect(component.peutModifier('LIVREE')).toBeFalse();

    expect(component.peutAnnuler('EN_ATTENTE')).toBeTrue();
    expect(component.peutAnnuler('PRET')).toBeTrue();
    expect(component.peutAnnuler('LIVREE')).toBeFalse();
    expect(component.peutAnnuler('REGLEE')).toBeFalse();
    expect(component.peutAnnuler('ANNULEE')).toBeFalse();
  });

  it('statutColor() and statutTranslocoKey() return correct mappings', () => {
    expect(component.statutColor('EN_ATTENTE')).toEqual('warning');
    expect(component.statutColor('EN_PREPARATION')).toEqual('primary');
    expect(component.statutColor('PRET')).toEqual('success');
    expect(component.statutColor('LIVREE')).toEqual('medium');

    expect(component.statutTranslocoKey('EN_ATTENTE')).toEqual('TABLE_MODAL.STATUS_EN_ATTENTE');
    expect(component.statutTranslocoKey('PRET')).toEqual('TABLE_MODAL.STATUS_PRET');
  });

  it('nouvelleCommande() ferme et navigue vers la prise de commande', () => {
    component.nouvelleCommande();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/serveur'], { queryParams: { tableId: 1 } });
  });

  it('encaisser() ferme le modal avec l\'action encaisser', () => {
    component.encaisser();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'encaisser', table: mockTable });
  });

  it('liberer() ferme le modal avec l\'action liberer', () => {
    component.liberer();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'liberer', tableId: 1 });
  });

  it('getGroupedItems() consolidates duplicate items into single row with sum of quantities', () => {
    const rawItems = [
      { id: 1, cocktailNom: 'Mojito', quantite: 1, prixUnitaire: 8.5 },
      { id: 2, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 8.5 },
      { id: 3, cocktailNom: 'Piña Colada', quantite: 1, prixUnitaire: 10.0 },
    ];

    const grouped = component.getGroupedItems(rawItems as any);
    expect(grouped).toHaveSize(2);
    expect(grouped[0].cocktailNom).toBe('Mojito');
    expect(grouped[0].quantite).toBe(3);
    expect(grouped[1].cocktailNom).toBe('Piña Colada');
    expect(grouped[1].quantite).toBe(1);
  });

  it('getArticlesTotalCount() calculates the total sum of quantities in an order', () => {
    const rawItems = [
      { id: 1, cocktailNom: 'Mojito', quantite: 2 },
      { id: 2, cocktailNom: 'Bière', quantite: 3 },
    ];

    expect(component.getArticlesTotalCount(rawItems as any)).toBe(5);
    expect(component.getArticlesTotalCount([])).toBe(0);
  });

  it('fermer() ferme le modal sans action', () => {
    component.fermer();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });
});
