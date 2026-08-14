import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { BarTicketPrintComponent } from '../../../app/features/dashboard-barman/components/bar-ticket-print/bar-ticket-print.component';
import { CommandeView } from '../../../app/features/dashboard-barman/models/commande-view.model';
import { AppSettingsService } from '../../../app/core/services/app-settings.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('BarTicketPrintComponent', () => {
  let component: BarTicketPrintComponent;
  let fixture: ComponentFixture<BarTicketPrintComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let settingsServiceSpy: jasmine.SpyObj<AppSettingsService>;

  const mockCommande: CommandeView = {
    id: 123,
    tableNom: 'Table 5',
    tableNumero: 5,
    serveurNom: 'Bob',
    serveurUsername: 'bob',
    statut: 'EN_ATTENTE',
    prioritaire: true,
    dateCommande: new Date(),
    items: [
      { id: 1, cocktailNom: 'Mojito', quantite: 2, prioritaire: false, varianteNom: 'Fraise' },
      { id: 2, cocktailNom: 'Pina Colada', quantite: 1, prioritaire: false, notes: 'Sans alcool' }
    ]
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    settingsServiceSpy = jasmine.createSpyObj('AppSettingsService', ['getSettings']);
    settingsServiceSpy.getSettings.and.returnValue(
      of({
        id: 1,
        primaryColor: '#6c7fe8',
        primaryColorStrong: '#5a68d6',
        logoUrl: null,
        establishmentName: 'Le Bar Basque',
        defaultTheme: 'DARK',
        tempsAlerteCommandeMinutes: 5,
        tempsAlerteCritiqueCommandeMinutes: 10,
        updatedAt: null
      })
    );

    await TestBed.configureTestingModule({
      imports: [BarTicketPrintComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: AppSettingsService, useValue: settingsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BarTicketPrintComponent);
    component = fixture.componentInstance;
    component.commande = mockCommande;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('charge le nom de l établissement depuis AppSettingsService', () => {
    expect(component.establishmentName).toBe('Le Bar Basque');
  });

  it('calcule le nombre total d articles correctement', () => {
    expect(component.totalItemsCount).toBe(3);
  });

  it('printTicket() déclenche window.print', () => {
    spyOn(window, 'print');
    component.printTicket();
    expect(window.print).toHaveBeenCalled();
  });

  it('dismiss() ferme la modale', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });
});
