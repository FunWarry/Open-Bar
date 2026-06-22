import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';
import { NotificationService, AppNotification } from '../../../app/core/services/notification.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface StompMessage { body: string }

/** Minimal stub for WebSocketService — exposes one Subject per topic */
class WebSocketServiceStub {
  private subjects: Record<string, Subject<StompMessage>> = {};

  watch(topic: string): Subject<StompMessage> {
    if (!this.subjects[topic]) {
      this.subjects[topic] = new Subject<StompMessage>();
    }
    return this.subjects[topic];
  }

  /** Push a raw STOMP message to a topic */
  emit(topic: string, body: object): void {
    this.subjects[topic]?.next({ body: JSON.stringify(body) });
  }

  /** Push a malformed string (non-JSON) to a topic */
  emitRaw(topic: string, raw: string): void {
    this.subjects[topic]?.next({ body: raw });
  }
}

/** Minimal stub for ToastController */
const toastPresentSpy = jasmine.createSpy('present').and.returnValue(Promise.resolve());
const toastCreateSpy = jasmine.createSpy('create').and.returnValue(
  Promise.resolve({ present: toastPresentSpy })
);

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('NotificationService', () => {
  let service: NotificationService;
  let wsStub: WebSocketServiceStub;

  beforeEach(() => {
    wsStub = new WebSocketServiceStub();
    toastCreateSpy.calls.reset();
    toastPresentSpy.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: WebSocketService, useValue: wsStub },
        { provide: ToastController, useValue: { create: toastCreateSpy } },
      ],
    });

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  // -------------------------------------------------------------------------
  // onNotification() — commande topic
  // -------------------------------------------------------------------------

  it('onNotification() émet une notification quand /topic/commandes reçoit un message', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/commandes', { tableNom: 'A1' });
    tick();

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('commande');
    expect(received[0].message).toContain('A1');
    expect(received[0].severity).toBe('primary');
    expect(received[0].lue).toBeFalse();
  }));

  it('onNotification() émet une notification quand /topic/commandes/statut reçoit un message', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/commandes/statut', { id: 7, statut: 'EN_PREPARATION' });
    tick();

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('statut');
    expect(received[0].message).toContain('7');
    expect(received[0].message).toContain('EN_PREPARATION');
    expect(received[0].severity).toBe('success');
  }));

  it('onNotification() émet une notification quand /topic/tables reçoit un message', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/tables', { nom: 'B2', occupee: true });
    tick();

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('table');
    expect(received[0].message).toContain('B2');
    expect(received[0].message).toContain('Occupée');
    expect(received[0].severity).toBe('success');
  }));

  it('onNotification() émet une notification "Libérée" quand occupee est false', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/tables', { nom: 'C3', occupee: false });
    tick();

    expect(received[0].message).toContain('Libérée');
  }));

  // -------------------------------------------------------------------------
  // onStockAlert()
  // -------------------------------------------------------------------------

  it('onStockAlert() émet une alerte quand /topic/stock/alerte reçoit un message', fakeAsync(() => {
    const alerts: AppNotification[] = [];
    service.onStockAlert().subscribe(a => alerts.push(a));

    wsStub.emit('/topic/stock/alerte', { nom: 'Rhum', quantiteActuelle: 2 });
    tick();

    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe('stock');
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[0].message).toContain('Rhum');
    expect(alerts[0].message).toContain('2');
  }));

  it('onStockAlert() signale un stock critique (quantiteActuelle === 0)', fakeAsync(() => {
    const alerts: AppNotification[] = [];
    service.onStockAlert().subscribe(a => alerts.push(a));

    wsStub.emit('/topic/stock/alerte', { nom: 'Citron', quantiteActuelle: 0 });
    tick();

    expect(alerts[0].message).toContain('Critical Stock');
    expect(alerts[0].message).toContain('0');
  }));

  // -------------------------------------------------------------------------
  // getHistory()
  // -------------------------------------------------------------------------

  it('getHistory() retourne toutes les notifications reçues', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    wsStub.emit('/topic/tables', { nom: 'T2', occupee: false });
    tick();

    const history = service.getHistory();
    expect(history.length).toBe(2);
  }));

  it('getHistory() retourne une copie indépendante (immutabilité)', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    tick();

    const h1 = service.getHistory();
    h1.push({ id: 'fake', type: 'commande', message: 'fake', severity: 'primary', timestamp: new Date(), lue: false });

    expect(service.getHistory().length).toBe(1);
  }));

  // -------------------------------------------------------------------------
  // marquerLue() / getNonLues()
  // -------------------------------------------------------------------------

  it('getNonLues() retourne le nombre de notifications non lues', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    wsStub.emit('/topic/tables', { nom: 'T2', occupee: true });
    tick();

    expect(service.getNonLues()).toBe(2);
  }));

  it('marquerLue() marque la notification correspondante comme lue', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    tick();

    const history = service.getHistory();
    expect(history[0].lue).toBeFalse();

    service.marquerLue(history[0].id);

    expect(service.getHistory()[0].lue).toBeTrue();
    expect(service.getNonLues()).toBe(0);
  }));

  it('marquerLue() avec un id inconnu ne lance pas d\'erreur', () => {
    expect(() => service.marquerLue('inexistant-id')).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // showToast
  // -------------------------------------------------------------------------

  it('showToast() est appelé via ToastController.create() après chaque notification', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    tick();

    expect(toastCreateSpy).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ duration: 4000, color: 'primary', position: 'top' })
    );
  }));

  it('showToast() est appelé avec color warning pour les alertes stock', fakeAsync(() => {
    wsStub.emit('/topic/stock/alerte', { nom: 'Sirop', quantiteActuelle: 1 });
    tick();

    expect(toastCreateSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'warning' })
    );
  }));

  // -------------------------------------------------------------------------
  // Résilience — messages malformés
  // -------------------------------------------------------------------------

  it('ignore les messages malformés sur /topic/commandes sans lancer d\'erreur', fakeAsync(() => {
    expect(() => {
      wsStub.emitRaw('/topic/commandes', 'NOT_JSON');
      tick();
    }).not.toThrow();

    expect(service.getHistory().length).toBe(0);
  }));

  it('ignore les messages malformés sur /topic/stock/alerte sans lancer d\'erreur', fakeAsync(() => {
    expect(() => {
      wsStub.emitRaw('/topic/stock/alerte', '{bad json}');
      tick();
    }).not.toThrow();
  }));

  // -------------------------------------------------------------------------
  // ngOnDestroy
  // -------------------------------------------------------------------------

  it('ngOnDestroy() désinscrit les subscriptions WS (plus de notifications après destroy)', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    service.ngOnDestroy();

    wsStub.emit('/topic/commandes', { tableNom: 'T99' });
    tick();

    expect(received.length).toBe(0);
  }));

  // -------------------------------------------------------------------------
  // Données des notifications — champs attendus
  // -------------------------------------------------------------------------

  it('chaque notification a un id, un timestamp et lue = false par défaut', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    tick();

    const notif = service.getHistory()[0];
    expect(notif.id).toBeTruthy();
    expect(notif.timestamp).toBeInstanceOf(Date);
    expect(notif.lue).toBeFalse();
  }));

  it('l\'id de notification contient le type comme préfixe', fakeAsync(() => {
    wsStub.emit('/topic/tables', { nom: 'T1', occupee: true });
    tick();

    const notif = service.getHistory()[0];
    expect(notif.id).toMatch(/^table-/);
  }));

  it('les notifications les plus récentes sont en tête de getHistory()', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'première' });
    tick();
    wsStub.emit('/topic/commandes', { tableNom: 'deuxième' });
    tick();

    const history = service.getHistory();
    expect(history[0].message).toContain('deuxième');
    expect(history[1].message).toContain('première');
  }));

  it('table.nom fallback utilise data.table.nom quand tableNom est absent', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/commandes', { table: { nom: 'Fallback42' } });
    tick();

    expect(received[0].message).toContain('Fallback42');
  }));
});
