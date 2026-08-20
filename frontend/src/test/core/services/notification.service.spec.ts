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

import { SoundService } from '../../../app/core/services/sound.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let wsStub: WebSocketServiceStub;
  let soundSpy: jasmine.SpyObj<SoundService>;

  beforeEach(() => {
    wsStub = new WebSocketServiceStub();
    toastCreateSpy.calls.reset();
    toastPresentSpy.calls.reset();
    soundSpy = jasmine.createSpyObj<SoundService>('SoundService', ['playNewOrderSound', 'playOrderReadySound']);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: WebSocketService, useValue: wsStub },
        { provide: ToastController, useValue: { create: toastCreateSpy } },
        { provide: SoundService, useValue: soundSpy },
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

  it('onNotification() emits notification when /topic/commandes receives message', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/commandes', { tableNom: 'A1' });
    tick();

    expect(received).toHaveSize(1);
    expect(received[0].type).toBe('commande');
    expect(received[0].message).toContain('A1');
    expect(received[0].severity).toBe('primary');
    expect(received[0].lue).toBeFalse();
    expect(soundSpy.playNewOrderSound).toHaveBeenCalled();
  }));

  it('onNotification() triggers playOrderReadySound when status is PRET', fakeAsync(() => {
    wsStub.emit('/topic/commandes/statut', { id: 8, statut: 'PRET' });
    tick();

    expect(soundSpy.playOrderReadySound).toHaveBeenCalled();
  }));

  it('onNotification() emits notification when /topic/commandes/statut receives message', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/commandes/statut', { id: 7, statut: 'EN_PREPARATION' });
    tick();

    expect(received).toHaveSize(1);
    expect(received[0].type).toBe('statut');
    expect(received[0].message).toContain('7');
    expect(received[0].message).toContain('EN_PREPARATION');
    expect(received[0].severity).toBe('success');
  }));

  it('onNotification() emits notification when /topic/barman/commandes receives message', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/barman/commandes', { id: 18, statut: 'ANNULEE' });
    tick();

    expect(received).toHaveSize(1);
    expect(received[0].type).toBe('commande');
    expect(received[0].message).toContain('18');
    expect(received[0].message).toContain('ANNULEE');
  }));

  it('onNotification() emits notification when /topic/tables receives message', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/tables', { nom: 'B2', occupee: true });
    tick();

    expect(received).toHaveSize(1);
    expect(received[0].type).toBe('table');
    expect(received[0].message).toContain('B2');
    expect(received[0].message).toContain('Occupied');
    expect(received[0].severity).toBe('success');
  }));

  it('onNotification() emits "Available" notification when occupee is false', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/tables', { nom: 'C3', occupee: false });
    tick();

    expect(received[0].message).toContain('Available');
  }));

  // -------------------------------------------------------------------------
  // onStockAlert()
  // -------------------------------------------------------------------------

  it('onStockAlert() emits alert when /topic/stock/alerte receives message', fakeAsync(() => {
    const alerts: AppNotification[] = [];
    service.onStockAlert().subscribe(a => alerts.push(a));

    wsStub.emit('/topic/stock/alerte', { nom: 'Rhum', quantiteActuelle: 2 });
    tick();

    expect(alerts).toHaveSize(1);
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

    expect(alerts[0].message).toContain('Stock');
    expect(alerts[0].message).toContain('Citron');
    expect(alerts[0].message).toContain('0');
  }));

  it('onStockAlert() supporte les formats alternatifs nomIngredient et quantiteRestante', fakeAsync(() => {
    const alerts: AppNotification[] = [];
    service.onStockAlert().subscribe(a => alerts.push(a));

    wsStub.emit('/topic/stock/alerte', { nomIngredient: 'Menthe', quantiteRestante: 4 });
    tick();

    expect(alerts).toHaveSize(1);
    expect(alerts[0].message).toContain('Menthe');
    expect(alerts[0].message).toContain('4');
  }));

  // -------------------------------------------------------------------------
  // getHistory()
  // -------------------------------------------------------------------------

  it('getHistory() returns all received notifications', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    wsStub.emit('/topic/tables', { nom: 'T2', occupee: false });
    tick();

    const history = service.getHistory();
    expect(history).toHaveSize(2);
  }));

  it('getHistory() returns an independent copy (immutability)', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    tick();

    const h1 = service.getHistory();
    h1.push({ id: 'fake', type: 'commande', message: 'fake', severity: 'primary', timestamp: new Date(), lue: false });

    expect(service.getHistory()).toHaveSize(1);
  }));

  // -------------------------------------------------------------------------
  // marquerLue() / getNonLues() / unreadCount signal / marquerToutLu()
  // -------------------------------------------------------------------------

  it('unreadCount signal starts at 0', () => {
    expect(service.unreadCount()).toBe(0);
  });

  it('unreadCount signal increments on incoming notifications', fakeAsync(() => {
    expect(service.unreadCount()).toBe(0);

    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    tick();
    expect(service.unreadCount()).toBe(1);

    wsStub.emit('/topic/tables', { nom: 'T2', occupee: true });
    tick();
    expect(service.unreadCount()).toBe(2);

    wsStub.emit('/topic/stock/alerte', { nom: 'Rhum', quantiteActuelle: 1 });
    tick();
    expect(service.unreadCount()).toBe(3);
  }));

  it('getNonLues() retourne le nombre de notifications non lues', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    wsStub.emit('/topic/tables', { nom: 'T2', occupee: true });
    tick();

    expect(service.getNonLues()).toBe(2);
  }));

  it('marquerLue() marque la notification correspondante comme lue et decremente unreadCount', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    wsStub.emit('/topic/tables', { nom: 'T2', occupee: true });
    tick();

    expect(service.unreadCount()).toBe(2);
    const history = service.getHistory();
    expect(history[0].lue).toBeFalse();

    service.marquerLue(history[0].id);

    expect(service.getHistory()[0].lue).toBeTrue();
    expect(service.getNonLues()).toBe(1);
    expect(service.unreadCount()).toBe(1);
  }));

  it('marquerToutLu() marque toutes les notifications comme lues et remet unreadCount a 0', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    wsStub.emit('/topic/tables', { nom: 'T2', occupee: true });
    tick();

    expect(service.unreadCount()).toBe(2);

    service.marquerToutLu();

    expect(service.unreadCount()).toBe(0);
    expect(service.getNonLues()).toBe(0);
    service.getHistory().forEach(n => expect(n.lue).toBeTrue());
  }));

  it('marquerLue() avec un id inconnu ne lance pas d\'erreur', () => {
    expect(() => service.marquerLue('inexistant-id')).not.toThrow();
  });

  it('panel open/close/toggle methods update isNotifPanelOpen signal', () => {
    expect(service.isNotifPanelOpen()).toBeFalse();

    service.openNotifPanel();
    expect(service.isNotifPanelOpen()).toBeTrue();

    service.closeNotifPanel();
    expect(service.isNotifPanelOpen()).toBeFalse();

    service.toggleNotifPanel();
    expect(service.isNotifPanelOpen()).toBeTrue();

    service.toggleNotifPanel();
    expect(service.isNotifPanelOpen()).toBeFalse();
  });

  // -------------------------------------------------------------------------
  // showToast
  // -------------------------------------------------------------------------

  it('showToast() is called via ToastController.create() after each notification', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    tick();

    expect(toastCreateSpy).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ duration: 4000, color: 'primary', position: 'top' })
    );
  }));

  it('showToast() is called with warning color for stock alerts', fakeAsync(() => {
    wsStub.emit('/topic/stock/alerte', { nom: 'Sirop', quantiteActuelle: 1 });
    tick();

    expect(toastCreateSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'warning' })
    );
  }));

  // -------------------------------------------------------------------------
  // Resilience — malformed messages
  // -------------------------------------------------------------------------

  it('ignores malformed messages on /topic/commandes without error', fakeAsync(() => {
    expect(() => {
      wsStub.emitRaw('/topic/commandes', 'NOT_JSON');
      tick();
    }).not.toThrow();

    expect(service.getHistory()).toHaveSize(0);
  }));

  it('ignores malformed messages on /topic/stock/alerte without error', fakeAsync(() => {
    expect(() => {
      wsStub.emitRaw('/topic/stock/alerte', '{bad json}');
      tick();
    }).not.toThrow();
  }));

  // -------------------------------------------------------------------------
  // ngOnDestroy
  // -------------------------------------------------------------------------

  it('ngOnDestroy() unsubs WS subscriptions (no notifications after destroy)', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    service.ngOnDestroy();

    wsStub.emit('/topic/commandes', { tableNom: 'T99' });
    tick();

    expect(received).toHaveSize(0);
  }));

  // -------------------------------------------------------------------------
  // Data des notifications — champs attendus
  // -------------------------------------------------------------------------

  it('each notification has an id, timestamp and lue = false by default', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'T1' });
    tick();

    const notif = service.getHistory()[0];
    expect(notif.id).toBeTruthy();
    expect(notif.timestamp).toBeInstanceOf(Date);
    expect(notif.lue).toBeFalse();
  }));

  it('notification id contains type as prefix', fakeAsync(() => {
    wsStub.emit('/topic/tables', { nom: 'T1', occupee: true });
    tick();

    const notif = service.getHistory()[0];
    expect(notif.id).toMatch(/^table-/);
  }));

  it('most recent notifications are at head of getHistory()', fakeAsync(() => {
    wsStub.emit('/topic/commandes', { tableNom: 'first' });
    tick();
    wsStub.emit('/topic/commandes', { tableNom: 'second' });
    tick();

    const history = service.getHistory();
    expect(history[0].message).toContain('second');
    expect(history[1].message).toContain('first');
  }));

  it('table.nom fallback utilise data.table.nom quand tableNom est absent', fakeAsync(() => {
    const received: AppNotification[] = [];
    service.onNotification().subscribe(n => received.push(n));

    wsStub.emit('/topic/commandes', { table: { nom: 'Fallback42' } });
    tick();

    expect(received[0].message).toContain('Fallback42');
  }));
});
