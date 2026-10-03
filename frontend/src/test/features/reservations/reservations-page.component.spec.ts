import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { ReservationsPageComponent } from '../../../app/features/reservations/reservations-page.component';
import { ReservationService } from '../../../app/core/services/reservation.service';
import { TableService } from '../../../app/core/services/table.service';
import { NotificationService } from '../../../app/core/services/notification.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { Reservation } from '../../../app/core/models/reservation.model';
import { TableBar } from '../../../app/core/models/table.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('ReservationsPageComponent', () => {
  let component: ReservationsPageComponent;
  let fixture: ComponentFixture<ReservationsPageComponent>;
  let reservationServiceSpy: jasmine.SpyObj<ReservationService>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;
  let notifServiceSpy: jasmine.SpyObj<NotificationService>;
  let wsServiceSpy: jasmine.SpyObj<WebSocketService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockReservations: Reservation[] = [
    {
      id: 1,
      nomClient: 'Jean Dupont',
      telephone: '+33612345678',
      dateReservation: '2026-08-15',
      heureReservation: '12:30',
      dureeMinutes: 90,
      nombrePersonnes: 2,
      statut: 'CONFIRMED',
      tableId: 10,
      tableNumero: 1,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 2,
      nomClient: 'Marie Curie',
      telephone: '+33687654321',
      dateReservation: '2026-08-15',
      heureReservation: '20:00',
      dureeMinutes: 90,
      nombrePersonnes: 4,
      statut: 'SEATED',
      tableId: 20,
      tableNumero: 2,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const mockTables: TableBar[] = [
    { id: 10, numero: 1, capacite: 2, occupee: false, zone: 'SALLE', createdAt: '', updatedAt: '' },
    { id: 20, numero: 2, capacite: 4, occupee: true, zone: 'SALLE', createdAt: '', updatedAt: '' },
  ];

  beforeEach(async () => {
    reservationServiceSpy = jasmine.createSpyObj('ReservationService', [
      'getReservations',
      'updateStatut',
      'seatReservation',
    ]);
    reservationServiceSpy.getReservations.and.returnValue(of(mockReservations));
    reservationServiceSpy.updateStatut.and.returnValue(of({ ...mockReservations[0], statut: 'CANCELLED' }));
    reservationServiceSpy.seatReservation.and.returnValue(of({ ...mockReservations[0], statut: 'SEATED' }));

    tableServiceSpy = jasmine.createSpyObj('TableService', ['getAll']);
    tableServiceSpy.getAll.and.returnValue(of(mockTables));

    notifServiceSpy = jasmine.createSpyObj('NotificationService', ['onNotification']);
    notifServiceSpy.onNotification.and.returnValue(new Subject<any>().asObservable());

    wsServiceSpy = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsServiceSpy.watch.and.returnValue(new Subject<any>().asObservable());

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrlSpy.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve({
      present: () => Promise.resolve(),
      onWillDismiss: () => Promise.resolve({ data: { seated: true } }),
    } as any));

    await TestBed.configureTestingModule({
      imports: [
        ReservationsPageComponent,
        HttpClientTestingModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: ReservationService, useValue: reservationServiceSpy },
        { provide: TableService, useValue: tableServiceSpy },
        { provide: NotificationService, useValue: notifServiceSpy },
        { provide: WebSocketService, useValue: wsServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load reservations and tables on init', () => {
    expect(component).toBeTruthy();
    expect(reservationServiceSpy.getReservations).toHaveBeenCalled();
    expect(tableServiceSpy.getAll).toHaveBeenCalled();
    expect(component.reservations()).toHaveSize(2);
  });

  it('calculates summary statistics correctly', () => {
    expect(component.totalBookingsCount()).toBe(2);
    expect(component.confirmedPendingCount()).toBe(1);
    expect(component.seatedCount()).toBe(1);
    expect(component.totalGuestsCount()).toBe(6);
  });

  it('filters reservations by shift (lunch vs dinner)', () => {
    component.selectedShift.set('LUNCH');
    const filteredLunch = component.filteredReservations();
    expect(filteredLunch).toHaveSize(1);
    expect(filteredLunch[0].nomClient).toBe('Jean Dupont');

    component.selectedShift.set('DINNER');
    const filteredDinner = component.filteredReservations();
    expect(filteredDinner).toHaveSize(1);
    expect(filteredDinner[0].nomClient).toBe('Marie Curie');
  });

  it('filters reservations by search text query', () => {
    component.searchQuery.set('Marie');
    const filtered = component.filteredReservations();
    expect(filtered).toHaveSize(1);
    expect(filtered[0].nomClient).toBe('Marie Curie');
  });

  it('navigates date forwards and backwards', () => {
    const initialDate = component.selectedDate();
    component.changeDate(1);
    expect(component.selectedDate()).not.toBe(initialDate);
    component.setToday();
    component.changeDate(-1);
    expect(component.selectedDate()).not.toBe(initialDate);
  });

  it('seats guests with seatReservation()', () => {
    component.seatReservation(mockReservations[0]);
    expect(reservationServiceSpy.seatReservation).toHaveBeenCalledWith(1);
  });

  it('toggles view mode between timeline and list', () => {
    component.viewMode.set('LIST');
    expect(component.viewMode()).toBe('LIST');
    component.viewMode.set('TIMELINE');
    expect(component.viewMode()).toBe('TIMELINE');
  });
});
