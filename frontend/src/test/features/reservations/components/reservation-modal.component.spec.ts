import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ReservationModalComponent } from '../../../../app/features/reservations/components/reservation-modal/reservation-modal.component';
import { ReservationService } from '../../../../app/core/services/reservation.service';
import { TableBar } from '../../../../app/core/models/table.model';
import { Reservation } from '../../../../app/core/models/reservation.model';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('ReservationModalComponent', () => {
  let component: ReservationModalComponent;
  let fixture: ComponentFixture<ReservationModalComponent>;
  let reservationServiceSpy: jasmine.SpyObj<ReservationService>;

  const mockTables: TableBar[] = [
    { id: 10, numero: 1, capacite: 2, occupee: false, zone: 'SALLE', createdAt: '', updatedAt: '' },
    { id: 20, numero: 2, capacite: 4, occupee: true, zone: 'SALLE', createdAt: '', updatedAt: '' },
  ];

  const mockReservation: Reservation = {
    id: 1,
    nomClient: 'Jean Dupont',
    telephone: '+33612345678',
    email: 'jean.dupont@email.fr',
    dateReservation: '2026-08-15',
    heureReservation: '19:30',
    dureeMinutes: 90,
    nombrePersonnes: 2,
    statut: 'CONFIRMED',
    tableId: 10,
    tableNumero: 1,
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(async () => {
    reservationServiceSpy = jasmine.createSpyObj('ReservationService', [
      'checkAvailability',
      'getSuggestions',
      'createReservation',
      'updateReservation',
    ]);
    reservationServiceSpy.checkAvailability.and.returnValue(of({
      available: true,
      capacitySufficient: true,
      conflictingBookings: [],
      message: 'Available',
    }));
    reservationServiceSpy.getSuggestions.and.returnValue(of([]));
    reservationServiceSpy.createReservation.and.returnValue(of(mockReservation));

    await TestBed.configureTestingModule({
      imports: [
        ReservationModalComponent,
        HttpClientTestingModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: ReservationService, useValue: reservationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationModalComponent);
    component = fixture.componentInstance;
    component.tables = mockTables;
    fixture.detectChanges();
  });

  it('should create modal component', () => {
    expect(component).toBeTruthy();
  });

  it('initializes form with defaults for new reservation', () => {
    expect(component.reservationForm.get('nomClient')?.value).toBe('');
    expect(component.reservationForm.get('dureeMinutes')?.value).toBe(90);
    expect(component.reservationForm.get('nombrePersonnes')?.value).toBe(2);
    expect(component.reservationForm.get('statut')?.value).toBe('CONFIRMED');
  });

  it('populates form when reservationToEdit is provided', () => {
    component.reservationToEdit = mockReservation;
    component.initForm();

    expect(component.reservationForm.get('nomClient')?.value).toBe('Jean Dupont');
    expect(component.reservationForm.get('tableId')?.value).toBe(10);
    expect(component.reservationToEdit).toBeTruthy();
  });

  it('pre-fills all form fields dynamically when reservationToEdit changes and isOpen is true', () => {
    component.isOpen = true;
    component.reservationToEdit = mockReservation;
    component.populateForm();

    expect(component.reservationForm.get('nomClient')?.value).toBe('Jean Dupont');
    expect(component.reservationForm.get('telephone')?.value).toBe('+33612345678');
    expect(component.reservationForm.get('email')?.value).toBe('jean.dupont@email.fr');
    expect(component.reservationForm.get('dateReservation')?.value).toBe('2026-08-15');
    expect(component.reservationForm.get('heureReservation')?.value).toBe('19:30');
    expect(component.reservationForm.get('dureeMinutes')?.value).toBe(90);
    expect(component.reservationForm.get('nombrePersonnes')?.value).toBe(2);
    expect(component.reservationForm.get('tableId')?.value).toBe(10);
    expect(component.reservationForm.get('statut')?.value).toBe('CONFIRMED');
  });

  it('calls createReservation on valid form submit', () => {
    spyOn(component.reservationSaved, 'emit');

    component.reservationForm.patchValue({
      nomClient: 'Alice Wonderland',
      telephone: '+33611223344',
      dateReservation: '2026-08-15',
      heureReservation: '20:00',
      dureeMinutes: 90,
      nombrePersonnes: 2,
      tableId: 10,
    });

    component.saveReservation();
    expect(reservationServiceSpy.createReservation).toHaveBeenCalled();
    expect(component.reservationSaved.emit).toHaveBeenCalledWith(mockReservation);
  });

  it('emits modalClose when close() is called', () => {
    spyOn(component.modalClose, 'emit');
    component.close();
    expect(component.modalClose.emit).toHaveBeenCalled();
  });
});
