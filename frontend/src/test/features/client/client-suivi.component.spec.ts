import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { of, EMPTY } from 'rxjs';
import { ClientSuiviComponent } from '../../../app/features/client/client-suivi/client-suivi.component';
import { CommandeService } from '../../../app/core/services/commande.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { TableAppelService } from '../../../app/core/services/table-appel.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TableAppel } from '../../../app/core/models/table-appel.model';

describe('ClientSuiviComponent', () => {
  let component: ClientSuiviComponent;
  let fixture: ComponentFixture<ClientSuiviComponent>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;
  let websocketServiceSpy: jasmine.SpyObj<WebSocketService>;
  let tableAppelServiceSpy: jasmine.SpyObj<TableAppelService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

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
        { provide: ToastController, useValue: toastCtrlSpy },
        {
          provide: ActivatedRoute,
          useValue: { params: of({ id: '42' }) }
        }
      ]
    }).compileComponents();

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

  it('appelerServeur("ASSISTANCE") in suivi component triggers service and cooldown', fakeAsync(() => {
    component.appelerServeur('ASSISTANCE');

    expect(tableAppelServiceSpy.appelerServeur).toHaveBeenCalledWith(4, 'ASSISTANCE');
    expect(component.cooldownSeconds).toBe(60);
    expect(component.activeCallType).toBe('ASSISTANCE');
    expect(toastCtrlSpy.create).toHaveBeenCalled();

    tick(60000);
    expect(component.cooldownSeconds).toBe(0);
  }));

  it('appelerServeur("ADDITION") in suivi component triggers service and cooldown', () => {
    component.appelerServeur('ADDITION');

    expect(tableAppelServiceSpy.appelerServeur).toHaveBeenCalledWith(4, 'ADDITION');
    expect(component.cooldownSeconds).toBe(60);
    expect(component.activeCallType).toBe('ADDITION');
  });
});
