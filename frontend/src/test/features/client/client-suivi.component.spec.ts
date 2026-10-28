import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { of, EMPTY, throwError } from 'rxjs';
import { ClientSuiviComponent } from '../../../app/features/client/client-suivi/client-suivi.component';
import { CommandeService } from '../../../app/core/services/commande.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { TableAppelService } from '../../../app/core/services/table-appel.service';
import { FeatureFlagService } from '../../../app/core/services/feature-flag.service';
import { OnlinePaymentService } from '../../../app/core/services/online-payment.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TableAppel } from '../../../app/core/models/table-appel.model';

describe('ClientSuiviComponent', () => {
  let component: ClientSuiviComponent;
  let fixture: ComponentFixture<ClientSuiviComponent>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;
  let websocketServiceSpy: jasmine.SpyObj<WebSocketService>;
  let tableAppelServiceSpy: jasmine.SpyObj<TableAppelService>;
  let featureFlagServiceSpy: jasmine.SpyObj<FeatureFlagService>;
  let onlinePaymentServiceSpy: jasmine.SpyObj<OnlinePaymentService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let router: Router;

  const mockAppel: TableAppel = {
    id: 10,
    tableId: 4,
    tableNumero: 4,
    type: 'ASSISTANCE',
    statut: 'EN_ATTENTE',
    createdAt: '2026-08-31T19:00:00',
    updatedAt: '2026-08-31T19:00:00'
  };

  const mockCommande = {
    id: 42,
    tableId: 4,
    tableNumero: 4,
    serveurId: 1,
    serveurUsername: 'serveur',
    statut: 'EN_PREPARATION' as const,
    prixTotal: 17.5,
    total: 17.5,
    dateCommande: '2026-08-16T12:00:00',
    createdAt: '',
    updatedAt: '',
    items: [
      { id: 1, cocktailId: 1, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 8.75 }
    ]
  };

  beforeEach(async () => {
    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['getById']);
    websocketServiceSpy = jasmine.createSpyObj('WebSocketService', ['watch']);
    tableAppelServiceSpy = jasmine.createSpyObj('TableAppelService', [
      'appelerServeur',
      'getAppelsActifsPourTable'
    ]);
    featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['isModuleEnabled']);
    featureFlagServiceSpy.isModuleEnabled.and.returnValue(true);
    onlinePaymentServiceSpy = jasmine.createSpyObj('OnlinePaymentService', [
      'getTableBill',
      'createPaymentIntent',
      'confirmSandboxPayment',
      'downloadReceiptPdf'
    ]);
    onlinePaymentServiceSpy.getTableBill.and.returnValue(of({
      tableId: 4,
      tableNumero: 4,
      totalTTC: 17.5,
      remainingBalance: 17.5,
      items: [],
      alreadyPaidAmount: 0,
      isFullySettled: false,
      onlinePaymentEnabled: true,
      paymentProvider: 'SANDBOX'
    } as any));
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);

    commandeServiceSpy.getById.and.returnValue(of(mockCommande as any));
    websocketServiceSpy.watch.and.returnValue(EMPTY);
    tableAppelServiceSpy.appelerServeur.and.returnValue(of(mockAppel));
    tableAppelServiceSpy.getAppelsActifsPourTable.and.returnValue(of([]));
    toastCtrlSpy.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    await TestBed.configureTestingModule({
      imports: [
        ClientSuiviComponent,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: WebSocketService, useValue: websocketServiceSpy },
        { provide: TableAppelService, useValue: tableAppelServiceSpy },
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy },
        { provide: OnlinePaymentService, useValue: onlinePaymentServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        {
          provide: ActivatedRoute,
          useValue: { params: of({ id: '42' }) }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture = TestBed.createComponent(ClientSuiviComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load order data and watch websocket topic', () => {
    expect(commandeServiceSpy.getById).toHaveBeenCalledWith(42);
    expect(websocketServiceSpy.watch).toHaveBeenCalledWith('/topic/commande/42');
  });

  it('should compute status step 2 for EN_PREPARATION', () => {
    expect(component.statusStep).toBe(2);
    expect(component.statusLabelKey).toBe('CLIENT.STATUS_PREPARING');
  });

  it('should compute status steps and labels for all statuses', () => {
    component.commande = { ...mockCommande, statut: 'EN_ATTENTE' };
    expect(component.statusStep).toBe(1);
    expect(component.statusLabelKey).toBe('CLIENT.STATUS_RECEIVED');

    component.commande = { ...mockCommande, statut: 'PRET' };
    expect(component.statusStep).toBe(3);
    expect(component.statusLabelKey).toBe('CLIENT.STATUS_READY');

    component.commande = { ...mockCommande, statut: 'LIVREE' };
    expect(component.statusStep).toBe(3);
    expect(component.statusLabelKey).toBe('CLIENT.STATUS_SERVED');

    component.commande = { ...mockCommande, statut: 'REGLEE' };
    expect(component.statusStep).toBe(3);
    expect(component.statusLabelKey).toBe('CLIENT.STATUS_SETTLED');

    component.commande = { ...mockCommande, statut: 'ANNULEE' as any };
    expect(component.statusStep).toBe(1);
    expect(component.statusLabelKey).toBe('ANNULEE');

    component.commande = null;
    expect(component.statusStep).toBe(1);
    expect(component.statusLabelKey).toBe('CLIENT.STATUS_RECEIVED');
  });

  it('should redirect to /404 when id is NaN', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route as any).params = of({ id: 'invalid-id' });
    const localFixture = TestBed.createComponent(ClientSuiviComponent);
    localFixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/404']);
  });

  it('should redirect to /404 when loadCommande encounters error', () => {
    commandeServiceSpy.getById.and.returnValue(throwError(() => new Error('Not found')));
    const localFixture = TestBed.createComponent(ClientSuiviComponent);
    localFixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/404']);
  });

  it('should manage payment modal visibility and refresh order on completion', () => {
    expect(component.isPaymentModalOpen()).toBeFalse();
    expect(component.isQrPayAtTableEnabled()).toBeTrue();
    expect(component.canPayThisOrder()).toBeTrue();

    component.openPaymentModal();
    expect(component.isPaymentModalOpen()).toBeTrue();

    component.closePaymentModal();
    expect(component.isPaymentModalOpen()).toBeFalse();

    component.openPaymentModal();
    component.onPaymentCompleted({
      transactionId: 'TX-1',
      status: 'SUCCEEDED',
      baseAmount: 17.5,
      tipAmount: 0,
      totalAmount: 17.5,
      currency: 'EUR',
      remainingBalance: 0,
      isTableFullySettled: true,
      tableLiberated: true
    });
    expect(component.isPaymentModalOpen()).toBeFalse();
    expect(commandeServiceSpy.getById).toHaveBeenCalledWith(42);
  });
});
