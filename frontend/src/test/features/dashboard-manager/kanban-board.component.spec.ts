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

  it('should have 3 columns by default when showDelivered is false', () => {
    expect(component.columns).toHaveSize(3);
  });

  it('should have 4 columns when showDelivered is true', () => {
    component.showDelivered = true;
    expect(component.columns).toHaveSize(4);
    const labels = component.columns.map((c: any) => c.label);
    expect(labels).toEqual([
      'MANAGER_DASHBOARD.STATUS_PENDING',
      'MANAGER_DASHBOARD.STATUS_IN_PROGRESS',
      'MANAGER_DASHBOARD.STATUS_READY',
      'MANAGER_DASHBOARD.STATUS_DELIVERED'
    ]);
  });

  it('should distribute orders to correct columns', () => {
    component.showDelivered = true;
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
      dateCommande: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
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
    expect(component.formattedTime).toBeTruthy();
  });

  it('should return empty string for missing dateCommande', () => {
    component.order = { id: 1, tableNumero: 1, statut: 'EN_ATTENTE', dateCommande: '' };
    expect(component.formattedTime).toBe('');
    expect(component.waitTimeMinutes).toBe(0);
    expect(component.waitTimeLabel).toBe('< 1 min');
  });

  it('should calculate waitTimeMinutes, waitTimeLabel and waitTimeSeverity', () => {
    expect(component.waitTimeMinutes).toBeGreaterThanOrEqual(9);
    expect(component.waitTimeLabel).toContain('min');
    expect(component.waitTimeSeverity).toBe('warning');

    component.order = {
      ...component.order,
      dateCommande: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    };
    expect(component.waitTimeSeverity).toBe('urgent');

    component.order = {
      ...component.order,
      statut: 'LIVREE'
    };
    expect(component.waitTimeSeverity).toBe('normal');
  });

  it('formatCurrency should format number to EUR currency', () => {
    expect(component.formatCurrency(25.5)).toContain('25');
    expect(component.formatCurrency(25.5)).toContain('€');
    expect(component.formatCurrency(undefined)).toBe('');
  });
});
