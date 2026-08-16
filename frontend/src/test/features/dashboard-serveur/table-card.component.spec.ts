import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { TableCardComponent } from '../../../app/features/dashboard-serveur/components/table-card/table-card.component';
import { TableView } from '../../../app/features/dashboard-serveur/models/table-view.model';

const tableLibre: TableView = {
  id: 1,
  nom: 'Table 1',
  zone: 'Terrasse',
  capacite: 4,
  occupee: false,
  commandesActives: []
};

const tableOccupee: TableView = {
  id: 2,
  nom: 'Table 2',
  zone: 'Salle',
  capacite: 2,
  occupee: true,
  serveurNom: 'Alice',
  commandesActives: [
    { id: 10, statut: 'EN_ATTENTE', itemCount: 2, total: 16.0 }
  ]
};

const tableEnCours: TableView = {
  id: 3,
  nom: 'Table 3',
  zone: 'Bar',
  capacite: 6,
  occupee: true,
  serveurNom: 'Bob',
  commandesActives: [
    { id: 20, statut: 'EN_PREPARATION', itemCount: 3, total: 24.0 },
    { id: 21, statut: 'EN_ATTENTE', itemCount: 1, total: 8.0 }
  ]
};

describe('TableCardComponent', () => {
  let component: TableCardComponent;
  let fixture: ComponentFixture<TableCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TableCardComponent,
        CommonModule,
        RouterTestingModule,
        IonicModule.forRoot()
      , getTranslocoTestingModule()]
    }).compileComponents();

    fixture = TestBed.createComponent(TableCardComponent);
    component = fixture.componentInstance;
    component.table = tableLibre;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- statutLabel ---

  it('statutLabel returns "Libre" if table is not occupied', () => {
    component.table = tableLibre;
    expect(component.statutLabel).toBe('Libre');
  });

  it('statutLabel returns "En cours" if table occupied with EN_PREPARATION orders', () => {
    component.table = tableEnCours;
    expect(component.statutLabel).toBe('En cours');
  });

  it('statutLabel returns "Occupée" if table occupied without EN_PREPARATION orders', () => {
    component.table = tableOccupee;
    expect(component.statutLabel).toBe('Occupée');
  });

  // --- statutClass ---

  it('statutClass returns "table-free" if table not occupied', () => {
    component.table = tableLibre;
    expect(component.statutClass).toBe('table-free');
  });

  it('statutClass returns "table-inprogress" if table occupied with EN_PREPARATION orders', () => {
    component.table = tableEnCours;
    expect(component.statutClass).toBe('table-inprogress');
  });

  it('statutClass returns "table-occupied" if table occupied without EN_PREPARATION orders', () => {
    component.table = tableOccupee;
    expect(component.statutClass).toBe('table-occupied');
  });

  // --- commandesEnCours ---

  it('commandesEnCours retourne 0 pour une table libre', () => {
    component.table = tableLibre;
    expect(component.commandesEnCours).toBe(0);
  });

  it('commandesEnCours compte uniquement les commandes EN_PREPARATION', () => {
    component.table = tableEnCours;
    expect(component.commandesEnCours).toBe(1);
  });

  it('commandesEnCours retourne 0 quand aucune commande EN_PREPARATION', () => {
    component.table = tableOccupee;
    expect(component.commandesEnCours).toBe(0);
  });

  // --- totalCommandes ---

  it('totalCommandes retourne 0 pour une table sans commandes actives', () => {
    component.table = tableLibre;
    expect(component.totalCommandes).toBe(0);
  });

  it('totalCommandes retourne le nombre total de commandes actives', () => {
    component.table = tableEnCours;
    expect(component.totalCommandes).toBe(2);
  });

  // --- @Output liberer ---

  it('liberer emits table id when called', () => {
    let emittedId: number | undefined;
    component.liberer.subscribe((id: number) => (emittedId = id));
    component.liberer.emit(tableOccupee.id);
    expect(emittedId).toBe(tableOccupee.id);
  });

  // --- @Output selectionner ---

  it('selectionner emits TableView object when called', () => {
    let emitted: TableView | undefined;
    component.selectionner.subscribe((t: TableView) => (emitted = t));
    component.selectionner.emit(tableOccupee);
    expect(emitted).toEqual(tableOccupee);
  });

  // --- cas limites ---

  it('statutLabel handles table with undefined-like commandesActives (null guard)', () => {
    component.table = { ...tableLibre, commandesActives: [] as any };
    expect(component.statutLabel).toBe('Libre');
  });

  it('commandesEnCours handles empty commandesActives array', () => {
    component.table = { ...tableOccupee, commandesActives: [] };
    expect(component.commandesEnCours).toBe(0);
  });
});
