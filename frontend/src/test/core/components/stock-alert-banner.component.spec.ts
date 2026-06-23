import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { StockAlertBannerComponent } from '../../../app/core/components/stock-alert-banner/stock-alert-banner.component';
import { NotificationService, AppNotification } from '../../../app/core/services/notification.service';

function makeAlert(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'stock-1',
    type: 'stock',
    message: 'Low Stock : Citron (2 restant)',
    severity: 'warning',
    data: { quantiteActuelle: 2 },
    timestamp: new Date(),
    lue: false,
    ...overrides,
  };
}

describe('StockAlertBannerComponent', () => {
  let component: StockAlertBannerComponent;
  let fixture: ComponentFixture<StockAlertBannerComponent>;
  let stockAlerts$: Subject<AppNotification>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    stockAlerts$ = new Subject<AppNotification>();

    notificationServiceSpy = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['onStockAlert', 'marquerLue']
    );
    notificationServiceSpy.onStockAlert.and.returnValue(stockAlerts$.asObservable());

    await TestBed.configureTestingModule({
      imports: [StockAlertBannerComponent],
      providers: [
        { provide: NotificationService, useValue: notificationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockAlertBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit_souscritAuxAlertes_stockAlertsVideAuDepart', () => {
    expect(component.stockAlerts).toEqual([]);
    expect(notificationServiceSpy.onStockAlert).toHaveBeenCalled();
  });

  it('onStockAlert_nouvelleAlerte_ajouteeEnTeteDeListe', () => {
    const alert1 = makeAlert({ id: 'stock-1', message: 'Low Stock : Citron' });
    const alert2 = makeAlert({ id: 'stock-2', message: 'Low Stock : Glace' });

    stockAlerts$.next(alert1);
    stockAlerts$.next(alert2);

    expect(component.stockAlerts.length).toBe(2);
    // unshift : la plus récente est en index 0
    expect(component.stockAlerts[0].id).toBe('stock-2');
    expect(component.stockAlerts[1].id).toBe('stock-1');
  });

  it('dismissAlert_supprimeLAlerteDeLaListe_etAppelleMarquerLue', () => {
    const alert1 = makeAlert({ id: 'stock-1' });
    const alert2 = makeAlert({ id: 'stock-2' });
    stockAlerts$.next(alert1);
    stockAlerts$.next(alert2);
    expect(component.stockAlerts.length).toBe(2);

    component.dismissAlert('stock-1');

    expect(component.stockAlerts.length).toBe(1);
    expect(component.stockAlerts.find(a => a.id === 'stock-1')).toBeUndefined();
    expect(notificationServiceSpy.marquerLue).toHaveBeenCalledWith('stock-1');
  });

  it('dismissAlert_idInexistant_neModifiePasLaListeEtAppelleMarquerLue', () => {
    const alert = makeAlert({ id: 'stock-1' });
    stockAlerts$.next(alert);

    component.dismissAlert('unknown-id');

    expect(component.stockAlerts.length).toBe(1);
    expect(notificationServiceSpy.marquerLue).toHaveBeenCalledWith('unknown-id');
  });

  it('isCritical_quantiteActuelleEgaleZero_retourneTrue', () => {
    const criticalAlert = makeAlert({ data: { quantiteActuelle: 0 } });
    expect(component.isCritical(criticalAlert)).toBeTrue();
  });

  it('isCritical_quantiteActuelleSuperieurAZero_retourneFalse', () => {
    const nonCriticalAlert = makeAlert({ data: { quantiteActuelle: 3 } });
    expect(component.isCritical(nonCriticalAlert)).toBeFalse();
  });

  it('isCritical_dataNulle_retourneFalse', () => {
    const alertSansData = makeAlert({ data: undefined });
    expect(component.isCritical(alertSansData)).toBeFalse();
  });

  it('ngOnDestroy_completeLaSubscription_plusDAlerteRecue', () => {
    const alert = makeAlert({ id: 'stock-before' });
    stockAlerts$.next(alert);
    expect(component.stockAlerts.length).toBe(1);

    component.ngOnDestroy();

    stockAlerts$.next(makeAlert({ id: 'stock-after' }));
    // après destroy la subscription est complétée — aucun nouvel élément
    expect(component.stockAlerts.length).toBe(1);
    expect(component.stockAlerts[0].id).toBe('stock-before');
  });
});
