import {TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {IonBadge} from '@ionic/angular/standalone';
import {
  KanbanBoardComponent
} from '../../../app/features/dashboard-manager/components/kanban-board/kanban-board.component';
import {
  MiniCommandeCardComponent
} from '../../../app/features/dashboard-manager/components/mini-commande-card/mini-commande-card.component';
import {OngoingOrder} from '../../../app/features/dashboard-manager/models/ongoing-order.model';
import {getTranslocoTestingModule} from '../../transloco-testing.module';

describe('KanbanBoardComponent', () => {
  let component: KanbanBoardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanBoardComponent, CommonModule, IonBadge, MiniCommandeCardComponent, getTranslocoTestingModule()]
    }).compileComponents();

    const fixture = TestBed.createComponent(KanbanBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 4 columns by default', () => {
    expect(component.columns).toHaveSize(4);
  });

  it('should distribute orders to correct columns', () => {
    component.orders = [
      {id: 1, tableNumero: 5, statut: 'EN_ATTENTE', dateCommande: '2026-07-26T10:00:00'},
      {id: 2, tableNumero: 3, statut: 'EN_PREPARATION', dateCommande: '2026-07-26T10:05:00'},
      {id: 3, tableNumero: 7, statut: 'PRET', dateCommande: '2026-07-26T10:10:00'},
      {id: 4, tableNumero: 1, statut: 'LIVREE', dateCommande: '2026-07-26T10:15:00'},
      {id: 5, tableNumero: 2, statut: 'EN_ATTENTE', dateCommande: '2026-07-26T10:20:00'},
    ];

    const columns = component.columns;
    expect(columns[0].orders).toHaveSize(2); // EN_ATTENTE
    expect(columns[1].orders).toHaveSize(1); // EN_PREPARATION
    expect(columns[2].orders).toHaveSize(1); // PRET
    expect(columns[3].orders).toHaveSize(1); // LIVREE
  });

  it('should have correct column labels', () => {
    const labels = component.columns.map((c: any) => c.label);
    expect(labels).toEqual([
      'MANAGER_DASHBOARD.STATUS_PENDING',
      'MANAGER_DASHBOARD.STATUS_IN_PROGRESS',
      'MANAGER_DASHBOARD.STATUS_READY',
      'MANAGER_DASHBOARD.STATUS_DELIVERED'
    ]);
  });

  it('trackByOrderId returns order id', () => {
    const order: OngoingOrder = { id: 42, tableNumero: 1, statut: 'EN_ATTENTE', dateCommande: '' };
    expect(component.trackByOrderId(0, order)).toBe(42);
  });
});

describe('MiniCommandeCardComponent', () => {
  let component: MiniCommandeCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniCommandeCardComponent, CommonModule, getTranslocoTestingModule()]
    }).compileComponents();

    const fixture = TestBed.createComponent(MiniCommandeCardComponent);
    component = fixture.componentInstance;
    component.order = {
      id: 1020,
      tableNumero: 5,
      tableNom: 'Table VIP',
      statut: 'EN_ATTENTE',
      dateCommande: '2026-07-26T07:32:00',
      serveurUsername: 'bob',
      total: 25.5,
      items: [{ cocktailNom: 'Mojito', quantite: 2 }]
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format time correctly', () => {
    expect(component.formattedTime).toMatch(/07:32/);
  });

  it('should return empty string for missing dateCommande', () => {
    component.order = { id: 1, tableNumero: 1, statut: 'EN_ATTENTE', dateCommande: '' };
    expect(component.formattedTime).toBe('');
  });

  it('formatCurrency should format number to EUR currency', () => {
    expect(component.formatCurrency(25.5)).toContain('25');
    expect(component.formatCurrency(25.5)).toContain('€');
    expect(component.formatCurrency(undefined)).toBe('');
  });
});
