import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of, EMPTY } from 'rxjs';
import { ClientSuiviComponent } from '../../../app/features/client/client-suivi/client-suivi.component';
import { CommandeService } from '../../../app/core/services/commande.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('ClientSuiviComponent', () => {
  let component: ClientSuiviComponent;
  let fixture: ComponentFixture<ClientSuiviComponent>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;
  let websocketServiceSpy: jasmine.SpyObj<WebSocketService>;

  const mockCommande = {
    id: 42,
    tableId: 4,
    tableNumero: 4,
    serveurId: 1,
    serveurUsername: 'serveur',
    statut: 'EN_PREPARATION' as const,
    prixTotal: 17.5,
    items: [
      { id: 1, cocktailId: 1, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 8.75 }
    ]
  };

  beforeEach(async () => {
    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['getById']);
    websocketServiceSpy = jasmine.createSpyObj('WebSocketService', ['watch']);

    commandeServiceSpy.getById.and.returnValue(of(mockCommande as any));
    websocketServiceSpy.watch.and.returnValue(EMPTY);

    await TestBed.configureTestingModule({
      imports: [
        ClientSuiviComponent,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: WebSocketService, useValue: websocketServiceSpy },
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
    expect(component.statusLabel).toBe('En préparation par le barman');
  });
});
