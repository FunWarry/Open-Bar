import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Reservation,
  ReservationAvailability,
  ReservationCreateRequest,
  ReservationStatut,
  ReservationUpdateRequest,
} from '../models/reservation.model';

/**
 * Service managing table reservations, advance booking schedules, availability checks,
 * repeat customer suggestions, and guest seating.
 */
@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly api = `${environment.apiUrl}/reservations`;
  private readonly http = inject(HttpClient);

  /**
   * Retrieves reservations with optional filters for date, date range, status, or search query.
   *
   * @param params Optional query parameters
   * @returns Observable emitting an array of matching reservations
   */
  getReservations(params?: {
    date?: string;
    from?: string;
    to?: string;
    statut?: ReservationStatut;
    search?: string;
  }): Observable<Reservation[]> {
    let httpParams = new HttpParams();
    if (params?.date) httpParams = httpParams.set('date', params.date);
    if (params?.from) httpParams = httpParams.set('from', params.from);
    if (params?.to) httpParams = httpParams.set('to', params.to);
    if (params?.statut) httpParams = httpParams.set('statut', params.statut);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<Reservation[]>(this.api, { params: httpParams });
  }

  /**
   * Retrieves a single reservation by ID.
   *
   * @param id Unique reservation identifier
   * @returns Observable emitting the reservation
   */
  getById(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.api}/${id}`);
  }

  /**
   * Checks table availability and seating capacity for a given time slot.
   *
   * @param params Parameters including tableId, date, heure, dureeMinutes, etc.
   * @returns Observable emitting the availability evaluation
   */
  checkAvailability(params: {
    tableId: number;
    date: string;
    heure: string;
    dureeMinutes?: number;
    nombrePersonnes?: number;
    excludeId?: number;
  }): Observable<ReservationAvailability> {
    let httpParams = new HttpParams()
      .set('tableId', params.tableId.toString())
      .set('date', params.date)
      .set('heure', params.heure);

    if (params.dureeMinutes) httpParams = httpParams.set('dureeMinutes', params.dureeMinutes.toString());
    if (params.nombrePersonnes) httpParams = httpParams.set('nombrePersonnes', params.nombrePersonnes.toString());
    if (params.excludeId) httpParams = httpParams.set('excludeId', params.excludeId.toString());

    return this.http.get<ReservationAvailability>(`${this.api}/check-availability`, { params: httpParams });
  }

  /**
   * Retrieves all upcoming reservations across tables within the look-ahead window.
   *
   * @param nextMinutes Look-ahead window in minutes (defaults to 60)
   * @returns Observable emitting an array of upcoming reservations
   */
  getUpcoming(nextMinutes: number = 60): Observable<Reservation[]> {
    const params = new HttpParams().set('nextMinutes', nextMinutes.toString());
    return this.http.get<Reservation[]>(`${this.api}/upcoming`, { params });
  }

  /**
   * Retrieves an upcoming reservation for a specific table within the look-ahead window.
   *
   * @param tableId Target table identifier
   * @param nextMinutes Look-ahead window in minutes (defaults to 60)
   * @returns Observable emitting the upcoming reservation or null
   */
  getUpcomingForTable(tableId: number, nextMinutes: number = 60): Observable<Reservation | null> {
    const params = new HttpParams().set('nextMinutes', nextMinutes.toString());
    return this.http.get<Reservation | null>(`${this.api}/upcoming/${tableId}`, { params });
  }

  /**
   * Searches past reservations to suggest previous customer contact profiles for auto-completion.
   *
   * @param query Search query text
   * @returns Observable emitting matching customer profiles
   */
  getSuggestions(query: string): Observable<Reservation[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<Reservation[]>(`${this.api}/suggestions`, { params });
  }

  /**
   * Creates a new advance table reservation.
   *
   * @param request Creation payload
   * @returns Observable emitting the newly created reservation
   */
  createReservation(request: ReservationCreateRequest): Observable<Reservation> {
    return this.http.post<Reservation>(this.api, request);
  }

  /**
   * Updates an existing table reservation.
   *
   * @param id Reservation ID
   * @param request Update payload
   * @returns Observable emitting the updated reservation
   */
  updateReservation(id: number, request: ReservationUpdateRequest): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.api}/${id}`, request);
  }

  /**
   * Updates the lifecycle status of a reservation.
   *
   * @param id Reservation ID
   * @param statut New status
   * @returns Observable emitting the updated reservation
   */
  updateStatut(id: number, statut: ReservationStatut): Observable<Reservation> {
    const params = new HttpParams().set('statut', statut);
    return this.http.patch<Reservation>(`${this.api}/${id}/statut`, null, { params });
  }

  /**
   * Seats guests upon arrival, transitioning the reservation to SEATED and marking the table occupied.
   *
   * @param id Reservation ID
   * @returns Observable emitting the updated reservation
   */
  seatReservation(id: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.api}/${id}/seat`, {});
  }

  /**
   * Deletes a reservation from the system.
   *
   * @param id Reservation ID
   * @returns Observable completing upon deletion
   */
  deleteReservation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
