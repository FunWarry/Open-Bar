import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
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
    reservationServiceSpy.getSuggestions.and.returnValue(of([
      { id: 2, nomClient: 'Jean Dupont', telephone: '+33612345678', email: 'jean@dupont.fr' } as Reservation,
    ]));
    reservationServiceSpy.createReservation.and.returnValue(of(mockReservation));
    reservationServiceSpy.updateReservation.and.returnValue(of(mockReservation));

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

  it('calls updateReservation when editing an existing reservation', () => {
    spyOn(component.reservationSaved, 'emit');
    component.reservationToEdit = mockReservation;
    component.initForm();

    component.reservationForm.patchValue({
      nomClient: 'Jean Dupont Updated',
    });

    component.saveReservation();
    expect(reservationServiceSpy.updateReservation).toHaveBeenCalledWith(1, jasmine.objectContaining({
      nomClient: 'Jean Dupont Updated',
    }));
    expect(component.reservationSaved.emit).toHaveBeenCalledWith(mockReservation);
  });

  it('does not submit when form is invalid', () => {
    component.reservationForm.patchValue({
      nomClient: '',
    });

    component.saveReservation();
    expect(reservationServiceSpy.createReservation).not.toHaveBeenCalled();
    expect(reservationServiceSpy.updateReservation).not.toHaveBeenCalled();
  });

  it('fetches customer suggestions on typing >= 2 chars', () => {
    component.reservationForm.patchValue({ nomClient: 'Je' });
    component.onCustomerNameInput();

    expect(reservationServiceSpy.getSuggestions).toHaveBeenCalledWith('Je');
    expect(component.customerSuggestions).toHaveSize(1);
    expect(component.showSuggestions).toBeTrue();
  });

  it('clears suggestions when query is short', () => {
    component.customerSuggestions = [mockReservation];
    component.showSuggestions = true;

    component.reservationForm.patchValue({ nomClient: 'J' });
    component.onCustomerNameInput();

    expect(component.customerSuggestions).toHaveSize(0);
    expect(component.showSuggestions).toBeFalse();
  });

  it('selects a suggestion and fills client fields', () => {
    component.selectSuggestion({
      id: 99,
      nomClient: 'Paul Martin',
      telephone: '+33699887766',
      email: 'paul@martin.fr',
    } as Reservation);

    expect(component.reservationForm.get('nomClient')?.value).toBe('Paul Martin');
    expect(component.reservationForm.get('telephone')?.value).toBe('+33699887766');
    expect(component.reservationForm.get('email')?.value).toBe('paul@martin.fr');
    expect(component.showSuggestions).toBeFalse();
  });

  it('handles table, duration, and status selections', () => {
    component.onTableSelected({ value: 20, label: 'Table 2' });
    expect(component.reservationForm.get('tableId')?.value).toBe(20);

    component.onDurationSelected({ value: 120, label: '2h00' });
    expect(component.reservationForm.get('dureeMinutes')?.value).toBe(120);

    component.onStatusSelected({ value: 'SEATED', label: 'Installée' });
    expect(component.reservationForm.get('statut')?.value).toBe('SEATED');
  });

  it('checks table availability and updates availabilityCheck', () => {
    component.reservationForm.patchValue({
      tableId: 10,
      dateReservation: '2026-08-15',
      heureReservation: '20:00',
    });

    component.checkTableAvailability();
    expect(reservationServiceSpy.checkAvailability).toHaveBeenCalled();
    expect(component.availabilityCheck?.available).toBeTrue();
  });

  it('handles availability check error gracefully', () => {
    reservationServiceSpy.checkAvailability.and.returnValue(throwError(() => new Error('Network error')));
    component.reservationForm.patchValue({
      tableId: 10,
      dateReservation: '2026-08-15',
      heureReservation: '20:00',
    });

    component.checkTableAvailability();
    expect(component.availabilityCheck).toBeNull();
    expect(component.isCheckingAvailability).toBeFalse();
  });

  it('emits modalClose when close() is called', () => {
    spyOn(component.modalClose, 'emit');
    component.close();
    expect(component.modalClose.emit).toHaveBeenCalled();
  });
});
