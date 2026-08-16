import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { TransfertModalComponent } from '../../../app/features/dashboard-serveur/components/transfert-modal/transfert-modal.component';
import { TableService } from '../../../app/core/services/table.service';
import { TableBar } from '../../../app/core/models/table.model';

describe('TransfertModalComponent', () => {
  let component: TransfertModalComponent;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;

  const mockTables: TableBar[] = [
    { id: 1, numero: 1, zone: 'TERRASSE', capacite: 4, occupee: true, createdAt: '', updatedAt: '' },
    { id: 2, numero: 2, zone: 'INTERIEUR', capacite: 2, occupee: false, createdAt: '', updatedAt: '' },
    { id: 3, numero: 3, zone: 'ETAGE', capacite: 6, occupee: false, createdAt: '', updatedAt: '' },
  ];

  beforeEach(() => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    tableServiceSpy = jasmine.createSpyObj('TableService', ['getAll']);
    tableServiceSpy.getAll.and.returnValue(of(mockTables));

    TestBed.configureTestingModule({
      imports: [TransfertModalComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: TableService, useValue: tableServiceSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TransfertModalComponent);
    component = fixture.componentInstance;
    component.currentTableId = 1;
    component.commandeId = 42;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('chargerTables() exclut la table source actuelle', () => {
    expect(tableServiceSpy.getAll).toHaveBeenCalled();
    expect(component.tables).toHaveSize(2);
    expect(component.tables.some(t => t.id === 1)).toBeFalse();
    expect(component.isLoading).toBeFalse();
  });

  it('chargerTables() gère l\'erreur API proprement', () => {
    tableServiceSpy.getAll.and.returnValue(throwError(() => new Error('API Error')));

    component.chargerTables();

    expect(component.isLoading).toBeFalse();
  });

  it('selectionnerTable() ferme le modal avec l\'ID et le numéro de la table cible', () => {
    const targetTable = mockTables[1];

    component.selectionnerTable(targetTable);

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      targetTableId: 2,
      targetTableNumero: 2,
    });
  });

  it('fermer() ferme le modal sans sélection', () => {
    component.fermer();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null);
  });
});
