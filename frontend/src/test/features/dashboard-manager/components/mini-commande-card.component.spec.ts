import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { MiniCommandeCardComponent } from '../../../../app/features/dashboard-manager/components/mini-commande-card/mini-commande-card.component';
import { OngoingOrder } from '../../../../app/features/dashboard-manager/models/ongoing-order.model';
import { AppSettingsService } from '../../../../app/core/services/app-settings.service';
import { AppSettings } from '../../../../app/core/models/app-settings.model';

describe('MiniCommandeCardComponent', () => {
  let component: MiniCommandeCardComponent;
  let fixture: ComponentFixture<MiniCommandeCardComponent>;
  let settingsSubject: BehaviorSubject<AppSettings | null>;

  const mockSettings: AppSettings = {
    id: 1,
    primaryColor: '#6c7fe8',
    primaryColorStrong: '#5a68d6',
    logoUrl: null,
    establishmentName: 'OpenBar',
    defaultTheme: 'DARK',
    tempsAlerteWarningMinutes: 3,
    tempsAlerteCommandeMinutes: 5,
    tempsAlerteCritiqueCommandeMinutes: 10,
    updatedAt: '2026-08-19T10:00:00',
  };

  const createOrder = (minutesAgo: number, status: 'EN_ATTENTE' | 'PRET' | 'EN_PREPARATION' | 'LIVREE' = 'EN_ATTENTE'): OngoingOrder => ({
    id: 101,
    tableNumero: 4,
    tableNom: 'Table 4',
    serveurUsername: 'Alex',
    statut: status,
    dateCommande: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
    total: 24.5,
    items: [
      { cocktailNom: 'Mojito', quantite: 2 }
    ]
  });

  beforeEach(async () => {
    settingsSubject = new BehaviorSubject<AppSettings | null>(mockSettings);
    const settingsServiceMock = {
      settings$: settingsSubject.asObservable(),
      get currentSettings() {
        return settingsSubject.getValue();
      },
      getSettings: () => of(mockSettings),
    };

    await TestBed.configureTestingModule({
      imports: [MiniCommandeCardComponent],
      providers: [
        { provide: AppSettingsService, useValue: settingsServiceMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MiniCommandeCardComponent);
    component = fixture.componentInstance;
  });

  it('should create the mini commande card component', () => {
    component.order = createOrder(2);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should compute waitTimeMinutes and waitTimeLabel accurately', () => {
    component.order = createOrder(7);
    fixture.detectChanges();
    expect(component.waitTimeMinutes).toBe(7);
    expect(component.waitTimeLabel).toBe('7 min');
  });

  it('should evaluate waitTimeSeverity dynamically from AppSettingsService stream', () => {
    // Normal: 2 min (< 3 min)
    component.order = createOrder(2);
    expect(component.waitTimeSeverity).toBe('normal');

    // Warning: 4 min (3 to 5 min)
    component.order = createOrder(4);
    expect(component.waitTimeSeverity).toBe('warning');

    // Urgent: 7 min (5 to 10 min)
    component.order = createOrder(7);
    expect(component.waitTimeSeverity).toBe('urgent');

    // Critical: 12 min (>= 10 min)
    component.order = createOrder(12);
    expect(component.waitTimeSeverity).toBe('critical');

    // Delivered orders always return normal severity
    component.order = createOrder(15, 'LIVREE');
    expect(component.waitTimeSeverity).toBe('normal');
  });

  it('should format currency correctly in EUR', () => {
    component.order = createOrder(2);
    expect(component.formatCurrency(24.5)).toContain('24,50');
  });

  it('should render header badges, table name and items without layout collision', () => {
    component.order = createOrder(5);
    fixture.detectChanges();

    const tableLabel = fixture.nativeElement.querySelector('.table-label');
    const orderId = fixture.nativeElement.querySelector('.order-id');
    const waitBadge = fixture.nativeElement.querySelector('.wait-time-badge');
    const itemQty = fixture.nativeElement.querySelector('.item-qty');
    const itemName = fixture.nativeElement.querySelector('.item-name');

    expect(tableLabel.textContent).toContain('Table 4');
    expect(orderId.textContent).toContain('#101');
    expect(waitBadge.textContent).toContain('5 min');
    expect(itemQty.textContent).toContain('2x');
    expect(itemName.textContent).toContain('Mojito');
  });
});
