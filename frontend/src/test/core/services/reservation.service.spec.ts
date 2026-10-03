import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReservationService } from '../../../app/core/services/reservation.service';
import {
  Reservation,
  ReservationAvailability,
  ReservationCreateRequest,
  ReservationUpdateRequest,
} from '../../../app/core/models/reservation.model';
import { environment } from '../../../environments/environment';

describe('ReservationService', () => {
  let service: ReservationService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/reservations`;

  const mockReservation: Reservation = {
    id: 1,
    nomClient: 'Jean Dupont',
    telephone: '+33612345678',
    email: 'jean.dupont@email.fr',
    dateReservation: '2026-08-15',
    heureReservation: '19:30',
    dureeMinutes: 90,
    nombrePersonnes: 4,
    notes: 'Window table',
    statut: 'CONFIRMED',
    tableId: 10,
    tableNumero: 1,
    tableCapacite: 4,
    createdAt: '2026-08-10T12:00:00',
    updatedAt: '2026-08-10T12:00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReservationService],
    });
    service = TestBed.inject(ReservationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getReservations() calls GET /api/reservations with query params', () => {
    service.getReservations({ date: '2026-08-15', search: 'Dupont' }).subscribe(res => {
      expect(res).toEqual([mockReservation]);
    });

    const req = httpMock.expectOne(req =>
      req.url === baseUrl &&
      req.params.get('date') === '2026-08-15' &&
      req.params.get('search') === 'Dupont'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockReservation]);
  });

  it('getById() calls GET /api/reservations/:id', () => {
    service.getById(1).subscribe(res => {
      expect(res).toEqual(mockReservation);
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockReservation);
  });

  it('checkAvailability() calls GET /api/reservations/check-availability', () => {
    const mockAvailability: ReservationAvailability = {
      available: true,
      capacitySufficient: true,
      conflictingBookings: [],
      message: 'Table is available',
    };

    service.checkAvailability({
      tableId: 10,
      date: '2026-08-15',
      heure: '19:30',
      dureeMinutes: 90,
      nombrePersonnes: 4,
    }).subscribe(res => {
      expect(res.available).toBeTrue();
      expect(res.capacitySufficient).toBeTrue();
    });

    const req = httpMock.expectOne(req =>
      req.url === `${baseUrl}/check-availability` &&
      req.params.get('tableId') === '10' &&
      req.params.get('date') === '2026-08-15' &&
      req.params.get('heure') === '19:30'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockAvailability);
  });

  it('getUpcoming() calls GET /api/reservations/upcoming', () => {
    service.getUpcoming(60).subscribe(res => {
      expect(res).toEqual([mockReservation]);
    });

    const req = httpMock.expectOne(req =>
      req.url === `${baseUrl}/upcoming` &&
      req.params.get('nextMinutes') === '60'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockReservation]);
  });

  it('getUpcomingForTable() calls GET /api/reservations/upcoming/:tableId', () => {
    service.getUpcomingForTable(10, 60).subscribe(res => {
      expect(res).toEqual(mockReservation);
    });

    const req = httpMock.expectOne(req =>
      req.url === `${baseUrl}/upcoming/10` &&
      req.params.get('nextMinutes') === '60'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockReservation);
  });

  it('getSuggestions() calls GET /api/reservations/suggestions', () => {
    service.getSuggestions('Dup').subscribe(res => {
      expect(res).toEqual([mockReservation]);
    });

    const req = httpMock.expectOne(req =>
      req.url === `${baseUrl}/suggestions` &&
      req.params.get('query') === 'Dup'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockReservation]);
  });

  it('createReservation() calls POST /api/reservations', () => {
    const createReq: ReservationCreateRequest = {
      nomClient: 'Jean Dupont',
      telephone: '+33612345678',
      dateReservation: '2026-08-15',
      heureReservation: '19:30',
      dureeMinutes: 90,
      nombrePersonnes: 4,
    };

    service.createReservation(createReq).subscribe(res => {
      expect(res).toEqual(mockReservation);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createReq);
    req.flush(mockReservation);
  });

  it('updateReservation() calls PUT /api/reservations/:id', () => {
    const updateReq: ReservationUpdateRequest = {
      nomClient: 'Jean Dupont Updated',
      telephone: '+33612345678',
      dateReservation: '2026-08-15',
      heureReservation: '20:00',
      dureeMinutes: 90,
      nombrePersonnes: 4,
      statut: 'CONFIRMED',
    };

    service.updateReservation(1, updateReq).subscribe(res => {
      expect(res.nomClient).toBe('Jean Dupont Updated');
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockReservation, nomClient: 'Jean Dupont Updated' });
  });

  it('updateStatut() calls PATCH /api/reservations/:id/statut', () => {
    service.updateStatut(1, 'CANCELLED').subscribe(res => {
      expect(res.statut).toBe('CANCELLED');
    });

    const req = httpMock.expectOne(req =>
      req.url === `${baseUrl}/1/statut` &&
      req.params.get('statut') === 'CANCELLED'
    );
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockReservation, statut: 'CANCELLED' });
  });

  it('seatReservation() calls POST /api/reservations/:id/seat', () => {
    service.seatReservation(1).subscribe(res => {
      expect(res.statut).toBe('SEATED');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/seat`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockReservation, statut: 'SEATED' });
  });

  it('deleteReservation() calls DELETE /api/reservations/:id', () => {
    service.deleteReservation(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
