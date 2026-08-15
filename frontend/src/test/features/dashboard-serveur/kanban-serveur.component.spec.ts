import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { KanbanServeurComponent } from '../../../app/features/dashboard-serveur/kanban-serveur/kanban-serveur.component';
import { DashboardServeurService } from '../../../app/features/dashboard-serveur/services/dashboard-serveur.service';
import { NotificationService, AppNotification } from '../../../app/core/services/notification.service';
import { Commande } from '../../../app/core/models/commande.model';
import { TableView } from '../../../app/features/dashboard-serveur/models/table-view.model';

const cmd = (id: number, statut: Commande['statut'], tableId: number): Commande => ({
  id, tableId, tableNumero: tableId, serveurId: 1, serveurUsername: 'alice',
  items: [], statut, total: 10,
  dateCommande: '2026-06-23T10:00:00', createdAt: '', updatedAt: '',
});

const mockTables: TableView[] = [
  { id: 1, nom: 'Table 1', zone: 'TERRASSE', capacite: 4, occupee: true, commandesActives: [] },
  { id: 2, nom: 'Table 2', zone: 'INTERIEUR', capacite: 2, occupee: false, commandesActives: [] },
];

describe('KanbanServeurComponent', () => {
  let component: KanbanServeurComponent;
  let fixture: ComponentFixture<KanbanServeurComponent>;
  let serviceSpy: jasmine.SpyObj<DashboardServeurService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let notification$: Subject<AppNotification>;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    notification$ = new Subject<AppNotification>();

    serviceSpy = jasmine.createSpyObj('DashboardServeurService', [
      'getCommandesParStatut', 'getAllTables',
      'changerStatutCommande', 'annulerCommande',
    ]);
    serviceSpy.getCommandesParStatut.and.callFake((statut: string) => {
      if (statut === 'EN_ATTENTE')    return of([cmd(1, 'EN_ATTENTE', 1)]);
      if (statut === 'EN_PREPARATION') return of([cmd(2, 'EN_PREPARATION', 1)]);
      if (statut === 'PRET')          return of([cmd(3, 'PRET', 2)]);
      if (statut === 'LIVREE')        return of([]);
      return of([]);
    });
    serviceSpy.getAllTables.and.returnValue(of(mockTables));
    serviceSpy.changerStatutCommande.and.returnValue(of(cmd(3, 'LIVREE', 2) as any));
    serviceSpy.annulerCommande.and.returnValue(of(cmd(1, 'ANNULEE', 1) as any));

    notificationSpy = jasmine.createSpyObj('NotificationService', ['onNotification', 'onStockAlert']);
    notificationSpy.onNotification.and.returnValue(notification$.asObservable());
    notificationSpy.onStockAlert.and.returnValue(EMPTY);

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve({
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: { action: 'settled' } })),
    } as any));

    await TestBed.configureTestingModule({
      imports: [KanbanServeurComponent, IonicModule.forRoot(), RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: DashboardServeurService, useValue: serviceSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanServeurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => expect(component).toBeTruthy());

  it('charger() peuple les 4 colonnes du kanban', fakeAsync(() => {
    component.charger();
    tick();
    const enAttente = component.colonnes.find(c => c.statut === 'EN_ATTENTE')!;
    const pret = component.colonnes.find(c => c.statut === 'PRET')!;
    const livree = component.colonnes.find(c => c.statut === 'LIVREE')!;
    expect(enAttente.commandes).toHaveSize(1);
    expect(pret.commandes).toHaveSize(1);
    expect(livree.commandes).toHaveSize(0);
  }));

  it('charger() appelle getCommandesParStatut pour les 4 statuts', fakeAsync(() => {
    component.charger();
    tick();
    expect(serviceSpy.getCommandesParStatut).toHaveBeenCalledWith('EN_ATTENTE');
    expect(serviceSpy.getCommandesParStatut).toHaveBeenCalledWith('EN_PREPARATION');
    expect(serviceSpy.getCommandesParStatut).toHaveBeenCalledWith('PRET');
    expect(serviceSpy.getCommandesParStatut).toHaveBeenCalledWith('LIVREE');
  }));

  it('charger() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.getCommandesParStatut.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- filtre ---

  it('onFiltreChange() filtre les commandes par tableId', fakeAsync(() => {
    component.charger();
    tick();
    component.onFiltreChange(2);
    const enAttente = component.colonnes.find(c => c.statut === 'EN_ATTENTE')!;
    expect(enAttente.commandes).toHaveSize(0); // cmd(1) est sur table 1
    const pret = component.colonnes.find(c => c.statut === 'PRET')!;
    expect(pret.commandes).toHaveSize(1); // cmd(3) est sur table 2
  }));

  it('onFiltreChange(null) affiche toutes les commandes', fakeAsync(() => {
    component.charger();
    tick();
    component.onFiltreChange(2);
    component.onFiltreChange(null);
    const enAttente = component.colonnes.find(c => c.statut === 'EN_ATTENTE')!;
    expect(enAttente.commandes).toHaveSize(1);
  }));

  // --- marquerLivree ---

  it('marquerLivree() appelle changerStatutCommande avec LIVREE et recharge', fakeAsync(() => {
    component.marquerLivree(3);
    tick();
    flushMicrotasks();
    expect(serviceSpy.changerStatutCommande).toHaveBeenCalledWith(3, 'LIVREE');
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('marquerLivree() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.changerStatutCommande.and.returnValue(throwError(() => new Error('err')));
    component.marquerLivree(3);
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- annuler ---

  it('annuler() appelle annulerCommande et recharge', fakeAsync(() => {
    component.annuler(1);
    tick();
    flushMicrotasks();
    expect(serviceSpy.annulerCommande).toHaveBeenCalledWith(1);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'medium' }));
  }));

  it('annuler() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.annulerCommande.and.returnValue(throwError(() => new Error('err')));
    component.annuler(1);
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- WS ---

  it('recharge les commandes sur notification "commande"', fakeAsync(() => {
    const before = serviceSpy.getCommandesParStatut.calls.count();
    notification$.next({ id: 'c-1', type: 'commande', message: '', severity: 'primary', timestamp: new Date(), lue: false });
    tick();
    expect(serviceSpy.getCommandesParStatut.calls.count()).toBeGreaterThan(before);
  }));

  it('ne recharge pas sur notification "stock"', fakeAsync(() => {
    const before = serviceSpy.getCommandesParStatut.calls.count();
    notification$.next({ id: 's-1', type: 'stock', message: '', severity: 'warning', timestamp: new Date(), lue: false });
    tick();
    expect(serviceSpy.getCommandesParStatut.calls.count()).toBe(before);
  }));

  it('trackById retourne l\'id de la commande', () => {
    expect(component.trackById(0, cmd(7, 'PRET', 1))).toBe(7);
  });

  it('ouvrirEncaissementParTableId ouvre le modal d\'encaissement', fakeAsync(() => {
    component.tables = mockTables;
    component.ouvrirEncaissementParTableId(1);
    tick();
    expect(modalCtrlSpy.create).toHaveBeenCalled();
  }));
});
