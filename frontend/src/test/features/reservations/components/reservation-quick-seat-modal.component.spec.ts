import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular';
import { ReservationQuickSeatModalComponent } from '../../../../app/features/reservations/components/reservation-quick-seat-modal/reservation-quick-seat-modal.component';
import { ReservationService } from '../../../../app/core/services/reservation.service';
import { Reservation } from '../../../../app/core/models/reservation.model';
import { TableBar } from '../../../../app/core/models/table.model';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('ReservationQuickSeatModalComponent', () => {
  let component: ReservationQuickSeatModalComponent;
  let fixture: ComponentFixture<ReservationQuickSeatModalComponent>;
  let reservationServiceSpy: jasmine.SpyObj<ReservationService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const mockTable: TableBar = {
    id: 10,
    numero: 1,
    capacite: 4,
    occupee: false,
    zone: 'SALLE',
    createdAt: '',
    updatedAt: '',
  };

  const mockReservation: Reservation = {
    id: 1,
    nomClient: 'Jean Dupont',
    telephone: '+33612345678',
    dateReservation: '2026-08-15',
    heureReservation: '19:30',
    dureeMinutes: 90,
    nombrePersonnes: 4,
    statut: 'CONFIRMED',
    tableId: 10,
    tableNumero: 1,
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(async () => {
    reservationServiceSpy = jasmine.createSpyObj('ReservationService', ['seatReservation']);
    reservationServiceSpy.seatReservation.and.returnValue(of({ ...mockReservation, statut: 'SEATED' }));

    await TestBed.configureTestingModule({
      imports: [
        ReservationQuickSeatModalComponent,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: ReservationService, useValue: reservationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationQuickSeatModalComponent);
    component = fixture.componentInstance;
    component.reservation = mockReservation;
    component.tableNumero = mockTable.numero;
    fixture.detectChanges();
  });

  it('should create quick-seat modal', () => {
    expect(component).toBeTruthy();
  });

  it('seatGuests() calls seatReservation, emits seated, and closes modal', () => {
    spyOn(component.seated, 'emit');
    spyOn(component.modalClose, 'emit');

    component.seatGuests();

    expect(reservationServiceSpy.seatReservation).toHaveBeenCalledWith(1);
    expect(component.seated.emit).toHaveBeenCalled();
    expect(component.modalClose.emit).toHaveBeenCalled();
  });

  it('close() emits modalClose', () => {
    spyOn(component.modalClose, 'emit');
    component.close();
    expect(component.modalClose.emit).toHaveBeenCalled();
  });
});
