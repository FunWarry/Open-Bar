import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular/standalone';
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
  let toastSpy: { present: jasmine.Spy };

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

    TestBed.configureTestingModule({
      imports: [TableDetailModalComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DashboardServeurService, useValue: dashboardServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
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

  it('chargerCommandes() charge les commandes actives', () => {
    expect(dashboardServiceSpy.getCommandesByTable).toHaveBeenCalledWith(1);
    expect(component.commandes).toHaveSize(1);
    expect(component.isLoading).toBeFalse();
  });

  it('chargerCommandes() affiche un toast en cas d\'erreur', () => {
    dashboardServiceSpy.getCommandesByTable.and.returnValue(throwError(() => new Error('Error')));

    component.chargerCommandes();

    expect(component.isLoading).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('transferer() ouvre le transfert-modal et transfère la commande lors de la validation', fakeAsync(() => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(
        Promise.resolve({ data: { targetTableId: 2, targetTableNumero: 3 } })
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

  it('transferer() affiche un toast d\'erreur si le transfert échoue', fakeAsync(() => {
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

  it('transferer() ne fait rien si le modal est annulé', fakeAsync(() => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: null })),
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    component.transferer(10);
    tick();

    expect(dashboardServiceSpy.transfererCommande).not.toHaveBeenCalled();
  }));

  it('annuler() annule la commande', () => {
    dashboardServiceSpy.annulerCommande.and.returnValue(of(mockCommandes[0]));

    component.annuler(10);

    expect(dashboardServiceSpy.annulerCommande).toHaveBeenCalledWith(10);
  });

  it('nouvelleCommande() ferme et navigue vers la prise de commande', () => {
    component.nouvelleCommande();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/serveur/nouvelle-commande', 1]);
  });

  it('liberer() ferme le modal avec l\'action liberer', () => {
    component.liberer();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'liberer', tableId: 1 });
  });

  it('fermer() ferme le modal sans action', () => {
    component.fermer();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });
});
