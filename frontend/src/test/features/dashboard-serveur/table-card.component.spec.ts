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
      ]
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

  it('statutLabel retourne "Libre" si table non occupée', () => {
    component.table = tableLibre;
    expect(component.statutLabel).toBe('Libre');
  });

  it('statutLabel retourne "En cours" si table occupée avec commandes EN_PREPARATION', () => {
    component.table = tableEnCours;
    expect(component.statutLabel).toBe('En cours');
  });

  it('statutLabel retourne "Occupée" si table occupée sans commandes EN_PREPARATION', () => {
    component.table = tableOccupee;
    expect(component.statutLabel).toBe('Occupée');
  });

  // --- statutClass ---

  it('statutClass retourne "table-free" si table non occupée', () => {
    component.table = tableLibre;
    expect(component.statutClass).toBe('table-free');
  });

  it('statutClass retourne "table-inprogress" si table occupée avec commandes EN_PREPARATION', () => {
    component.table = tableEnCours;
    expect(component.statutClass).toBe('table-inprogress');
  });

  it('statutClass retourne "table-occupied" si table occupée sans commandes EN_PREPARATION', () => {
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

  it('liberer émet l\'id de la table quand appelé', () => {
    let emittedId: number | undefined;
    component.liberer.subscribe((id: number) => (emittedId = id));
    component.liberer.emit(tableOccupee.id);
    expect(emittedId).toBe(tableOccupee.id);
  });

  // --- cas limites ---

  it('statutLabel gère une table avec commandesActives undefined-like (null guard)', () => {
    component.table = { ...tableLibre, commandesActives: [] as any };
    expect(component.statutLabel).toBe('Libre');
  });

  it('commandesEnCours gère un tableau commandesActives vide', () => {
    component.table = { ...tableOccupee, commandesActives: [] };
    expect(component.commandesEnCours).toBe(0);
  });
});
